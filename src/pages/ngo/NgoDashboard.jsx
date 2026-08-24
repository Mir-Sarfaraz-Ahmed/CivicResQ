import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Shield, LogOut, Landmark, Briefcase, Truck, 
  AlertTriangle, Users, Clock, Box, Radio, Navigation 
} from 'lucide-react';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';

const NgoDashboard = () => {
  const { profile, logout, isMock } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    resources: 0,
    vehicles: 0,
    dispatches: 0
  });
  const [distressRequests, setDistressRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchNgoDashboardData();
  }, [profile]);

  const fetchNgoDashboardData = async () => {
    if (!profile) return;
    setLoading(true);
    setErrorMsg(null);

    if (isMock) {
      // Mock mode dashboard load
      setTimeout(() => {
        const storedRes = localStorage.getItem('mock_ngo_resources');
        const storedVeh = localStorage.getItem('mock_ngo_vehicles');
        const storedDisp = localStorage.getItem('mock_ngo_dispatches') || '[]';
        const storedCitizenRequests = localStorage.getItem('mock_citizen_requests') || '[]';

        const resourcesList = storedRes ? JSON.parse(storedRes) : [
          { id: 'res-1', type: 'Drinking Water', quantity: 5000, unit: 'Liters' },
          { id: 'res-2', type: 'First Aid Packs', quantity: 150, unit: 'Kits' }
        ];
        const vehiclesList = storedVeh ? JSON.parse(storedVeh) : [
          { id: 'veh-1', type: 'Heavy Cargo Truck', capacity: 5000, status: 'AVAILABLE' },
          { id: 'veh-2', type: 'Utility Van', capacity: 1500, status: 'AVAILABLE' }
        ];
        const dispatchesList = JSON.parse(storedDisp);
        const citizenRequestsList = JSON.parse(storedCitizenRequests);

        setMetrics({
          resources: resourcesList.length,
          vehicles: vehiclesList.length,
          dispatches: dispatchesList.filter(d => d.status !== 'DELIVERED').length
        });

        // Filter citizen requests to show incoming distress needing help
        setDistressRequests(citizenRequestsList.slice(0, 3));
        setLoading(false);
      }, 500);
      return;
    }

    // Live Supabase dashboard queries
    try {
      const orgId = profile.organization_id;
      if (!orgId) throw new Error('No organization associated with this profile.');

      // 1. Fetch total resources count
      const { count: resCount, error: resErr } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      if (resErr) throw resErr;

      // 2. Fetch total vehicles count
      const { count: vehCount, error: vehErr } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      if (vehErr) throw vehErr;

      // 3. Fetch active dispatches count
      // Find dispatches involving our organization's resources
      const { data: ourResources, error: ourResErr } = await supabase
        .from('resources')
        .select('id')
        .eq('organization_id', orgId);
      if (ourResErr) throw ourResErr;

      const resourceIds = ourResources.map(r => r.id);
      let activeDispatchesCount = 0;

      if (resourceIds.length > 0) {
        const { count: dispCount, error: dispErr } = await supabase
          .from('dispatches')
          .select('*', { count: 'exact', head: true })
          .in('resource_id', resourceIds)
          .neq('status', 'DELIVERED');
        if (dispErr) throw dispErr;
        activeDispatchesCount = dispCount || 0;
      }

      setMetrics({
        resources: resCount || 0,
        vehicles: vehCount || 0,
        dispatches: activeDispatchesCount
      });

      // 4. Fetch incoming emergency requests (limit 3)
      const { data: reqData, error: reqErr } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('status', 'UNDER_REVIEW')
        .order('created_at', { ascending: false })
        .limit(3);
      if (reqErr) throw reqErr;

      setDistressRequests(reqData || []);
    } catch (err) {
      console.error('Error loading NGO dashboard metrics:', err);
      setErrorMsg('Failed to load real-time telemetry from Supabase.');
    } finally {
      setLoading(false);
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
                <Link to="/ngo/dashboard" className="nav-item active">
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

      {/* Main workspace */}
      <main className="main-content">
        {/* Emergency Broadcast System Banner */}
        <EmergencyBroadcastBanner />

        {isMock && (
          <div className="info-banner" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: '2rem' }}>
            <div className="info-banner-icon" style={{ color: '#f59e0b' }}>
              <Radio size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Demo Local Storage Mock Mode</div>
              <div>Connected to local simulated assets. Modify resources/vehicles to view metrics updates.</div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            NGO Operations Center
          </h1>
          <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
            Manage organization supply pools, register logistics transport assets, and check matched dispatches.
          </p>
        </div>

        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Operations Error</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <div className="loader-spinner" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : (
          <>
            {/* Metrics cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>Resources Stock</span>
                  <Box size={20} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{metrics.resources}</div>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Active supply types registered</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>Active Fleet</span>
                  <Truck size={20} style={{ color: 'hsl(var(--secondary))' }} />
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{metrics.vehicles}</div>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Utility vehicles available</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>Pending Runs</span>
                  <Navigation size={20} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{metrics.dispatches}</div>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Ongoing matching pipelines</p>
              </div>
            </div>

            {/* Incoming distress needs queue */}
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} style={{ color: 'hsl(var(--primary))', animation: 'pulse 1.5s infinite' }} />
              Incoming Emergency distress signals
            </h2>

            {distressRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <Radio size={36} className="empty-state-icon" />
                <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Clear Radar</h4>
                <p style={{ fontSize: '0.85rem' }}>No active distress requests reported under review.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {distressRequests.map((req) => (
                  <div key={req.id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span 
                          className="status-pill"
                          style={{ 
                            background: req.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: req.urgency === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                            border: req.urgency === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                            fontSize: '0.65rem'
                          }}
                        >
                          {req.urgency} Urgency
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                          {req.category || 'General distress'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#fff', lineHeight: '1.5' }}>{req.description}</p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={12} />
                          {req.people_affected} affected
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <button 
                        onClick={() => navigate('/ngo/resources')} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                      >
                        Match Supplies
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default NgoDashboard;
