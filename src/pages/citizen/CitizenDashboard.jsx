import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';
import QuickSosModal from '../../components/QuickSosModal';
import { 
  Shield, Plus, LogOut, Radio, Home, Compass, 
  MapPin, Clock, Users, Flame, AlertCircle, Info, RefreshCw, Cpu, ShieldAlert, CheckCircle
} from 'lucide-react';

const PRE_SEEDED_MOCK_REQUESTS = [
  {
    id: 'mock-req-1',
    description: 'Power line down with active flooding blocking the street. Need urgent water pump and power line repair.',
    lat: 28.6139,
    lng: 77.2090,
    people_affected: 8,
    urgency: 'CRITICAL',
    category: 'Flooding / Power Utility',
    priority_score: 92.5,
    status: 'DISPATCHED',
    contact_method: 'PHONE',
    contact_info: '+91 98765 43210',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'mock-req-2',
    description: 'Requesting basic food rations and emergency insulin supplies for 3 elderly individuals stranded on upper floor.',
    lat: 28.6250,
    lng: 77.2180,
    people_affected: 3,
    urgency: 'HIGH',
    category: 'Food & Medical',
    priority_score: 75.0,
    status: 'UNDER_REVIEW',
    contact_method: 'SMS',
    contact_info: '+91 98765 43210',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString() // 25 mins ago
  }
];

const CitizenDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sosSuccessMsg, setSosSuccessMsg] = useState(null);
  const [showSosModal, setShowSosModal] = useState(false);
  
  const { user, profile, logout, isMock } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmergencyRequests();

    // Supabase Realtime subscription for user's own requests
    if (!isMock && supabase && user) {
      const channel = supabase
        .channel(`citizen_requests:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergency_requests', filter: `reported_by=eq.${user.id}` },
          () => {
            fetchEmergencyRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isMock]);

  const fetchEmergencyRequests = async () => {
    setLoadingLocal(true);
    setErrorMsg(null);

    if (isMock) {
      // Mock mode logic: read from localstorage or seed defaults
      setTimeout(() => {
        const stored = localStorage.getItem('mock_citizen_requests');
        if (stored) {
          setRequests(JSON.parse(stored));
        } else {
          localStorage.setItem('mock_citizen_requests', JSON.stringify(PRE_SEEDED_MOCK_REQUESTS));
          setRequests(PRE_SEEDED_MOCK_REQUESTS);
        }
        setLoadingLocal(false);
      }, 600);
      return;
    }

    // Live Supabase database query
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching citizen requests:', err);
      setErrorMsg('Failed to load your emergency requests from the secure database.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Helper to determine progress bar width
  const getStatusPercentage = (status) => {
    switch (status) {
      case 'UNDER_REVIEW': return 15;
      case 'MATCHED': return 50;
      case 'DISPATCHED': return 80;
      case 'DELIVERED':
      case 'RESOLVED':
        return 100;
      default: return 15;
    }
  };

  // Helper to get score bar class
  const getScoreClass = (score) => {
    if (score >= 60) return 'score-critical';
    if (score >= 40) return 'score-high';
    if (score >= 20) return 'score-medium';
    return 'score-low';
  };

  // Helper to format date
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
                <Link to="/citizen/dashboard" className="nav-item active">
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
                <Link to="/citizen/shelters" className="nav-item">
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
          <button onClick={handleLogout} className="btn btn-secondary btn-block" style={{ gap: '0.5rem' }}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main dashboard content */}
      <main className="main-content">
        {/* Emergency Broadcast System Banner */}
        <EmergencyBroadcastBanner />

        {isMock && (
          <div className="info-banner" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: '2rem' }}>
            <div className="info-banner-icon" style={{ color: '#f59e0b' }}>
              <Info size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Demo Environment Mode Active</div>
              <div>Operating on simulated local storage. Submitting new reports will update this list dynamically.</div>
            </div>
          </div>
        )}

        {sosSuccessMsg && (
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}>
              <ShieldAlert size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">CRITICAL SOS DISPATCH TRANSMITTED</div>
              <div>{sosSuccessMsg}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Emergency Status Room</h1>
            <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
              Track dispatches, check matching progress, and report local distress.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSosModal(true)}
              className="btn-sos-header"
              title="Trigger instant emergency distress signal"
            >
              <ShieldAlert size={18} />
              1-TAP SOS
            </button>
            <button
              onClick={fetchEmergencyRequests}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => navigate('/citizen/report')} className="btn btn-primary">
              <Plus size={18} />
              Report New Distress
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}>
              <AlertCircle size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Error Loading Reports</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {loadingLocal ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div className="loader-spinner" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <Radio size={48} className="empty-state-icon" />
            <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>No Emergency Reports Filed</h3>
            <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
              You have not submitted any emergency requests. If you require water, shelter, medical assistance, or power dispatches, file a report.
            </p>
            <button onClick={() => navigate('/citizen/report')} className="btn btn-primary">
              <Plus size={18} />
              File First Emergency Report
            </button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {requests.map((req) => (
              <div key={req.id} className="request-card glass-panel">
                <div className="request-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span 
                        className="status-pill"
                        style={{ 
                          background: req.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 
                                      req.urgency === 'HIGH' ? 'rgba(245, 158, 11, 0.15)' : 
                                      'rgba(59, 130, 246, 0.15)',
                          color: req.urgency === 'CRITICAL' ? '#ef4444' : 
                                 req.urgency === 'HIGH' ? '#f59e0b' : 
                                 '#3b82f6',
                          borderColor: req.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 
                                      req.urgency === 'HIGH' ? 'rgba(245, 158, 11, 0.3)' : 
                                      'rgba(59, 130, 246, 0.3)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        {req.urgency} Urgency
                      </span>
                      {req.status === 'UNDER_REVIEW' && (
                        <span className="engine-running-badge">
                          <span className="dot" />
                          Engine Processing
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.25rem' }}>{req.category || 'General Emergency'}</h3>
                  </div>
                  <span className={`status-pill status-${req.status?.toLowerCase()}`}>
                    {req.status?.replace('_', ' ')}
                  </span>
                </div>

                <p className="request-card-desc">{req.description}</p>

                <div className="request-card-stats">
                  <span>
                    <Users size={14} />
                    {req.people_affected} affected
                  </span>
                  <span>
                    <MapPin size={14} />
                    Lat: {req.lat?.toFixed(4)}, Lng: {req.lng?.toFixed(4)}
                  </span>
                  <span>
                    <Clock size={14} />
                    {formatDate(req.created_at)}
                  </span>
                </div>

                {/* Priority Score (if scored by engine) */}
                {req.priority_score > 0 && (
                  <div className="citizen-score-section">
                    <div className="citizen-score-label-row">
                      <span className="citizen-score-label">Response Priority Score</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: req.priority_score >= 60 ? '#ef4444' : req.priority_score >= 40 ? '#f59e0b' : '#10b981' }}>
                        {req.priority_score.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="priority-score-bar">
                      <div
                        className={`priority-score-fill ${getScoreClass(req.priority_score)}`}
                        style={{ width: `${Math.min(100, req.priority_score)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Progress bar and step labels */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', fontWeight: 600 }}>
                    <span>Response Pipeline Tracking</span>
                    <span style={{ color: 'hsl(var(--primary))' }}>
                      {getStatusPercentage(req.status)}% Completed
                    </span>
                  </div>
                  
                  <div className="request-tracker-steps">
                    <div className="request-tracker-line"></div>
                    <div 
                      className="request-tracker-fill" 
                      style={{ width: `${getStatusPercentage(req.status)}%` }}
                    ></div>

                    {/* Step 1: Under Review */}
                    <div className={`request-tracker-step ${['UNDER_REVIEW', 'MATCHED', 'DISPATCHED', 'DELIVERED', 'RESOLVED'].includes(req.status) ? 'completed' : ''} ${req.status === 'UNDER_REVIEW' ? 'active' : ''}`}>
                      <div className="request-tracker-circle"></div>
                      <span className="request-tracker-label">Review</span>
                    </div>

                    {/* Step 2: Matched */}
                    <div className={`request-tracker-step ${['MATCHED', 'DISPATCHED', 'DELIVERED', 'RESOLVED'].includes(req.status) ? 'completed' : ''} ${req.status === 'MATCHED' ? 'active' : ''}`}>
                      <div className="request-tracker-circle"></div>
                      <span className="request-tracker-label">Matched</span>
                    </div>

                    {/* Step 3: Dispatched */}
                    <div className={`request-tracker-step ${['DISPATCHED', 'DELIVERED', 'RESOLVED'].includes(req.status) ? 'completed' : ''} ${req.status === 'DISPATCHED' ? 'active' : ''}`}>
                      <div className="request-tracker-circle"></div>
                      <span className="request-tracker-label">Transit</span>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className={`request-tracker-step ${['DELIVERED', 'RESOLVED'].includes(req.status) ? 'completed' : ''} ${['DELIVERED', 'RESOLVED'].includes(req.status) ? 'active' : ''}`}>
                      <div className="request-tracker-circle"></div>
                      <span className="request-tracker-label">Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── 1-TAP QUICK SOS MODAL ── */}
      <QuickSosModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
        onSuccess={(newReq) => {
          setSosSuccessMsg(`Your SOS emergency signal has been registered with highest priority (Score: ${newReq?.priority_score || 95}). Emergency operations and nearest ground rescue teams have been notified.`);
          fetchEmergencyRequests();
        }}
      />
    </div>
  );
};

export default CitizenDashboard;
