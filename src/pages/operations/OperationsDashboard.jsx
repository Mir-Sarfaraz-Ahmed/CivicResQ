import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertContext';
import { supabase } from '../../lib/supabaseClient';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';
import {
  Shield, LogOut, Radio, ListFilter, Compass, Zap, CheckCircle,
  Clock, AlertTriangle, Users, Package, Truck, MapPin, ChevronDown,
  RefreshCw, Eye, X, Check, Activity, Cpu, ToggleLeft, ToggleRight, BellRing
} from 'lucide-react';

const URGENCY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'HIGH' },
  MEDIUM:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'MEDIUM' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'LOW' },
};

const STATUS_CONFIG = {
  UNDER_REVIEW: { color: '#f59e0b', label: 'Under Review', cssClass: 'status-under-review' },
  MATCHED:      { color: '#3b82f6', label: 'Matched',      cssClass: 'status-matched' },
  DISPATCHED:   { color: '#8b5cf6', label: 'Dispatched',   cssClass: 'status-dispatched' },
  DELIVERED:    { color: '#10b981', label: 'Delivered',    cssClass: 'status-delivered' },
  RESOLVED:     { color: '#6b7280', label: 'Resolved',     cssClass: 'status-resolved' },
};

const DISPATCH_STATUS_CONFIG = {
  RECOMMENDED:       { color: '#6b7280', label: 'Recommended' },
  AWAITING_APPROVAL: { color: '#f59e0b', label: 'Awaiting Approval' },
  APPROVED:          { color: '#3b82f6', label: 'Approved' },
  ASSIGNED:          { color: '#8b5cf6', label: 'Assigned' },
  PICKING_UP:        { color: '#06b6d4', label: 'Picking Up' },
  IN_TRANSIT:        { color: '#f97316', label: 'In Transit' },
  DELIVERED:         { color: '#10b981', label: 'Delivered' },
};

// Derive score bar class from score value
const getScoreClass = (score) => {
  if (score >= 60) return 'score-critical';
  if (score >= 40) return 'score-high';
  if (score >= 20) return 'score-medium';
  return 'score-low';
};

const getScoreBadgeClass = (score) => {
  if (score >= 60) return 'score-badge-critical';
  if (score >= 40) return 'score-badge-high';
  if (score >= 20) return 'score-badge-medium';
  return 'score-badge-low';
};

const OperationsDashboard = () => {
  const { profile, logout, isMock } = useAuth();
  const { createBroadcastAlert } = useAlerts();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('desk');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Data
  const [stats, setStats] = useState({ pending: 0, dispatched: 0, resolved: 0, ngos: 0 });
  const [requests, setRequests] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [resources, setResources] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [groundTeams, setGroundTeams] = useState([]);

  // Engine Room data
  const [engineStats, setEngineStats] = useState({ unmatched: 0, availResources: 0, availVehicles: 0, todayDispatches: 0 });
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [kanban, setKanban] = useState({ awaiting: 0, approved: 0, inTransit: 0, delivered: 0 });
  const [engineRunning, setEngineRunning] = useState(false);
  const [calcLoadingId, setCalcLoadingId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  // Dispatch creation form
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({ resource_id: '', vehicle_id: '', ground_team_id: '', eta_minutes: '30' });
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Request detail modal
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);

  // Broadcast Alert modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    severity: 'WARNING',
    region: 'All Sectors'
  });

  useEffect(() => {
    loadTab();
  }, [activeTab]);

  // Supabase Realtime channel for live operational telemetry updates
  useEffect(() => {
    if (!isMock && supabase) {
      const channel = supabase
        .channel('operations_live_feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergency_requests' },
          () => {
            loadTab();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dispatches' },
          () => {
            loadTab();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isMock, activeTab]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && activeTab === 'engine') {
      autoRefreshRef.current = setInterval(() => {
        loadTab();
      }, 30000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, activeTab]);

  const loadTab = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (activeTab === 'desk') {
        const [pending, dispatched, resolved, ngoCount] = await Promise.all([
          supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
          supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ['DISPATCHED','MATCHED']),
          supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ['DELIVERED','RESOLVED']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'NGO'),
        ]);
        setStats({
          pending: pending.count || 0,
          dispatched: dispatched.count || 0,
          resolved: resolved.count || 0,
          ngos: ngoCount.count || 0,
        });
        const { data: topReqs } = await supabase
          .from('emergency_requests')
          .select('id, description, urgency, status, people_affected, category, lat, lng, created_at')
          .in('status', ['UNDER_REVIEW', 'MATCHED'])
          .order('urgency', { ascending: false })
          .limit(5);
        setRequests(topReqs || []);

      } else if (activeTab === 'queue') {
        const { data, error } = await supabase
          .from('emergency_requests')
          .select(`
            id, description, urgency, status, people_affected, category,
            lat, lng, created_at, priority_score,
            reported_by, profiles:reported_by ( full_name, phone )
          `)
          .order('urgency', { ascending: false })
          .order('created_at', { ascending: true });
        if (error) throw error;
        setRequests(data || []);

      } else if (activeTab === 'dispatch') {
        const [dispatchRes, resourceRes, vehicleRes, groundRes, reqRes] = await Promise.all([
          supabase.from('dispatches').select(`
            id, status, eta_minutes, created_at,
            emergency_requests:request_id ( id, description, urgency, category, lat, lng ),
            resources:resource_id ( type, quantity, unit ),
            vehicles:vehicle_id ( type, capacity ),
            profiles:ground_team_id ( full_name )
          `).order('created_at', { ascending: false }),
          supabase.from('resources').select('id, type, quantity, unit, status, organization_id, organizations:organization_id(name)').eq('status', 'AVAILABLE'),
          supabase.from('vehicles').select('id, type, capacity, status, organization_id, organizations:organization_id(name)').eq('status', 'AVAILABLE'),
          supabase.from('profiles').select('id, full_name').eq('role', 'GROUND_TEAM').eq('is_active', true),
          supabase.from('emergency_requests').select('id, description, urgency, category').in('status', ['UNDER_REVIEW', 'MATCHED']),
        ]);
        setDispatches(dispatchRes.data || []);
        setResources(resourceRes.data || []);
        setVehicles(vehicleRes.data || []);
        setGroundTeams(groundRes.data || []);
        setRequests(reqRes.data || []);

      } else if (activeTab === 'engine') {
        await loadEngineData();
        return; // loadEngineData handles setLoading(false)
      }
    } catch (err) {
      console.error('Ops load error:', err);
      setErrorMsg(err.message || 'Failed to load operations data.');
    } finally {
      setLoading(false);
    }
  };

  const loadEngineData = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [unmatchedRes, availResources, availVehicles, todayDispatches, priorityReqs, kanbanCounts] = await Promise.all([
        supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
        supabase.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
        supabase.from('dispatches').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase
          .from('emergency_requests')
          .select('id, description, urgency, status, people_affected, category, priority_score, created_at, lat, lng')
          .in('status', ['UNDER_REVIEW', 'MATCHED'])
          .order('priority_score', { ascending: false })
          .order('created_at', { ascending: true }),
        // Kanban counts
        Promise.all([
          supabase.from('dispatches').select('*', { count: 'exact', head: true }).eq('status', 'AWAITING_APPROVAL'),
          supabase.from('dispatches').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
          supabase.from('dispatches').select('*', { count: 'exact', head: true }).eq('status', 'IN_TRANSIT'),
          supabase.from('dispatches').select('*', { count: 'exact', head: true }).eq('status', 'DELIVERED'),
        ]),
      ]);

      const [awaitingRes, approvedRes, inTransitRes, deliveredRes] = kanbanCounts;
      const totalKanban = (awaitingRes.count || 0) + (approvedRes.count || 0) + (inTransitRes.count || 0) + (deliveredRes.count || 0);

      setEngineStats({
        unmatched: unmatchedRes.count || 0,
        availResources: availResources.count || 0,
        availVehicles: availVehicles.count || 0,
        todayDispatches: todayDispatches.count || 0,
      });
      setPriorityQueue(priorityReqs.data || []);
      setKanban({
        awaiting: awaitingRes.count || 0,
        approved: approvedRes.count || 0,
        inTransit: inTransitRes.count || 0,
        delivered: deliveredRes.count || 0,
        total: totalKanban,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load engine data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequestStatus = async (reqId, newStatus) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('emergency_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reqId);
      if (error) throw error;
      setSuccessMsg(`Request status updated to ${newStatus}`);
      loadTab();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedRequest) return;
    try {
      const { error } = await supabase.from('dispatches').insert([{
        request_id: selectedRequest.id,
        resource_id: dispatchForm.resource_id,
        vehicle_id: dispatchForm.vehicle_id,
        ground_team_id: dispatchForm.ground_team_id || null,
        status: 'AWAITING_APPROVAL',
        eta_minutes: parseInt(dispatchForm.eta_minutes, 10) || 30,
      }]);
      if (error) throw error;

      await supabase.from('emergency_requests')
        .update({ status: 'MATCHED', updated_at: new Date().toISOString() })
        .eq('id', selectedRequest.id);

      setSuccessMsg('Dispatch created and sent for approval!');
      setShowDispatchModal(false);
      setSelectedRequest(null);
      setDispatchForm({ resource_id: '', vehicle_id: '', ground_team_id: '', eta_minutes: '30' });
      loadTab();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateDispatchStatus = async (dispatchId, newStatus) => {
    try {
      const { error } = await supabase
        .from('dispatches')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', dispatchId);
      if (error) throw error;
      setSuccessMsg(`Dispatch updated to ${newStatus}`);
      loadTab();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleAutoMatch = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase.rpc('run_matching_engine');
      if (error) throw error;
      setSuccessMsg(`Auto-Matching Complete! Generated ${data || 0} new dispatches.`);
      loadTab();
    } catch (err) {
      setErrorMsg(err.message || 'Auto-match engine failed.');
      setLoading(false);
    }
  };

  const handleRunEngine = async () => {
    setEngineRunning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase.rpc('run_matching_engine');
      if (error) throw error;
      setSuccessMsg(`⚡ Engine Run Complete — ${data || 0} new dispatch${data === 1 ? '' : 'es'} auto-generated.`);
      await loadEngineData();
    } catch (err) {
      setErrorMsg(err.message || 'Engine run failed.');
    } finally {
      setEngineRunning(false);
    }
  };

  const handleCalculatePriority = async (reqId) => {
    setCalcLoadingId(reqId);
    try {
      const { error } = await supabase.rpc('calculate_priority', { req_id: reqId });
      if (error) throw error;
      // Refresh queue after recalculation
      const { data } = await supabase
        .from('emergency_requests')
        .select('id, description, urgency, status, people_affected, category, priority_score, created_at, lat, lng')
        .in('status', ['UNDER_REVIEW', 'MATCHED'])
        .order('priority_score', { ascending: false });
      setPriorityQueue(data || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCalcLoadingId(null);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;
    try {
      await createBroadcastAlert(broadcastForm);
      setSuccessMsg(`Emergency alert "${broadcastForm.title}" broadcasted across all regional portals!`);
      setShowBroadcastModal(false);
      setBroadcastForm({ title: '', message: '', severity: 'WARNING', region: 'All Sectors' });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send broadcast alert.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setShowDispatchModal(false);
    setSelectedRequestDetail(null);
    setShowBroadcastModal(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (tab !== 'engine' && autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
  };

  const UrgencyBadge = ({ urgency }) => {
    const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.LOW;
    return (
      <span style={{
        background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.color}40`,
        borderRadius: '6px', padding: '0.2rem 0.55rem',
        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em'
      }}>{cfg.label}</span>
    );
  };

  // Elapsed time helper
  const timeAgo = (isoString) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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
                <button onClick={() => switchTab('desk')}
                  className={`nav-item ${activeTab === 'desk' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Radio size={18} /> Operations Desk
                </button>
              </li>
              <li>
                <button onClick={() => switchTab('queue')}
                  className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <ListFilter size={18} /> Requests Queue
                </button>
              </li>
              <li>
                <button onClick={() => switchTab('dispatch')}
                  className={`nav-item ${activeTab === 'dispatch' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Compass size={18} /> Dispatch Hub
                </button>
              </li>
              <li>
                <button onClick={() => switchTab('engine')}
                  className={`nav-item ${activeTab === 'engine' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Cpu size={18} /> Engine Room
                  {engineRunning && (
                    <span className="engine-running-badge" style={{ marginLeft: 'auto', padding: '0.1rem 0.4rem', fontSize: '0.58rem' }}>
                      <span className="dot" />LIVE
                    </span>
                  )}
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">O</div>
            <div className="user-info">
              <span className="user-name">{profile?.full_name || 'Operations Controller'}</span>
              <span className="user-role role-badge-ops">Operations</span>
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
            <div className="info-banner-content"><div className="info-banner-title">Success</div><div>{successMsg}</div></div>
          </div>
        )}
        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', marginBottom: '1.5rem' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}><AlertTriangle size={18} /></div>
            <div className="info-banner-content"><div className="info-banner-title">Error</div><div>{errorMsg}</div></div>
          </div>
        )}

        {/* ── TAB 1: OPERATIONS DESK ── */}
        {activeTab === 'desk' && (
          <div>
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Operations Central</h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                  Live system telemetry — emergency queues, priority scoring, and dispatch coordination.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                >
                  <BellRing size={15} /> Broadcast Alert
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Pending Review', value: stats.pending, color: '#f59e0b', icon: <Clock size={20} /> },
                { label: 'Active Dispatches', value: stats.dispatched, color: '#8b5cf6', icon: <Truck size={20} /> },
                { label: 'Resolved', value: stats.resolved, color: '#10b981', icon: <CheckCircle size={20} /> },
                { label: 'NGO Partners', value: stats.ngos, color: '#3b82f6', icon: <Users size={20} /> },
              ].map(stat => (
                <div key={stat.label} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
                      <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.4rem', lineHeight: 1 }}>{loading ? '—' : stat.value}</p>
                    </div>
                    <div style={{ color: stat.color, opacity: 0.8, marginTop: '0.2rem' }}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Priority Queue Preview */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>High Priority Queue</h3>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>Top active requests requiring attention</p>
                </div>
                <button onClick={() => switchTab('queue')} className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}>
                  View All
                </button>
              </div>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}><div className="loader-spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }} /></div>
              ) : requests.length === 0 ? (
                <div className="empty-state" style={{ padding: '2.5rem' }}>
                  <Activity size={32} className="empty-state-icon" />
                  <p style={{ marginTop: '0.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>No active requests in queue</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr>
                    <th>Category</th><th>Urgency</th><th>Affected</th><th>Status</th><th>Time</th>
                  </tr></thead>
                  <tbody>
                    {requests.map(req => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600, color: '#fff' }}>{req.category || 'General'}</td>
                        <td><UrgencyBadge urgency={req.urgency} /></td>
                        <td style={{ color: 'hsl(var(--text-muted))' }}>{req.people_affected} people</td>
                        <td><span className={`status-pill ${STATUS_CONFIG[req.status]?.cssClass || ''}`}>{STATUS_CONFIG[req.status]?.label || req.status}</span></td>
                        <td style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>{new Date(req.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: REQUESTS QUEUE ── */}
        {activeTab === 'queue' && (
          <div>
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Requests Queue</h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                  All emergency distress reports. Review, triage, and update status.
                </p>
              </div>
              <button onClick={loadTab} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="loader-spinner" style={{ width: '40px', height: '40px' }} /></div>
            ) : requests.length === 0 ? (
              <div className="empty-state">
                <ListFilter size={36} className="empty-state-icon" />
                <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>Queue Empty</h4>
                <p style={{ fontSize: '0.85rem' }}>No emergency requests have been filed yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {requests.map(req => (
                  <div key={req.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          <UrgencyBadge urgency={req.urgency} />
                          <span className={`status-pill ${STATUS_CONFIG[req.status]?.cssClass || ''}`}>{STATUS_CONFIG[req.status]?.label || req.status}</span>
                          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>{req.category || 'General'}</span>
                          {req.priority_score > 0 && (
                            <span className={`score-badge ${getScoreBadgeClass(req.priority_score)}`}>
                              Score: {req.priority_score?.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#fff', fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>{req.description}</p>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Users size={12} /> {req.people_affected} affected
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={12} /> {req.lat?.toFixed(4)}, {req.lng?.toFixed(4)}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} /> {new Date(req.created_at).toLocaleString()}
                          </span>
                          {req.profiles?.full_name && (
                            <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                              Reported by: {req.profiles.full_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '140px', alignItems: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedRequestDetail(req)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}
                        >
                          <Eye size={12} /> Details
                        </button>
                        {req.status === 'UNDER_REVIEW' && (
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, 'MATCHED')}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Check size={12} /> Mark Matched
                          </button>
                        )}
                        {req.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, 'DELIVERED')}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <CheckCircle size={12} /> Mark Delivered
                          </button>
                        )}
                        {(req.status === 'DELIVERED' || req.status === 'MATCHED') && (
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, 'RESOLVED')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
                          >
                            <CheckCircle size={12} /> Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DISPATCH HUB ── */}
        {activeTab === 'dispatch' && (
          <div>
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Dispatch Hub</h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                  Create and manage resource dispatches. Assign ground teams and track delivery.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleAutoMatch}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Activity size={15} /> Auto-Match
                </button>
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Zap size={15} /> New Dispatch
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="loader-spinner" style={{ width: '40px', height: '40px' }} /></div>
            ) : dispatches.length === 0 ? (
              <div className="empty-state">
                <Truck size={36} className="empty-state-icon" />
                <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>No Dispatches Yet</h4>
                <p style={{ fontSize: '0.85rem' }}>Create a dispatch to assign resources to an emergency request.</p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Emergency</th><th>Resource</th><th>Vehicle</th><th>Ground Team</th><th>ETA</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {dispatches.map(d => {
                      const statusCfg = DISPATCH_STATUS_CONFIG[d.status] || {};
                      return (
                        <tr key={d.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{d.emergency_requests?.category || 'Emergency'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{d.emergency_requests?.description?.substring(0, 50)}...</div>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600 }}>{d.resources?.type}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{d.resources?.quantity} {d.resources?.unit}</div>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{d.vehicles?.type} <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>({d.vehicles?.capacity} cap)</span></td>
                          <td style={{ fontSize: '0.85rem', color: d.profiles?.full_name ? '#fff' : 'hsl(var(--text-muted))' }}>
                            {d.profiles?.full_name || 'Unassigned'}
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{d.eta_minutes ? `${d.eta_minutes} min` : '—'}</td>
                          <td>
                            <span style={{
                              background: `${statusCfg.color}18`,
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.color}40`,
                              borderRadius: '6px', padding: '0.2rem 0.55rem',
                              fontSize: '0.7rem', fontWeight: 700
                            }}>{statusCfg.label || d.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              {d.status === 'AWAITING_APPROVAL' && (
                                <button onClick={() => handleUpdateDispatchStatus(d.id, 'APPROVED')}
                                  className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Check size={11} /> Approve
                                </button>
                              )}
                              {d.status === 'APPROVED' && (
                                <button onClick={() => handleUpdateDispatchStatus(d.id, 'ASSIGNED')}
                                  className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                                  Assign
                                </button>
                              )}
                              {d.status === 'IN_TRANSIT' && (
                                <button onClick={() => handleUpdateDispatchStatus(d.id, 'DELIVERED')}
                                  className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                                  Delivered
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: ENGINE ROOM ── */}
        {activeTab === 'engine' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'hsl(var(--primary))', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Phase 8 — Core Engine
                </p>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Engine Room</h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                  Priority scoring, resource matching, and real-time dispatch lifecycle intelligence.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Auto-Refresh Toggle */}
                <button
                  onClick={() => setAutoRefresh(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem 0.9rem', cursor: 'pointer', color: autoRefresh ? '#10b981' : 'hsl(var(--text-muted))', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {autoRefresh ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
                </button>
                <button onClick={loadEngineData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {/* Engine Stats Bar */}
            <div className="engine-stat-grid">
              {[
                { label: 'Unmatched Requests', value: engineStats.unmatched, accent: 'accent-amber' },
                { label: 'Available Resources', value: engineStats.availResources, accent: 'accent-teal' },
                { label: 'Available Vehicles', value: engineStats.availVehicles, accent: 'accent-blue' },
                { label: "Today's Dispatches", value: engineStats.todayDispatches, accent: 'accent-violet' },
              ].map(s => (
                <div key={s.label} className={`engine-stat-card ${s.accent}`}>
                  <p className="engine-stat-label">{s.label}</p>
                  <p className="engine-stat-value">{loading ? '—' : s.value}</p>
                </div>
              ))}
            </div>

            {/* Run Engine CTA */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(6,182,212,0.03) 100%)', borderColor: 'rgba(16,185,129,0.12)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.3rem' }}>Matching Engine</h3>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', maxWidth: '460px' }}>
                  Automatically pairs <strong style={{ color: '#fff' }}>{engineStats.unmatched}</strong> unmatched request{engineStats.unmatched !== 1 ? 's' : ''} with the best available resources and vehicles using priority scoring. Each run creates recommended dispatches for Ops approval.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {engineRunning && (
                  <span className="engine-running-badge">
                    <span className="dot" />
                    Processing...
                  </span>
                )}
                <button
                  className="btn-engine-run"
                  onClick={handleRunEngine}
                  disabled={engineRunning || loading}
                >
                  <Cpu size={18} />
                  {engineRunning ? 'Running Engine…' : 'Run Matching Engine'}
                </button>
              </div>
            </div>

            {/* Priority Heatmap Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '1.75rem' }}>
              <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Priority Heatmap</h3>
                  <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
                    Active requests ranked by priority score. Higher scores = faster dispatch.
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{priorityQueue.length} requests</span>
              </div>

              {loading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center' }}><div className="loader-spinner" style={{ width: '36px', height: '36px', margin: '0 auto' }} /></div>
              ) : priorityQueue.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem' }}>
                  <Cpu size={36} className="empty-state-icon" />
                  <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>No Pending Requests</h4>
                  <p style={{ fontSize: '0.85rem' }}>All requests have been matched or resolved. The queue is clear.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '2rem' }}>#</th>
                      <th>Emergency</th>
                      <th>Urgency</th>
                      <th>Affected</th>
                      <th>Status</th>
                      <th style={{ minWidth: '160px' }}>Priority Score</th>
                      <th>Filed</th>
                      <th style={{ textAlign: 'right' }}>Recalculate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityQueue.map((req, idx) => {
                      const scoreClass = getScoreClass(req.priority_score || 0);
                      const isCalcing = calcLoadingId === req.id;
                      return (
                        <tr key={req.id} className="priority-row">
                          <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{req.category || 'General'}</div>
                            <div style={{ fontSize: '0.73rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                              {req.description?.substring(0, 55)}{req.description?.length > 55 ? '…' : ''}
                            </div>
                          </td>
                          <td><UrgencyBadge urgency={req.urgency} /></td>
                          <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{req.people_affected}</td>
                          <td>
                            <span className={`status-pill ${STATUS_CONFIG[req.status]?.cssClass || ''}`}>
                              {STATUS_CONFIG[req.status]?.label || req.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ flex: 1 }}>
                                <div className="priority-score-bar">
                                  <div
                                    className={`priority-score-fill ${scoreClass}`}
                                    style={{ width: `${Math.min(100, req.priority_score || 0)}%` }}
                                  />
                                </div>
                              </div>
                              <span className={`score-badge ${getScoreBadgeClass(req.priority_score || 0)}`}>
                                {(req.priority_score || 0).toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            {timeAgo(req.created_at)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleCalculatePriority(req.id)}
                              disabled={isCalcing}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              {isCalcing
                                ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Scoring…</>
                                : <><Zap size={11} /> Score</>
                              }
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Dispatch Lifecycle Kanban */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
              <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Dispatch Lifecycle</h3>
                  <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
                    Live pipeline: {kanban.total || 0} total active dispatches
                  </p>
                </div>
                <button onClick={() => switchTab('dispatch')} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}>
                  Manage Dispatches
                </button>
              </div>

              <div className="kanban-grid">
                {[
                  { label: 'Awaiting Approval', value: kanban.awaiting, color: '#f59e0b' },
                  { label: 'Approved',           value: kanban.approved, color: '#3b82f6' },
                  { label: 'In Transit',         value: kanban.inTransit, color: '#f97316' },
                  { label: 'Delivered',          value: kanban.delivered, color: '#10b981' },
                ].map(col => {
                  const pct = kanban.total > 0 ? Math.round((col.value / kanban.total) * 100) : 0;
                  return (
                    <div key={col.label} className="kanban-column">
                      <div className="kanban-column-header">
                        <span className="kanban-column-title">{col.label}</span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                      </div>
                      <p className="kanban-count" style={{ color: col.color }}>{loading ? '—' : col.value}</p>
                      <div className="kanban-bar-track">
                        <div className="kanban-bar-fill" style={{ width: `${pct}%`, background: col.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── REQUEST DETAIL MODAL ── */}
      {selectedRequestDetail && (
        <div className="modal-overlay" onClick={() => setSelectedRequestDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))', fontWeight: 700, marginBottom: '0.25rem' }}>Emergency Request</p>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{selectedRequestDetail.category || 'General Emergency'}</h3>
              </div>
              <button onClick={() => setSelectedRequestDetail(null)} className="modal-close-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="modal-field-label">Urgency Level</p>
                <div style={{ marginTop: '0.4rem' }}><UrgencyBadge urgency={selectedRequestDetail.urgency} /></div>
              </div>
              <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="modal-field-label">Description</p>
                <p className="modal-field-value" style={{ lineHeight: 1.6 }}>{selectedRequestDetail.description}</p>
              </div>
              <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="modal-field-label">People Affected</p>
                <p className="modal-field-value">{selectedRequestDetail.people_affected}</p>
              </div>
              {selectedRequestDetail.priority_score > 0 && (
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Priority Score</p>
                  <div style={{ marginTop: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div className="priority-score-bar">
                          <div
                            className={`priority-score-fill ${getScoreClass(selectedRequestDetail.priority_score)}`}
                            style={{ width: `${Math.min(100, selectedRequestDetail.priority_score)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`score-badge ${getScoreBadgeClass(selectedRequestDetail.priority_score)}`}>
                        {selectedRequestDetail.priority_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="modal-field-label">Coordinates</p>
                <p className="modal-field-value mono">{selectedRequestDetail.lat?.toFixed(6)}, {selectedRequestDetail.lng?.toFixed(6)}</p>
              </div>
              <div style={{ padding: '0.85rem 0' }}>
                <p className="modal-field-label">Reported At</p>
                <p className="modal-field-value">{new Date(selectedRequestDetail.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedRequestDetail(null)} className="btn btn-secondary" style={{ padding: '0.55rem 1.5rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW DISPATCH MODAL ── */}
      {showDispatchModal && (
        <div className="modal-overlay" onClick={() => setShowDispatchModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))', fontWeight: 700, marginBottom: '0.25rem' }}>Dispatch Hub</p>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Create New Dispatch</h3>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="modal-close-btn"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateDispatch}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Emergency Request *</label>
                  <select
                    className="form-input"
                    required
                    value={selectedRequest?.id || ''}
                    onChange={e => setSelectedRequest(requests.find(r => r.id === e.target.value) || null)}
                    style={{ appearance: 'auto', background: 'hsl(220,40%,11%)' }}
                  >
                    <option value="">Select a request...</option>
                    {requests.map(r => (
                      <option key={r.id} value={r.id}>[{r.urgency}] {r.category} — {r.description?.substring(0, 50)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Resource *</label>
                    <select className="form-input" required value={dispatchForm.resource_id}
                      onChange={e => setDispatchForm(p => ({ ...p, resource_id: e.target.value }))}
                      style={{ appearance: 'auto', background: 'hsl(220,40%,11%)' }}>
                      <option value="">Select resource...</option>
                      {resources.map(r => (
                        <option key={r.id} value={r.id}>{r.type} ({r.quantity} {r.unit}) — {r.organizations?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle *</label>
                    <select className="form-input" required value={dispatchForm.vehicle_id}
                      onChange={e => setDispatchForm(p => ({ ...p, vehicle_id: e.target.value }))}
                      style={{ appearance: 'auto', background: 'hsl(220,40%,11%)' }}>
                      <option value="">Select vehicle...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.type} cap:{v.capacity} — {v.organizations?.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Ground Team</label>
                    <select className="form-input" value={dispatchForm.ground_team_id}
                      onChange={e => setDispatchForm(p => ({ ...p, ground_team_id: e.target.value }))}
                      style={{ appearance: 'auto', background: 'hsl(220,40%,11%)' }}>
                      <option value="">Unassigned</option>
                      {groundTeams.map(g => (
                        <option key={g.id} value={g.id}>{g.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ETA (minutes)</label>
                    <input type="number" className="form-input" value={dispatchForm.eta_minutes}
                      onChange={e => setDispatchForm(p => ({ ...p, eta_minutes: e.target.value }))}
                      min="1" max="999" style={{ paddingLeft: '1rem' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowDispatchModal(false)} className="btn btn-secondary" style={{ padding: '0.55rem 1.25rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={14} /> Create Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BROADCAST EMERGENCY ALERT MODAL ── */}
      {showBroadcastModal && (
        <div className="modal-overlay" onClick={() => setShowBroadcastModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px', width: '95%', border: '1px solid rgba(245, 158, 11, 0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                  <BellRing size={20} />
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', fontWeight: 700 }}>Public Safety Network</p>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>Issue Emergency Broadcast</h3>
                </div>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} className="modal-close-btn"><X size={16} /></button>
            </div>

            <form onSubmit={handleSendBroadcast}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Alert Headline / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Severe Flash Flood Warning: Sector 4"
                    value={broadcastForm.title}
                    onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Severity Level *</label>
                    <select
                      className="form-input"
                      value={broadcastForm.severity}
                      onChange={e => setBroadcastForm(p => ({ ...p, severity: e.target.value }))}
                      style={{ appearance: 'auto', background: 'hsl(220,40%,11%)' }}
                    >
                      <option value="CRITICAL">CRITICAL (Red Flashing)</option>
                      <option value="WARNING">WARNING (Amber Alert)</option>
                      <option value="ADVISORY">ADVISORY (Cyan Bulletin)</option>
                      <option value="INFO">INFO (General Notice)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Sector / Region</label>
                    <input
                      type="text"
                      placeholder="e.g. Coastal Basin & Zone B"
                      value={broadcastForm.region}
                      onChange={e => setBroadcastForm(p => ({ ...p, region: e.target.value }))}
                      className="form-input"
                      style={{ paddingLeft: '1rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Broadcast Instructions & Guidance *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Detailed emergency message, evacuation directions, or shelter coordinates for affected citizens and ground units."
                    value={broadcastForm.message}
                    onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
                    className="form-input"
                    style={{ paddingLeft: '1rem', resize: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowBroadcastModal(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '0.6rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: broadcastForm.severity === 'CRITICAL' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined
                  }}
                >
                  <BellRing size={15} /> Transmit Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsDashboard;
