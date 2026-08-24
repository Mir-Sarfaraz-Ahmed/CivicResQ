import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';
import { 
  Shield, LogOut, Radio, Plus, Home, MapPin, 
  Check, X, Users, Utensils, Droplet, HeartPulse, Search, Navigation, ExternalLink 
} from 'lucide-react';

const MOCK_SHELTERS = [
  {
    id: 'shelter-1',
    name: 'Pragati Maidan Evacuation Complex (Central Delhi)',
    lat: 28.6189,
    lng: 77.2410,
    capacity: 650,
    available_capacity: 240,
    food_available: true,
    water_available: true,
    medical_available: true,
    status: 'ACTIVE',
    contact_phone: '+91 (011) 2337-1500'
  },
  {
    id: 'shelter-2',
    name: 'Connaught Place Emergency Relief Base (New Delhi)',
    lat: 28.6315,
    lng: 77.2167,
    capacity: 350,
    available_capacity: 95,
    food_available: false,
    water_available: true,
    medical_available: true,
    status: 'ACTIVE',
    contact_phone: '+91 (011) 2341-2000'
  },
  {
    id: 'shelter-3',
    name: 'AIIMS South Delhi Medical & Safe Camp',
    lat: 28.5672,
    lng: 77.2100,
    capacity: 900,
    available_capacity: 520,
    food_available: true,
    water_available: true,
    medical_available: true,
    status: 'ACTIVE',
    contact_phone: '+91 (011) 2658-8500'
  }
];

const CitizenShelters = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAmenity, setFilterAmenity] = useState('ALL'); // ALL | FOOD | WATER | MEDICAL
  const [selectedShelterId, setSelectedShelterId] = useState(null);

  const filteredShelters = MOCK_SHELTERS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterAmenity === 'FOOD') return s.food_available;
    if (filterAmenity === 'WATER') return s.water_available;
    if (filterAmenity === 'MEDICAL') return s.medical_available;
    return true;
  });

  useEffect(() => {
    if (mapContainerRef.current && window.L && !mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current).setView([28.6139, 77.2090], 12);
      mapInstanceRef.current = map;

      // Tile Layer
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      // Add markers
      MOCK_SHELTERS.forEach(shelter => {
        const marker = window.L.marker([shelter.lat, shelter.lng]).addTo(map);
        marker.bindPopup(`
          <div style="color:#000; font-family:sans-serif; padding:0.25rem;">
            <strong style="font-size:0.95rem;">${shelter.name}</strong><br/>
            <span style="font-size:0.85rem; color:#666;">Available Beds: ${shelter.available_capacity} / ${shelter.capacity}</span>
          </div>
        `);
        markersRef.current[shelter.id] = marker;
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSelectShelter = (shelter) => {
    setSelectedShelterId(shelter.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([shelter.lat, shelter.lng], 14, { animate: true });
      const marker = markersRef.current[shelter.id];
      if (marker) marker.openPopup();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Shield size={20} />
            </div>
            <span className="sidebar-logo-text">CivicResQ</span>
          </div>

          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/citizen/dashboard" className="nav-item">
                  <Radio />
                  Active Trackers
                </Link>
              </li>
              <li>
                <Link to="/citizen/report" className="nav-item">
                  <Plus />
                  Report Emergency
                </Link>
              </li>
              <li>
                <Link to="/citizen/shelters" className="nav-item active">
                  <Home />
                  Find Shelters
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">
              {profile?.full_name?.charAt(0) || 'C'}
            </div>
            <div className="user-info">
              <span className="user-name">{profile?.full_name || 'Citizen User'}</span>
              <span className="user-role role-badge-citizen">Citizen</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-block">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {/* Emergency Broadcast Banner */}
        <EmergencyBroadcastBanner />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Emergency Shelters Map</h1>
          <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
            Locate active safe zones, check live capacity, and navigate to medical & supply stations.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
            <input
              type="text"
              placeholder="Search shelters by name or zone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Shelters' },
              { id: 'FOOD', label: '🍲 Food Ready' },
              { id: 'WATER', label: '💧 Clean Water' },
              { id: 'MEDICAL', label: '🏥 Medical Support' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterAmenity(f.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterAmenity === f.id ? '1px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.08)',
                  background: filterAmenity === f.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                  color: filterAmenity === f.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                  transition: 'all 0.2s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem', minHeight: '520px' }}>
          
          <div 
            ref={mapContainerRef} 
            className="glass-panel" 
            style={{ height: '520px', borderRadius: '14px', overflow: 'hidden' }}
          >
            {/* Leaflet map binds here */}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '520px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Shelter Directory
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                {filteredShelters.length} shelter{filteredShelters.length !== 1 ? 's' : ''} available
              </span>
            </div>
            
            {filteredShelters.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Home size={32} className="empty-state-icon" />
                <p style={{ fontSize: '0.85rem' }}>No shelters matching the selected criteria.</p>
              </div>
            ) : (
              filteredShelters.map((s) => (
                <div 
                  key={s.id} 
                  className="glass-card"
                  onClick={() => handleSelectShelter(s)}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedShelterId === s.id ? 'hsl(var(--primary))' : undefined,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{s.name}</h3>
                    <span className="status-pill status-delivered" style={{ fontSize: '0.65rem' }}>{s.status}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>
                      <Users size={14} />
                      {s.available_capacity} / {s.capacity} beds available
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${s.lat},${s.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                    >
                      <Navigation size={12} /> Directions
                    </a>
                  </div>

                  {/* Resource check tags */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: s.food_available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: s.food_available ? '#10b981' : '#ef4444',
                        border: s.food_available ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      <Utensils size={11} />
                      {s.food_available ? 'Food Ready' : 'No Food'}
                    </span>
                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: s.water_available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: s.water_available ? '#10b981' : '#ef4444',
                        border: s.water_available ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      <Droplet size={11} />
                      {s.water_available ? 'Clean Water' : 'No Water'}
                    </span>
                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: s.medical_available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: s.medical_available ? '#10b981' : '#ef4444',
                        border: s.medical_available ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      <HeartPulse size={11} />
                      {s.medical_available ? 'Medical Station' : 'No Meds'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default CitizenShelters;
