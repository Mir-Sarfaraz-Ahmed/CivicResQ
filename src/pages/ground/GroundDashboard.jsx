import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  Shield, LogOut, Compass, MapPin, Package, Truck,
  Clock, CheckCircle, AlertTriangle, RefreshCw, ChevronRight,
  Navigation, User, Zap, Activity
} from 'lucide-react';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';

const DISPATCH_STATUS_CONFIG = {
  ASSIGNED:   { color: '#8b5cf6', label: 'Assigned',   next: 'PICKING_UP',  nextLabel: 'Start Pickup' },
  PICKING_UP: { color: '#06b6d4', label: 'Picking Up', next: 'IN_TRANSIT',  nextLabel: 'Mark In Transit' },
  IN_TRANSIT: { color: '#f97316', label: 'In Transit', next: 'DELIVERED',   nextLabel: 'Mark Delivered' },
  DELIVERED:  { color: '#10b981', label: 'Delivered',  next: null,           nextLabel: null },
  APPROVED:   { color: '#3b82f6', label: 'Approved',   next: 'PICKING_UP',  nextLabel: 'Accept & Start' },
};

const URGENCY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  MEDIUM:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

const GroundDashboard = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [countdowns, setCountdowns] = useState({});
  const countdownRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // ETA countdown tick: updates every second for active assignments
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdowns(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (next[id] > 0) next[id] -= 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // Seed countdowns when assignments load
  useEffect(() => {
    const newCountdowns = {};
    assignments.forEach(d => {
      if (['IN_TRANSIT', 'PICKING_UP', 'ASSIGNED'].includes(d.status) && d.eta_minutes) {
        const elapsed = Math.floor((Date.now() - new Date(d.updated_at || d.created_at).getTime()) / 1000);
        const totalSecs = d.eta_minutes * 60;
        newCountdowns[d.id] = Math.max(0, totalSecs - elapsed);
      }
    });
    setCountdowns(newCountdowns);
  }, [assignments]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase
        .from('dispatches')
        .select(`
          id, status, eta_minutes, created_at, updated_at,
          emergency_requests:request_id (
            id, description, urgency, category, people_affected, lat, lng, created_at
          ),
          resources:resource_id ( type, quantity, unit ),
          vehicles:vehicle_id ( type, capacity )
        `)
        .eq('ground_team_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = data || [];
      const active = all.filter(d => !['DELIVERED', 'RECOMMENDED'].includes(d.status));
      const done = all.filter(d => d.status === 'DELIVERED');

      setAssignments(activeTab === 'assignments' ? active : done);
      setActiveCount(active.length);
      setCompletedCount(done.length);
    } catch (err) {
      console.error('Ground load error:', err);
      setErrorMsg(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (dispatchId, newStatus, requestId) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('dispatches')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', dispatchId);
      if (error) throw error;

      // If delivered, update emergency request status too
      if (newStatus === 'DELIVERED' && requestId) {
        await supabase
          .from('emergency_requests')
          .update({ status: 'DELIVERED', updated_at: new Date().toISOString() })
          .eq('id', requestId);
      }

      setSuccessMsg(`Status updated to ${newStatus.replace('_', ' ')}`);
      setSelectedAssignment(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedAssignment(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const UrgencyBadge = ({ urgency }) => {
    const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.LOW;
    return (
      <span style={{
        background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.color}40`,
        borderRadius: '6px', padding: '0.2rem 0.55rem',
        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em'
      }}>{urgency || 'LOW'}</span>
    );
  };

  const StatusBadge = ({ status }) => {
    const cfg = DISPATCH_STATUS_CONFIG[status];
    if (!cfg) return <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{status}</span>;
    return (
      <span style={{
        background: `${cfg.color}18`, color: cfg.color,
        border: `1px solid ${cfg.color}40`,
        borderRadius: '6px', padding: '0.2rem 0.6rem',
        fontSize: '0.72rem', fontWeight: 700
      }}>{cfg.label}</span>
    );
  };

  const AssignmentCard = ({ dispatch }) => {
    const req = dispatch.emergency_requests;
    const statusCfg = DISPATCH_STATUS_CONFIG[dispatch.status];
    const isSelected = selectedAssignment?.id === dispatch.id;

    return (
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          borderColor: isSelected ? 'hsl(var(--primary))' : undefined
        }}
        onClick={() => setSelectedAssignment(isSelected ? null : dispatch)}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <UrgencyBadge urgency={req?.urgency} />
            <StatusBadge status={dispatch.status} />
            <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>{req?.category || 'General'}</span>
          </div>
          <ChevronRight
            size={16}
            style={{
              color: 'hsl(var(--text-muted))',
              transform: isSelected ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              flexShrink: 0
            }}
          />
        </div>

        {/* Description */}
        <p style={{ color: '#fff', fontWeight: 500, fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
          {req?.description || 'Emergency request'}
        </p>

        {/* Info chips */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: isSelected ? '1.25rem' : 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            <Package size={12} /> {dispatch.resources?.type} · {dispatch.resources?.quantity} {dispatch.resources?.unit}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            <Truck size={12} /> {dispatch.vehicles?.type}
          </span>
          {dispatch.eta_minutes && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
              <Clock size={12} /> ETA: {dispatch.eta_minutes} min
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            <MapPin size={12} /> {req?.lat?.toFixed(4)}, {req?.lng?.toFixed(4)}
          </span>
        </div>

        {/* Expanded detail + action */}
        {isSelected && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }} onClick={e => e.stopPropagation()}>
            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>People Affected</p>
                <p style={{ color: '#fff', fontWeight: 600 }}>{req?.people_affected || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Assigned At</p>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{new Date(dispatch.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Destination</p>
                <a
                  href={`https://maps.google.com/?q=${req?.lat},${req?.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'hsl(var(--primary))', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                  onClick={e => e.stopPropagation()}
                >
                  <Navigation size={12} /> Open in Maps
                </a>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Vehicle Capacity</p>
                <p style={{ color: '#fff', fontWeight: 600 }}>{dispatch.vehicles?.capacity || '—'}</p>
              </div>
            </div>

            {/* ETA Countdown */}
            {countdowns[dispatch.id] !== undefined && ['IN_TRANSIT', 'PICKING_UP'].includes(dispatch.status) && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <p className="eta-countdown-label" style={{ marginBottom: '0.25rem' }}>Estimated Time Remaining</p>
                  <span className={`eta-countdown ${countdowns[dispatch.id] === 0 ? 'overdue' : ''}`}>
                    <Clock size={14} />
                    {countdowns[dispatch.id] === 0
                      ? 'OVERDUE'
                      : `${String(Math.floor(countdowns[dispatch.id] / 60)).padStart(2, '0')}:${String(countdowns[dispatch.id] % 60).padStart(2, '0')}`
                    }
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ width: '100%', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '999px',
                      background: countdowns[dispatch.id] === 0 ? '#ef4444' : '#06b6d4',
                      width: dispatch.eta_minutes
                        ? `${Math.min(100, 100 - (countdowns[dispatch.id] / (dispatch.eta_minutes * 60)) * 100)}%`
                        : '0%',
                      transition: 'width 1s linear'
                    }} />
                  </div>
                  <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: '0.3rem' }}>
                    Originally {dispatch.eta_minutes} min ETA
                  </p>
                </div>
              </div>
            )}

            {/* Status progression */}
            {statusCfg?.next && (
              <button
                onClick={() => handleAdvanceStatus(dispatch.id, statusCfg.next, req?.id)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem' }}
              >
                <Zap size={14} /> {statusCfg.nextLabel}
              </button>
            )}
            {dispatch.status === 'DELIVERED' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981', fontSize: '0.88rem', fontWeight: 600 }}>Delivery Completed</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><Shield size={20} /></div>
            <span className="sidebar-logo-text">CivicResQ</span>
          </div>
          <nav>
            <ul className="nav-links">
              <li>
                <button onClick={() => switchTab('assignments')}
                  className={`nav-item ${activeTab === 'assignments' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Compass size={18} />
                  My Assignments
                  {activeCount > 0 && (
                    <span className="mission-active-badge" style={{
                      marginLeft: 'auto', background: 'hsl(var(--primary))', color: '#000',
                      borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800,
                      padding: '0.1rem 0.45rem', lineHeight: 1.4
                    }}>{activeCount}</span>
                  )}
                </button>
              </li>
              <li>
                <button onClick={() => switchTab('history')}
                  className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <CheckCircle size={18} /> Completed Runs
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">G</div>
            <div className="user-info">
              <span className="user-name">{profile?.full_name || 'Ground Operator'}</span>
              <span className="user-role role-badge-ground">Ground Team</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-block">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Emergency Broadcast System Banner */}
        <EmergencyBroadcastBanner />

        {/* Banners */}
        {successMsg && (
          <div className="info-banner" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#10b981' }}><CheckCircle size={18} /></div>
            <div className="info-banner-content"><div className="info-banner-title">Updated</div><div>{successMsg}</div></div>
          </div>
        )}
        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}><AlertTriangle size={18} /></div>
            <div className="info-banner-content"><div className="info-banner-title">Error</div><div>{errorMsg}</div></div>
          </div>
        )}

        {/* ── TAB 1: MY ASSIGNMENTS ── */}
        {activeTab === 'assignments' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Ground Dispatch Terminal</h1>
              <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                Your active missions. Click a card to expand details and update status.
              </p>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Active Runs', value: activeCount, color: '#8b5cf6', icon: <Activity size={18} /> },
                { label: 'Completed', value: completedCount, color: '#10b981', icon: <CheckCircle size={18} /> },
                { label: 'Status', value: 'ONLINE', color: '#3b82f6', icon: <User size={18} /> },
              ].map(s => (
                <div key={s.label} className="glass-panel" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ color: s.color }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Legend */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {Object.entries(DISPATCH_STATUS_CONFIG).filter(([k]) => k !== 'DELIVERED').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.color }} />
                  <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>{v.label}</span>
                  {v.next && <ChevronRight size={10} style={{ color: 'hsl(var(--text-muted))', opacity: 0.5 }} />}
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="loader-spinner" style={{ width: '40px', height: '40px' }} />
              </div>
            ) : assignments.length === 0 ? (
              <div className="empty-state">
                <Compass size={36} className="empty-state-icon" />
                <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>No Active Assignments</h4>
                <p style={{ fontSize: '0.85rem' }}>You have no active dispatch assignments. Stand by for Operations to assign you a mission.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignments.map(d => <AssignmentCard key={d.id} dispatch={d} />)}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: COMPLETED RUNS ── */}
        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Completed Runs</h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                  Your delivery history. {completedCount} total runs completed.
                </p>
              </div>
              <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="loader-spinner" style={{ width: '40px', height: '40px' }} />
              </div>
            ) : assignments.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={36} className="empty-state-icon" />
                <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>No Completed Runs Yet</h4>
                <p style={{ fontSize: '0.85rem' }}>Completed deliveries will appear here after you mark them as delivered.</p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Emergency</th>
                      <th>Resource Delivered</th>
                      <th>Vehicle</th>
                      <th>Completed At</th>
                      <th>ETA Given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(d => (
                      <tr key={d.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                            {d.emergency_requests?.category || 'Emergency'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            {d.emergency_requests?.description?.substring(0, 55)}...
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600 }}>{d.resources?.type}</span>
                          <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', marginLeft: '0.3rem' }}>
                            {d.resources?.quantity} {d.resources?.unit}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{d.vehicles?.type}</td>
                        <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                          {new Date(d.updated_at).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {d.eta_minutes ? `${d.eta_minutes} min` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GroundDashboard;
