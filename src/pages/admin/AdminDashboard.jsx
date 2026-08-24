import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Shield, LogOut, Radio, Users, Landmark, Zap, 
  Clock, Check, X, ShieldAlert, Activity, MapPin, Lock, Cpu, RefreshCw, BellRing
} from 'lucide-react';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';
import { useAlerts } from '../../context/AlertContext';

// Root admin account — this account can NEVER be modified or suspended by anyone
const ROOT_ADMIN_EMAIL = 'admin@gmail.com';

const AdminDashboard = () => {
  const { profile, user, logout, isMock } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineStats, setEngineStats] = useState({ unmatched: 0, availResources: 0, availVehicles: 0 });

  // Popups details modals
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectedNgoDetail, setSelectedNgoDetail] = useState(null);

  // System Stats Metrics
  const [stats, setStats] = useState({
    citizens: 0,
    ngos: 0,
    rescuers: 0,
    requests: 0
  });

  // Lists from DB
  const [usersList, setUsersList] = useState([]);
  const [ngosList, setNgosList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Role selections mapping
  const [selectedRoles, setSelectedRoles] = useState({});

  // Simulator Form States
  const [simCategory, setSimCategory] = useState('Flood Relief');
  const [simUrgency, setSimUrgency] = useState('HIGH');
  const [simPeople, setSimPeople] = useState('12');
  const [simDesc, setSimDesc] = useState('Heavy local flooding reported with stranded households requiring relief kits.');
  const [simLocation, setSimLocation] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi, India

  // Map references
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    loadTabContent();
  }, [activeTab, profile]);

  // Handle map loader for Simulator Tab
  useEffect(() => {
    if (activeTab !== 'simulator') {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    } else {
      setTimeout(() => {
        initSimulatorMap();
      }, 200);
    }
  }, [activeTab]);

  const initSimulatorMap = () => {
    if (!window.L || mapRef.current) return;

    try {
      const map = window.L.map('simulator-map').setView([simLocation.lat, simLocation.lng], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = window.L.marker([simLocation.lat, simLocation.lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setSimLocation({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) });
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setSimLocation({ lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) });
      });

      mapRef.current = map;
      markerRef.current = marker;
    } catch (e) {
      console.error('Failed to load Leaflet simulator map:', e);
    }
  };

  const loadTabContent = async () => {
    if (!profile) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isMock) {
      loadMockData();
      return;
    }

    try {
      if (activeTab === 'dashboard') {
        const { count: citizenCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'CITIZEN');
        const { count: ngoCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'NGO');
        const { count: groundCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'GROUND_TEAM');
        const { count: reqCount } = await supabase.from('emergency_requests').select('*', { count: 'exact', head: true });

        setStats({
          citizens: citizenCount || 0,
          ngos: ngoCount || 0,
          rescuers: groundCount || 0,
          requests: reqCount || 0
        });
      } else if (activeTab === 'users') {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, email, role, full_name, phone, is_active, created_at, organization_id,
            organizations ( name )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const withOrgName = (data || []).map(u => ({
          ...u,
          org_name: u.organizations?.name || null
        }));
        setUsersList(withOrgName);

        const initialSelected = {};
        withOrgName.forEach(u => {
          initialSelected[u.id] = u.role;
        });
        setSelectedRoles(initialSelected);

      } else if (activeTab === 'ngos') {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, role, full_name, phone, organization_id,
            organizations ( id, name, status, created_at )
          `)
          .eq('role', 'NGO')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNgosList(data || []);
      } else if (activeTab === 'audit') {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) throw error;
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      setErrorMsg(err.message || 'Failed to load telemetry from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    if (!localStorage.getItem('mock_profiles')) {
      const mockProfiles = [
        { id: 'mock-citizen-uuid', full_name: 'John Citizen', phone: '+1 (555) 010-0200', role: 'CITIZEN', is_active: true },
        { id: 'mock-ngo-uuid', full_name: 'Sarah NGO Lead', phone: '+1 (555) 020-0300', role: 'NGO', is_active: true, organization_id: 'mock-org-approved-uuid', org_name: 'Global Relief Corp', org_status: 'APPROVED' },
        { id: 'mock-ngo-pending-uuid', full_name: 'Mark NGO Pending', phone: '+1 (555) 022-0333', role: 'NGO', is_active: true, organization_id: 'mock-org-pending-uuid', org_name: 'Hope Initiative', org_status: 'PENDING' },
        { id: 'mock-ground-uuid', full_name: 'Gary Ground', phone: '+1 (555) 030-0400', role: 'GROUND_TEAM', is_active: true, organization_id: 'mock-org-approved-uuid', org_name: 'Global Relief Corp', org_status: 'APPROVED' },
        { id: 'mock-ops-uuid', full_name: 'Olivia Operations', phone: '+1 (555) 040-0500', role: 'OPERATIONS', is_active: true },
        { id: 'mock-admin-uuid', full_name: 'Alice Admin', phone: '+1 (555) 050-0600', role: 'ADMIN', is_active: true }
      ];
      localStorage.setItem('mock_profiles', JSON.stringify(mockProfiles));
    }

    if (!localStorage.getItem('mock_organizations')) {
      const mockOrgs = [
        { id: 'mock-org-approved-uuid', name: 'Global Relief Corp', status: 'APPROVED', created_at: new Date().toISOString() },
        { id: 'mock-org-pending-uuid', name: 'Hope Initiative', status: 'PENDING', created_at: new Date().toISOString() }
      ];
      localStorage.setItem('mock_organizations', JSON.stringify(mockOrgs));
    }

    if (!localStorage.getItem('mock_audit_logs')) {
      const mockLogs = [
        { id: 'log-1', action: 'INITIALIZE_SYSTEM', target_type: 'system', target_id: null, timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log-2', action: 'APPROVE_ORGANIZATION: Global Relief Corp', target_type: 'organizations', target_id: 'mock-org-approved-uuid', timestamp: new Date().toISOString() }
      ];
      localStorage.setItem('mock_audit_logs', JSON.stringify(mockLogs));
    }

    const profiles = JSON.parse(localStorage.getItem('mock_profiles'));
    const organizations = JSON.parse(localStorage.getItem('mock_organizations'));
    const audits = JSON.parse(localStorage.getItem('mock_audit_logs'));
    const citizenReq = JSON.parse(localStorage.getItem('mock_citizen_requests') || '[]');

    if (activeTab === 'dashboard') {
      setStats({
        citizens: profiles.filter(p => p.role === 'CITIZEN').length,
        ngos: profiles.filter(p => p.role === 'NGO').length,
        rescuers: profiles.filter(p => p.role === 'GROUND_TEAM').length,
        requests: citizenReq.length
      });
    } else if (activeTab === 'users') {
      const joinedUsers = profiles.map(p => {
        const org = organizations.find(o => o.id === p.organization_id);
        return {
          ...p,
          organizations: org ? { name: org.name } : null
        };
      });
      setUsersList(joinedUsers);

      const initialSelected = {};
      joinedUsers.forEach(u => {
        initialSelected[u.id] = u.role;
      });
      setSelectedRoles(initialSelected);
    } else if (activeTab === 'ngos') {
      const joinedNgos = profiles
        .filter(p => p.role === 'NGO')
        .map(p => {
          const org = organizations.find(o => o.id === p.organization_id);
          return {
            ...p,
            organizations: org ? { id: org.id, name: org.name, status: org.status, created_at: org.created_at } : null
          };
        });
      setNgosList(joinedNgos);
    } else if (activeTab === 'audit') {
      setAuditLogs(audits);
    }

    setLoading(false);
  };

  const handleUpdateRole = async (userId, targetRole) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (userId === profile.id) {
      setErrorMsg('Unauthorized: You cannot change your own role.');
      return;
    }

    if (isMock) {
      const profiles = JSON.parse(localStorage.getItem('mock_profiles'));
      const updated = profiles.map(p => p.id === userId ? { ...p, role: targetRole } : p);
      localStorage.setItem('mock_profiles', JSON.stringify(updated));

      const audits = JSON.parse(localStorage.getItem('mock_audit_logs'));
      audits.unshift({
        id: 'log-dyn-' + Math.random(),
        action: `UPDATE_ROLE: Mock update to ${targetRole}`,
        target_type: 'profiles',
        target_id: userId,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('mock_audit_logs', JSON.stringify(audits));

      setSuccessMsg('Mock user role updated successfully!');
      loadMockData();
      return;
    }

    try {
      const { data, error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: targetRole
      });

      if (error) throw error;
      setSuccessMsg(`User role updated to ${targetRole} successfully!`);
      loadTabContent();
    } catch (err) {
      console.error('Role update error:', err);
      setErrorMsg(err.message || 'Failed to update user role.');
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextStatus = !currentStatus;

    if (isMock) {
      const profiles = JSON.parse(localStorage.getItem('mock_profiles'));
      const updated = profiles.map(p => p.id === userId ? { ...p, is_active: nextStatus } : p);
      localStorage.setItem('mock_profiles', JSON.stringify(updated));
      setSuccessMsg(`User status updated to ${nextStatus ? 'ACTIVE' : 'SUSPENDED'}`);
      loadMockData();
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextStatus })
        .eq('id', userId);

      if (error) throw error;
      setSuccessMsg(`User status successfully updated.`);
      loadTabContent();
    } catch (err) {
      console.error('Status toggle error:', err);
      setErrorMsg(err.message || 'Failed to modify profile status.');
    }
  };

  const handleApproveNgo = async (orgId, orgName) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isMock) {
      const orgs = JSON.parse(localStorage.getItem('mock_organizations'));
      const updatedOrgs = orgs.map(o => o.id === orgId ? { ...o, status: 'APPROVED' } : o);
      localStorage.setItem('mock_organizations', JSON.stringify(updatedOrgs));

      const audits = JSON.parse(localStorage.getItem('mock_audit_logs'));
      audits.unshift({
        id: 'log-dyn-' + Math.random(),
        action: `APPROVE_ORGANIZATION: ${orgName}`,
        target_type: 'organizations',
        target_id: orgId,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('mock_audit_logs', JSON.stringify(audits));

      setSuccessMsg(`NGO "${orgName}" approved successfully!`);
      loadMockData();
      return;
    }

    try {
      const { error: orgErr } = await supabase
        .from('organizations')
        .update({ status: 'APPROVED' })
        .eq('id', orgId);
      if (orgErr) throw orgErr;

      const { error: auditErr } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: profile.id,
          action: `APPROVE_ORGANIZATION: ${orgName}`,
          target_type: 'organizations',
          target_id: orgId
        }]);
      if (auditErr) throw auditErr;

      setSuccessMsg(`NGO "${orgName}" has been successfully approved!`);
      loadTabContent();
    } catch (err) {
      console.error('NGO Approval error:', err);
      setErrorMsg(err.message || 'Failed to authorize NGO organization.');
    }
  };

  const handleRejectNgo = async (orgId, orgName) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isMock) {
      const orgs = JSON.parse(localStorage.getItem('mock_organizations'));
      const updatedOrgs = orgs.map(o => o.id === orgId ? { ...o, status: 'REJECTED' } : o);
      localStorage.setItem('mock_organizations', JSON.stringify(updatedOrgs));
      setSuccessMsg(`NGO "${orgName}" application rejected.`);
      loadMockData();
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: 'REJECTED' })
        .eq('id', orgId);
      if (error) throw error;

      setSuccessMsg(`NGO "${orgName}" application has been rejected.`);
      loadTabContent();
    } catch (err) {
      console.error('NGO rejection error:', err);
      setErrorMsg(err.message || 'Failed to reject NGO organization.');
    }
  };

  const handleSimulateRequest = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const mockRequest = {
      description: simDesc,
      lat: simLocation.lat,
      lng: simLocation.lng,
      people_affected: parseInt(simPeople, 10),
      urgency: simUrgency,
      category: simCategory,
      status: 'UNDER_REVIEW',
      created_at: new Date().toISOString()
    };

    if (isMock) {
      const citizenReq = JSON.parse(localStorage.getItem('mock_citizen_requests') || '[]');
      const id = 'req-dyn-' + Math.floor(Math.random() * 100000);
      citizenReq.unshift({ id, reported_by: 'mock-citizen-uuid', ...mockRequest });
      localStorage.setItem('mock_citizen_requests', JSON.stringify(citizenReq));

      const audits = JSON.parse(localStorage.getItem('mock_audit_logs'));
      audits.unshift({
        id: 'log-dyn-' + Math.random(),
        action: `SIMULATE_EMERGENCY_REQUEST: ${simCategory}`,
        target_type: 'emergency_requests',
        target_id: id,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('mock_audit_logs', JSON.stringify(audits));

      setSuccessMsg('Simulated disaster distress report successfully generated!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .insert([{
          reported_by: profile.id,
          ...mockRequest
        }])
        .select();

      if (error) throw error;
      
      // Calculate priority score for the inserted request
      if (data && data.length > 0) {
        await supabase.rpc('calculate_priority', { req_id: data[0].id });
      }
      
      setSuccessMsg('Disaster alert successfully injected into matching pipelines!');
    } catch (err) {
      console.error('Simulation error:', err);
      setErrorMsg(err.message || 'Failed to insert simulated emergency request.');
    }
  };

  const handleMassSimulate = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.rpc('simulate_disaster');
      if (error) throw error;
      setSuccessMsg('Mass disaster simulation successfully injected (5 requests seeded)!');
      loadTabContent(); // Refresh stats
    } catch (err) {
      console.error('Mass Simulation error:', err);
      setErrorMsg(err.message || 'Failed to run mass simulation.');
    }
  };

  const handleAdminRunEngine = async () => {
    setEngineRunning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase.rpc('run_matching_engine');
      if (error) throw error;
      setSuccessMsg(`⚡ Matching Engine Run Complete — ${data || 0} new dispatch${data === 1 ? '' : 'es'} auto-generated.`);
      // Refresh engine stats
      await loadEngineStats();
    } catch (err) {
      setErrorMsg(err.message || 'Engine run failed.');
    } finally {
      setEngineRunning(false);
    }
  };

  const loadEngineStats = async () => {
    if (isMock) return;
    try {
      const [unmatchedRes, resourceRes, vehicleRes] = await Promise.all([
        supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
        supabase.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
      ]);
      setEngineStats({
        unmatched: unmatchedRes.count || 0,
        availResources: resourceRes.count || 0,
        availVehicles: vehicleRes.count || 0,
      });
    } catch (err) {
      console.error('Engine stats error:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
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
                <button 
                  onClick={() => { setActiveTab('dashboard'); setSelectedUserDetail(null); setSelectedNgoDetail(null); }} 
                  className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Activity size={18} />
                  Command Center
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('users'); setSelectedUserDetail(null); setSelectedNgoDetail(null); }} 
                  className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Users size={18} />
                  User Roles
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('ngos'); setSelectedUserDetail(null); setSelectedNgoDetail(null); }} 
                  className={`nav-item ${activeTab === 'ngos' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Landmark size={18} />
                  NGO Approvals
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('simulator'); setSelectedUserDetail(null); setSelectedNgoDetail(null); }} 
                  className={`nav-item ${activeTab === 'simulator' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Zap size={18} />
                  Incident Simulator
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('audit'); setSelectedUserDetail(null); setSelectedNgoDetail(null); }} 
                  className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Clock size={18} />
                  System Audits
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">A</div>
            <div className="user-info">
              <span className="user-name">{profile?.full_name || 'System Admin'}</span>
              <span className="user-role role-badge-admin">Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-block">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
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
              <div>Connected to local simulated database. All role updates, NGO approvals, and simulated incidents persist in mock storage.</div>
            </div>
          </div>
        )}

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
              <ShieldAlert size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Operations Alert</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div className="loader-spinner" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : (
          <>
            {/* TAB 1: CENTRAL OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div>
                <div style={{ marginBottom: '2.5rem' }}>
                  <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>System Command Deck</h1>
                  <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                    Root level clearance. Administer users, authorize NGO credentials, and monitor global status telemetry.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <div className="glass-panel" style={{ padding: '1.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>Registered Citizens</span>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{stats.citizens}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>NGO Partners</span>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{stats.ngos}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>On-Field Rescuers</span>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{stats.rescuers}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>Distress Incident Count</span>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{stats.requests}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderStyle: 'dashed' }}>
                  <Zap size={48} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem', opacity: 0.8 }} />
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Root Security Administration</h2>
                  <p style={{ color: 'hsl(var(--text-muted))', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
                    Root security clearance overrides are active. You have full write access to all tables, bypassing Row Level Security constraints. System configuration, logs audit, and user status elevation are active.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '1rem' }}>
                    <span className="status-pill status-resolved">Clearance Level: ADMIN</span>
                    <span className="status-pill status-delivered">Status: ROOT</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USER ROLES MANAGEMENT */}
            {activeTab === 'users' && (
              <div>
                <div style={{ marginBottom: '2.5rem' }}>
                  <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>User Roles Management</h1>
                  <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                    Elevate, modify, or suspend user access credentials globally. Click a user's name to view contact numbers and unique IDs.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Associated Organization</th>
                        <th>Current Role</th>
                        <th>Secure Promotion Option</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((usr) => {
                        const isRootAdmin = usr.email === ROOT_ADMIN_EMAIL;
                        const isSelf = usr.id === profile.id;
                        return (
                        <tr key={usr.id}>
                          <td>
                            <button 
                              onClick={() => setSelectedUserDetail(usr)}
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer', 
                                color: isRootAdmin ? 'hsl(var(--primary))' : 'hsl(var(--primary))', 
                                textDecoration: 'underline',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              {isRootAdmin && <Lock size={12} style={{ opacity: 0.7 }} />}
                              {usr.full_name || 'Unnamed User'}
                            </button>
                          </td>
                          <td>{usr.org_name || 'Individual (None)'}</td>
                          <td>
                            <span 
                              className="status-pill"
                              style={{ 
                                background: usr.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: usr.role === 'ADMIN' ? '#ef4444' : '#fff'
                              }}
                            >
                              {usr.role}
                            </span>
                          </td>
                          <td>
                            {isRootAdmin ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Lock size={13} style={{ color: 'hsl(var(--primary))', opacity: 0.8 }} />
                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>Root Protected</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select 
                                  value={selectedRoles[usr.id] || usr.role}
                                  onChange={(e) => setSelectedRoles(prev => ({ ...prev, [usr.id]: e.target.value }))}
                                  className="form-input"
                                  style={{ 
                                    padding: '0.25rem 0.5rem', 
                                    fontSize: '0.8rem', 
                                    width: '130px', 
                                    background: 'hsl(var(--background-card))',
                                    appearance: 'auto'
                                  }}
                                  disabled={isSelf}
                                >
                                  <option value="CITIZEN">CITIZEN</option>
                                  <option value="NGO">NGO</option>
                                  <option value="GROUND_TEAM">GROUND_TEAM</option>
                                  <option value="OPERATIONS">OPERATIONS</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                                <button 
                                  onClick={() => handleUpdateRole(usr.id, selectedRoles[usr.id] || usr.role)}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                  disabled={isSelf || (selectedRoles[usr.id] || usr.role) === usr.role}
                                >
                                  Update
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            {usr.is_active ? (
                              <span className="status-pill status-active">Active</span>
                            ) : (
                              <span className="status-pill" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Suspended</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isRootAdmin ? (
                              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                                <Lock size={11} />
                                Immutable
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleToggleActive(usr.id, usr.is_active)}
                                className="btn btn-secondary"
                                style={{ 
                                  padding: '0.35rem 0.75rem', 
                                  fontSize: '0.75rem',
                                  color: usr.is_active ? '#ef4444' : '#10b981',
                                  borderColor: usr.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,20,0.1)'
                                }}
                                disabled={isSelf}
                              >
                                {usr.is_active ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: NGO APPROVALS */}
            {activeTab === 'ngos' && (
              <div>
                <div style={{ marginBottom: '2.5rem' }}>
                  <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>NGO Authorizations</h1>
                  <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                    Review pending NGO partner applications, inspect credentials, and approve organizations. Click a representative's name to view contacts.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Organization Name</th>
                        <th>Representative</th>
                        <th>Registered Date</th>
                        <th>Verification Status</th>
                        <th style={{ textAlign: 'right' }}>Authorize NGO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ngosList.map((ngo) => (
                        <tr key={ngo.id}>
                          <td style={{ fontWeight: 600, color: '#fff' }}>
                            {ngo.organizations?.name || 'NGO Organization'}
                          </td>
                          <td>
                            <button 
                              onClick={() => setSelectedNgoDetail(ngo)}
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer', 
                                color: 'hsl(var(--primary))', 
                                textDecoration: 'underline',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                padding: 0
                              }}
                            >
                              {ngo.full_name}
                            </button>
                          </td>
                          <td>
                            {ngo.organizations?.created_at ? new Date(ngo.organizations.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td>
                            {ngo.organizations?.status === 'APPROVED' ? (
                              <span className="status-pill status-resolved">Approved</span>
                            ) : ngo.organizations?.status === 'PENDING' ? (
                              <span className="status-pill" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Pending Approval</span>
                            ) : (
                              <span className="status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--text-muted))' }}>{ngo.organizations?.status}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {ngo.organizations?.status === 'PENDING' ? (
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => handleApproveNgo(ngo.organizations.id, ngo.organizations.name)}
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectNgo(ngo.organizations.id, ngo.organizations.name)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.1)' }}
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Authorized</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: INCIDENT SIMULATOR */}
            {activeTab === 'simulator' && (
              <div>
                <div style={{ marginBottom: '2.5rem' }}>
                  <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Incident Simulator</h1>
                  <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                    Inject simulated distress reports to test telemetry mapping, NGO inventory dispatching, and Ground Team coordination.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="glass-panel" style={{ padding: '1.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Report Details</h3>
                    <form onSubmit={handleSimulateRequest}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Category</label>
                          <select 
                            value={simCategory}
                            onChange={(e) => setSimCategory(e.target.value)}
                            className="form-input"
                            style={{ appearance: 'auto', background: 'hsl(var(--background-card))', paddingLeft: '1rem' }}
                          >
                            <option value="Flood Relief">Flood Relief</option>
                            <option value="Earthquake Relief">Earthquake Relief</option>
                            <option value="Cyclone Emergency">Cyclone Emergency</option>
                            <option value="Fire Evacuation">Fire Evacuation</option>
                            <option value="Medical Supplies Needed">Medical Supplies Needed</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Urgency Level</label>
                          <select 
                            value={simUrgency}
                            onChange={(e) => setSimUrgency(e.target.value)}
                            className="form-input"
                            style={{ appearance: 'auto', background: 'hsl(var(--background-card))', paddingLeft: '1rem' }}
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Stranded Citizens / Affected Count</label>
                        <input 
                          type="number" 
                          value={simPeople} 
                          onChange={(e) => setSimPeople(e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: '1rem' }}
                          required 
                          min="1"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Situation Description</label>
                        <textarea 
                          value={simDesc}
                          onChange={(e) => setSimDesc(e.target.value)}
                          className="form-input" 
                          rows="3"
                          style={{ resize: 'none', paddingLeft: '1rem' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button type="button" onClick={handleMassSimulate} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))' }}>
                          <Zap size={14} /> Mass Seed Disaster
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={14} /> Simulate Single Incident
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Telemetry Coordinate Pin</h3>
                      <span style={{ color: 'hsl(var(--primary))', fontWeight: 600, fontSize: '0.85rem' }}>
                        {simLocation.lat?.toFixed(5)}, {simLocation.lng?.toFixed(5)}
                      </span>
                    </div>
                    <div 
                      id="simulator-map" 
                      style={{ 
                        flexGrow: 1, 
                        minHeight: '260px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Engine Controls Panel */}
                <div className="engine-command-panel" style={{ marginTop: '2rem' }}>
                  <p className="engine-command-panel-title">⚡ Engine Controls</p>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem', color: '#fff' }}>Core Matching Engine</h3>
                  <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: '540px' }}>
                    The matching engine automatically pairs all <strong style={{ color: '#fff' }}>UNDER_REVIEW</strong> emergency requests with available NGO resources and vehicles based on computed priority scores. Each run generates recommended dispatches for Operations to approve.
                  </p>

                  {/* Engine micro-stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                      { label: 'Unmatched Requests', value: engineStats.unmatched, color: '#f59e0b' },
                      { label: 'Available Resources', value: engineStats.availResources, color: '#10b981' },
                      { label: 'Available Vehicles',  value: engineStats.availVehicles,  color: '#3b82f6' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-muted))', marginBottom: '0.35rem' }}>{s.label}</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{isMock ? '—' : s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={handleAdminRunEngine}
                      disabled={engineRunning || isMock}
                      className="btn-engine-run"
                    >
                      <Cpu size={17} />
                      {engineRunning ? 'Running Engine…' : 'Run Matching Engine'}
                    </button>
                    <button
                      onClick={loadEngineStats}
                      disabled={isMock}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                    >
                      <RefreshCw size={13} /> Refresh Stats
                    </button>
                    {isMock && (
                      <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                        Engine controls are disabled in mock mode.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SYSTEM AUDITS */}
            {activeTab === 'audit' && (
              <div>
                <div style={{ marginBottom: '2.5rem' }}>
                  <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Security Audit Trails</h1>
                  <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                    Audit record of all server-side role promotions, NGO authorizations, and critical database inserts.
                  </p>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="empty-state">
                    <Clock size={36} className="empty-state-icon" />
                    <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '0.25rem' }}>System Log Empty</h4>
                    <p style={{ fontSize: '0.85rem' }}>No system security log operations recorded.</p>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>Log ID</th>
                          <th>Action Triggered</th>
                          <th>Target Table</th>
                          <th>Target ID</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="monospace">{log.id}</td>
                            <td className="wrap-text" style={{ fontWeight: 600, color: '#fff' }}>{log.action}</td>
                            <td>{log.target_type}</td>
                            <td className="monospace">
                              {log.target_id || 'N/A'}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* DETAILS MODAL 1: USER DETAILS */}
        {selectedUserDetail && (
          <div className="modal-overlay" onClick={() => setSelectedUserDetail(null)}>
            <div className="modal-content" style={{ maxWidth: '480px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))', fontWeight: 700, marginBottom: '0.25rem' }}>Admin Panel</p>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>User Account Details</h3>
                </div>
                <button onClick={() => setSelectedUserDetail(null)} className="modal-close-btn">
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Full Name</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: '0.3rem' }}>{selectedUserDetail.full_name || 'Unnamed User'}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">User ID (UUID)</p>
                  <p className="modal-field-value mono">{selectedUserDetail.id}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Contact Number</p>
                  <p className="modal-field-value">{selectedUserDetail.phone || 'Not Provided'}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Affiliated Organization</p>
                  <p className="modal-field-value">{selectedUserDetail.org_name || 'None (Individual Citizen)'}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem 0' }}>
                  <div>
                    <p className="modal-field-label">System Role</p>
                    <div style={{ marginTop: '0.4rem' }}>
                      <span className="status-pill" style={{ background: 'rgba(255,255,255,0.07)', color: '#fff' }}>{selectedUserDetail.role}</span>
                    </div>
                  </div>
                  <div>
                    <p className="modal-field-label">Security Status</p>
                    <div style={{ marginTop: '0.4rem' }}>
                      {selectedUserDetail.is_active ? (
                        <span className="status-pill status-active">Active</span>
                      ) : (
                        <span className="status-pill" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Suspended</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setSelectedUserDetail(null)} className="btn btn-secondary" style={{ padding: '0.55rem 1.5rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS MODAL 2: NGO REPRESENTATIVE DETAILS */}
        {selectedNgoDetail && (
          <div className="modal-overlay" onClick={() => setSelectedNgoDetail(null)}>
            <div className="modal-content" style={{ maxWidth: '480px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))', fontWeight: 700, marginBottom: '0.25rem' }}>NGO Approvals</p>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Representative Credentials</h3>
                </div>
                <button onClick={() => setSelectedNgoDetail(null)} className="modal-close-btn">
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Representative Name</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: '0.3rem' }}>{selectedNgoDetail.full_name}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Associated Organization</p>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--primary))', marginTop: '0.3rem' }}>{selectedNgoDetail.organizations?.name || 'Hope Initiative'}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Representative ID (UUID)</p>
                  <p className="modal-field-value mono">{selectedNgoDetail.id}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Contact Number</p>
                  <p className="modal-field-value">{selectedNgoDetail.phone || 'Not Provided'}</p>
                </div>
                <div style={{ padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="modal-field-label">Organization ID (UUID)</p>
                  <p className="modal-field-value mono">{selectedNgoDetail.organizations?.id || 'mock-org-pending-uuid'}</p>
                </div>
                <div style={{ padding: '0.85rem 0' }}>
                  <p className="modal-field-label">Verification Status</p>
                  <div style={{ marginTop: '0.4rem' }}>
                    {selectedNgoDetail.organizations?.status === 'APPROVED' ? (
                      <span className="status-pill status-resolved">Approved</span>
                    ) : selectedNgoDetail.organizations?.status === 'PENDING' ? (
                      <span className="status-pill" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Pending Approval</span>
                    ) : (
                      <span className="status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--text-muted))' }}>{selectedNgoDetail.organizations?.status}</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setSelectedNgoDetail(null)} className="btn btn-secondary" style={{ padding: '0.55rem 1.5rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
