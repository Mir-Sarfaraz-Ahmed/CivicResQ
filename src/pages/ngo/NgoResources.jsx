import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Shield, LogOut, Landmark, Briefcase, Truck, 
  Plus, AlertTriangle, Trash2, MapPin, X, Box 
} from 'lucide-react';

const NgoResources = () => {
  const { profile, logout, isMock } = useAuth();
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [resType, setResType] = useState('');
  const [resQuantity, setResQuantity] = useState('');
  const [resUnit, setResUnit] = useState('Liters');
  const [resExpiry, setResExpiry] = useState('');
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi

  // Map references
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    fetchResources();
  }, [profile]);

  // Clean map when modal closes
  useEffect(() => {
    if (!showModal) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    } else {
      // Initialize map on modal open
      setTimeout(() => {
        initModalMap();
      }, 200);
    }
  }, [showModal]);

  const initModalMap = () => {
    if (!window.L || mapRef.current) return;

    try {
      const defaultLat = 28.6139;
      const defaultLng = 77.2090;

      const map = window.L.map('resource-map').setView([defaultLat, defaultLng], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = window.L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLocation({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) });
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setLocation({ lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) });
      });

      mapRef.current = map;
      markerRef.current = marker;
    } catch (e) {
      console.error('Failed to load map picker in modal:', e);
    }
  };

  const fetchResources = async () => {
    if (!profile) return;
    setLoading(true);
    setErrorMsg(null);

    if (isMock) {
      setTimeout(() => {
        const stored = localStorage.getItem('mock_ngo_resources');
        if (stored) {
          setResources(JSON.parse(stored));
        } else {
          const initialMock = [
            {
              id: 'res-1',
              type: 'Drinking Water',
              quantity: 5000,
              unit: 'Liters',
              lat: 28.6139,
              lng: 77.2090,
              status: 'AVAILABLE',
              expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            {
              id: 'res-2',
              type: 'First Aid Packs',
              quantity: 150,
              unit: 'Kits',
              lat: 28.6250,
              lng: 77.2180,
              status: 'AVAILABLE',
              expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          ];
          localStorage.setItem('mock_ngo_resources', JSON.stringify(initialMock));
          setResources(initialMock);
        }
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const orgId = profile.organization_id;
      if (!orgId) throw new Error('No organization associated with this profile.');

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setErrorMsg(err.message || 'Failed to load resources from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResource = async (e) => {
    e.preventDefault();
    if (!resType || !resQuantity) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const newResource = {
      type: resType,
      quantity: parseInt(resQuantity, 10),
      unit: resUnit,
      lat: location.lat,
      lng: location.lng,
      status: 'AVAILABLE',
      expiry_date: resExpiry ? new Date(resExpiry).toISOString() : null
    };

    if (isMock) {
      const id = 'res-dyn-' + Math.floor(Math.random() * 100000);
      const updatedList = [
        { id, ...newResource },
        ...resources
      ];
      localStorage.setItem('mock_ngo_resources', JSON.stringify(updatedList));
      setResources(updatedList);
      setSuccessMsg('Mock resource added locally!');
      resetForm();
      setShowModal(false);
      return;
    }

    try {
      const orgId = profile.organization_id;
      if (!orgId) throw new Error('No organization associated with this profile.');

      const { data, error } = await supabase
        .from('resources')
        .insert([{
          ...newResource,
          organization_id: orgId
        }])
        .select();

      if (error) throw error;

      setResources(prev => [data[0], ...prev]);
      setSuccessMsg('Emergency resource stock registered successfully!');
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Error adding resource to Supabase:', err);
      setErrorMsg(err.message || 'Error inserting resource item.');
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Are you sure you want to remove this resource item from inventory?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isMock) {
      const updatedList = resources.filter(r => r.id !== id);
      localStorage.setItem('mock_ngo_resources', JSON.stringify(updatedList));
      setResources(updatedList);
      setSuccessMsg('Mock resource deleted!');
      return;
    }

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
      setSuccessMsg('Resource removed successfully.');
    } catch (err) {
      console.error('Error deleting resource:', err);
      setErrorMsg(err.message || 'Failed to delete resource item.');
    }
  };

  const resetForm = () => {
    setResType('');
    setResQuantity('');
    setResUnit('Liters');
    setResExpiry('');
    setLocation({ lat: 19.0760, lng: 72.8777 });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getStatusBadge = (res) => {
    // Check if expired
    const isExpired = res.expiry_date && new Date(res.expiry_date) < new Date();
    if (isExpired) {
      return <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Expired</span>;
    }
    switch (res.status) {
      case 'AVAILABLE':
        return <span className="status-pill status-pill-active">Available</span>;
      case 'RESERVED':
        return <span className="status-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Reserved</span>;
      case 'DEPLETED':
        return <span className="status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--text-muted))', border: '1px solid rgba(255,255,255,0.1)' }}>Depleted</span>;
      default:
        return <span className="status-pill">{res.status}</span>;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
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
                <Link to="/ngo/dashboard" className="nav-item">
                  <Landmark />
                  NGO Overview
                </Link>
              </li>
              <li>
                <Link to="/ngo/resources" className="nav-item active">
                  <Briefcase />
                  Resources Inventory
                </Link>
              </li>
              <li>
                <Link to="/ngo/vehicles" className="nav-item">
                  <Truck />
                  Fleet Vehicles
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">N</div>
            <div className="user-info">
              <span className="user-name">{profile?.full_name || 'NGO Rep'}</span>
              <span className="user-role role-badge-ngo">{profile?.org_name || 'NGO Partner'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-block">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Resources Stockpile
            </h1>
            <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
              Register supply stock coordinates, volume values, and active storage markers.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Register Stock
          </button>
        </div>

        {successMsg && (
          <div className="info-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#10b981' }}>
              <Shield size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Success</div>
              <div>{successMsg}</div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Inventory Error</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <div className="loader-spinner" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <Box size={48} className="empty-state-icon" />
            <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Resources Registered</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              Your organization has not added any emergency supply items. Register supply pools to matches dispatches.
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Register First Supply
            </button>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource Type</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((res) => (
                  <tr key={res.id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{res.type}</td>
                    <td>{res.quantity} {res.unit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                        <MapPin size={12} style={{ color: 'hsl(var(--primary))' }} />
                        {res.lat?.toFixed(4)}, {res.lng?.toFixed(4)}
                      </div>
                    </td>
                    <td>
                      {res.expiry_date ? new Date(res.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>{getStatusBadge(res)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteResource(res.id)} 
                        className="btn btn-secondary btn-icon"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.1)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Register Supply Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Register Emergency Stockpile</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitResource}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Supply Category / Type</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Drinking Water, Dry Food" 
                      value={resType}
                      onChange={(e) => setResType(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className="form-label">Stock Quantity</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="e.g. 500" 
                        value={resQuantity}
                        onChange={(e) => setResQuantity(e.target.value)}
                        required 
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="form-label">Unit</label>
                      <select 
                        className="form-input" 
                        value={resUnit}
                        onChange={(e) => setResUnit(e.target.value)}
                        style={{ appearance: 'auto', background: 'hsl(var(--background-card))' }}
                      >
                        <option value="Liters">Liters</option>
                        <option value="Kits">Kits</option>
                        <option value="Tons">Tons</option>
                        <option value="Packs">Packs</option>
                        <option value="Units">Units</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Expiration Date (Optional)</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={resExpiry}
                    onChange={(e) => setResExpiry(e.target.value)}
                  />
                </div>

                {/* Telemetry Pin location map */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stock Depot Coordinate (Drag Pin)</span>
                    <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>
                      {location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}
                    </span>
                  </label>
                  <div 
                    id="resource-map" 
                    className="map-picker-container" 
                    style={{ 
                      height: '240px', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden'
                    }}
                  ></div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Register Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NgoResources;
