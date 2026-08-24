import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, RefreshCw, Clock, Ban } from 'lucide-react';

const Unauthorized = () => {
  const { profile, logout, refetchProfile, isMock } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Helper to determine the exact message to show
  const getDisplayDetails = () => {
    if (!profile) {
      return {
        icon: <ShieldAlert size={48} className="map-crosshair" style={{ color: '#ef4444' }} />,
        title: 'Access Denied',
        description: 'You do not have the required security credentials to access this sector.',
        showRefresh: false
      };
    }

    if (profile.is_active === false) {
      return {
        icon: <Ban size={48} style={{ color: '#ef4444' }} />,
        title: 'Account Suspended',
        description: 'Your profile has been suspended by system operations. If you believe this is an error, please contact your administration desk.',
        showRefresh: false
      };
    }

    if (profile.role === 'NGO' && profile.org_status === 'PENDING') {
      return {
        icon: <Clock size={48} style={{ color: '#f59e0b' }} />,
        title: 'NGO Authorization Pending',
        description: `Your organization "${profile.org_name || 'Registered NGO'}" is awaiting administrative approval. An administrator is currently reviewing your credentials.`,
        showRefresh: true
      };
    }

    if (profile.role === 'NGO' && profile.org_status === 'REJECTED') {
      return {
        icon: <Ban size={48} style={{ color: '#ef4444' }} />,
        title: 'NGO Application Rejected',
        description: `Your registration for organization "${profile.org_name || 'Registered NGO'}" was rejected. Please verify your details or contact operations.`,
        showRefresh: false
      };
    }

    if (profile.role === 'NGO' && profile.org_status === 'SUSPENDED') {
      return {
        icon: <Ban size={48} style={{ color: '#ef4444' }} />,
        title: 'NGO Organization Suspended',
        description: `The organization "${profile.org_name || 'Registered NGO'}" has been suspended. Resource and vehicle assets associated with this org are temporarily locked.`,
        showRefresh: false
      };
    }

    // Default: tried to access something unauthorized
    return {
      icon: <ShieldAlert size={48} style={{ color: '#ef4444' }} />,
      title: 'Restricted Sector',
      description: `Your account role (${profile.role}) does not have clearance to view this dashboard.`,
      showRefresh: false
    };
  };

  const { icon, title, description, showRefresh } = getDisplayDetails();

  return (
    <div className="auth-container">
      <div className="bg-glow-layer">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      <div className="auth-card glass-panel" style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', marginBottom: '1.5rem', padding: '1rem', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
          {icon}
        </div>
        
        <h1 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{title}</h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          {description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {showRefresh && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={refetchProfile}
            >
              <RefreshCw size={18} />
              Refresh Status
            </button>
          )}

          {profile && profile.role === 'CITIZEN' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/citizen/dashboard')}
            >
              Return to Citizen Portal
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
          >
            <LogOut size={18} />
            Sign Out of Account
          </button>
        </div>

        {isMock && profile?.role === 'NGO' && profile.org_status === 'PENDING' && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.2)', borderRadius: '8px', fontSize: '0.8rem' }}>
            <p style={{ color: 'hsl(var(--primary))', fontWeight: 600, marginBottom: '0.5rem' }}>💡 Mock Demo Tip</p>
            <p style={{ color: 'hsl(var(--text-muted))' }}>
              Since you are in demo mode, you can log out and log in as <strong>admin@example.com</strong> to approve organizations, or click the approved NGO account <strong>ngo@example.com</strong> in the sandbox to see the working dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unauthorized;
