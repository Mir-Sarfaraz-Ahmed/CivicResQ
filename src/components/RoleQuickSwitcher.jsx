import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Shield, Briefcase, Truck, Radio, 
  ChevronUp, ChevronDown, Check, Zap, Layers 
} from 'lucide-react';

const ROLES_LIST = [
  {
    role: 'CITIZEN',
    label: 'Citizen',
    email: 'citizen@example.com',
    liveEmail: 'citizen@gmail.com',
    path: '/citizen/dashboard',
    badgeClass: 'role-badge-citizen',
    icon: <Users size={14} />,
    color: '#3b82f6'
  },
  {
    role: 'NGO',
    label: 'NGO Partner',
    email: 'ngo@example.com',
    liveEmail: 'ngo@gmail.com',
    path: '/ngo/dashboard',
    badgeClass: 'role-badge-ngo',
    icon: <Briefcase size={14} />,
    color: '#10b981'
  },
  {
    role: 'GROUND_TEAM',
    label: 'Ground Team',
    email: 'ground@example.com',
    liveEmail: 'ground@gmail.com',
    path: '/ground/dashboard',
    badgeClass: 'role-badge-ground',
    icon: <Truck size={14} />,
    color: '#8b5cf6'
  },
  {
    role: 'OPERATIONS',
    label: 'Operations',
    email: 'ops@example.com',
    liveEmail: 'ops@gmail.com',
    path: '/operations/dashboard',
    badgeClass: 'role-badge-ops',
    icon: <Radio size={14} />,
    color: '#f59e0b'
  },
  {
    role: 'ADMIN',
    label: 'System Admin',
    email: 'admin@example.com',
    liveEmail: 'admin@gmail.com',
    path: '/admin/dashboard',
    badgeClass: 'role-badge-admin',
    icon: <Shield size={14} />,
    color: '#ef4444'
  }
];

const RoleQuickSwitcher = () => {
  const { profile, login, isMock, user } = useAuth();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);

  if (!user) return null; // Only show when user is logged in

  const currentRoleObj = ROLES_LIST.find(r => r.role === profile?.role) || ROLES_LIST[0];

  const handleSwitch = async (roleObj) => {
    if (profile?.role === roleObj.role) return;
    setSwitchingRole(roleObj.role);
    try {
      const email = roleObj.liveEmail || roleObj.email;
      await login(email, 'password');
      navigate(roleObj.path);
    } catch (err) {
      console.error('Quick switch error:', err);
    } finally {
      setSwitchingRole(null);
      setIsExpanded(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.25rem',
      right: '1.25rem',
      zIndex: 9999,
      fontFamily: 'inherit'
    }}>
      {/* Expanded popup menu */}
      {isExpanded && (
        <div 
          className="glass-panel"
          style={{
            marginBottom: '0.65rem',
            padding: '0.75rem',
            borderRadius: '12px',
            minWidth: '250px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ padding: '0.35rem 0.5rem 0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--primary))' }}>
              ⚡ 1-Click Role Switcher
            </span>
            <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>
              {isMock ? 'Mock' : 'Live'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
            {ROLES_LIST.map((r) => {
              const isActive = profile?.role === r.role;
              const isPending = switchingRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => handleSwitch(r)}
                  disabled={isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: isActive ? `1px solid ${r.color}50` : '1px solid transparent',
                    background: isActive ? `${r.color}15` : 'rgba(255,255,255,0.02)',
                    color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: r.color }}>{r.icon}</span>
                    <span>{r.label}</span>
                  </div>
                  {isActive && <Check size={14} style={{ color: r.color }} />}
                  {isPending && <span style={{ fontSize: '0.68rem', color: r.color }}>Switching…</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating capsule trigger */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.55rem 1rem',
          borderRadius: '999px',
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(16px)',
          color: '#fff',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700,
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: currentRoleObj.color,
          boxShadow: `0 0 8px ${currentRoleObj.color}`
        }} />
        <span style={{ color: currentRoleObj.color }}>{currentRoleObj.label}</span>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
};

export default RoleQuickSwitcher;
