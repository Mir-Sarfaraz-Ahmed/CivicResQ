import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Shield, LogOut, Landmark, Briefcase, Truck, 
  Plus, AlertTriangle, Trash2, MapPin, X, Navigation 
} from 'lucide-react';

const NgoVehicles = () => {
  const { profile, logout, isMock } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [vehType, setVehType] = useState('');
  const [vehCapacity, setVehCapacity] = useState('');
  const [vehStatus, setVehStatus] = useState('AVAILABLE');
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi

  // Map references
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    fetchVehicles();
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

      const map = window.L.map('vehicle-map').setView([defaultLat, defaultLng], 12);
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

  const fetchVehicles = async () => {
    if (!profile) return;
    setLoading(true);
    setErrorMsg(null);

    if (isMock) {
      setTimeout(() => {
        const stored = localStorage.getItem('mock_ngo_vehicles');
        if (stored) {
          setVehicles(JSON.parse(stored));
        } else {
          const initialMock = [
            {
              id: 'veh-1',
              type: 'Heavy Cargo Truck',
              capacity: 5000,
              current_lat: 28.6139,
              current_lng: 77.2090,
              status: 'AVAILABLE'
            },
            {
              id: 'veh-2',
              type: 'Utility Van (Medical)',
              capacity: 1500,
              current_lat: 28.6250,
              current_lng: 77.2180,
              status: 'AVAILABLE'
            }
          ];
          localStorage.setItem('mock_ngo_vehicles', JSON.stringify(initialMock));
          setVehicles(initialMock);
        }
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const orgId = profile.organization_id;
      if (!orgId) throw new Error('No organization associated with this profile.');

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setErrorMsg(err.message || 'Failed to load vehicles from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVehicle = async (e) => {
    e.preventDefault();
    if (!vehType || !vehCapacity) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const newVehicle = {
      type: vehType,
      capacity: parseInt(vehCapacity, 10),
      current_lat: location.lat,
      current_lng: location.lng,
      status: vehStatus
    };

    if (isMock) {
      const id = 'veh-dyn-' + Math.floor(Math.random() * 100000);
      const updatedList = [
        { id, ...newVehicle },
        ...vehicles
      ];
      localStorage.setItem('mock_ngo_vehicles', JSON.stringify(updatedList));
      setVehicles(updatedList);
      setSuccessMsg('Mock vehicle registered locally!');
      resetForm();
      setShowModal(false);
      return;
    }

    try {
      const orgId = profile.organization_id;
      if (!orgId) throw new Error('No organization associated with this profile.');

      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          ...newVehicle,
          organization_id: orgId
        }])
        .select();

      if (error) throw error;

      setVehicles(prev => [data[0], ...prev]);
      setSuccessMsg('Utility logistics vehicle registered in fleet successfully!');
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Error adding vehicle to Supabase:', err);
      setErrorMsg(err.message || 'Error inserting vehicle asset.');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to remove this vehicle from fleet?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isMock) {
      const updatedList = vehicles.filter(v => v.id !== id);
      localStorage.setItem('mock_ngo_vehicles', JSON.stringify(updatedList));
      setVehicles(updatedList);
      setSuccessMsg('Mock vehicle deleted!');
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVehicles(prev => prev.filter(v => v.id !== id));
      setSuccessMsg('Vehicle removed successfully.');
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setErrorMsg(err.message || 'Failed to delete vehicle asset.');
    }
  };

  const resetForm = () => {
    setVehType('');
    setVehCapacity('');
    setVehStatus('AVAILABLE');
    setLocation({ lat: 19.0760, lng: 72.8777 });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="status-pill status-pill-active">Available</span>;
      case 'ASSIGNED':
      case 'IN_TRANSIT':
        return <span className="status-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Dispatched</span>;
      case 'OFFLINE':
        return <span className="status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--text-muted))', border: '1px solid rgba(255,255,255,0.1)' }}>Offline</span>;
      default:
        return <span className="status-pill">{status}</span>;
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
                <Link to="/ngo/resources" className="nav-item">
                  <Briefcase />
                  Resources Inventory
                </Link>
              </li>
              <li>
                <Link to="/ngo/vehicles" className="nav-item active">
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
              Fleet Coordination
            </h1>
            <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
              Register and track cargo transport, utility trucks, and dispatch telemetry vectors.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Register Vehicle
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
              <div className="info-banner-title">Fleet Error</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <div className="loader-spinner" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <Truck size={48} className="empty-state-icon" />
            <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Vehicles Registered</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              Your organization has no registered transport vehicles. Register cargo utility vehicles to handle supplies dispatch runs.
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Register First Vehicle
            </button>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Type</th>
                  <th>Load Capacity</th>
                  <th>Current Coordinates</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((veh) => (
                  <tr key={veh.id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{veh.type}</td>
                    <td>{veh.capacity.toLocaleString()} kg</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                        <MapPin size={12} style={{ color: 'hsl(var(--secondary))' }} />
                        {veh.current_lat?.toFixed(4)}, {veh.current_lng?.toFixed(4)}
                      </div>
                    </td>
                    <td>{getStatusBadge(veh.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteVehicle(veh.id)} 
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

        {/* Register Vehicle Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Register Logistics Vehicle</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitVehicle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 4x4 Offroad SUV, Heavy Flatbed Truck" 
                      value={vehType}
                      onChange={(e) => setVehType(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Load Capacity (kg)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 3500" 
                      value={vehCapacity}
                      onChange={(e) => setVehCapacity(e.target.value)}
                      required 
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Initial Status</label>
                  <select 
                    className="form-input" 
                    value={vehStatus}
                    onChange={(e) => setVehStatus(e.target.value)}
                    style={{ appearance: 'auto', background: 'hsl(var(--background-card))' }}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OFFLINE">Offline / In Maintenance</option>
                  </select>
                </div>

                {/* Telemetry Pin location map */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Initial Depot Coordinate (Drag Pin)</span>
                    <span style={{ color: 'hsl(var(--secondary))', fontWeight: 600 }}>
                      {location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}
                    </span>
                  </label>
                  <div 
                    id="vehicle-map" 
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
                    Register Vehicle
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

export default NgoVehicles;
