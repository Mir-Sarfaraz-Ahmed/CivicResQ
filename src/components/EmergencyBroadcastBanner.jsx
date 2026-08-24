import React from 'react';
import { useAlerts } from '../context/AlertContext';
import { AlertTriangle, BellRing, Info, ShieldAlert, X, Radio } from 'lucide-react';

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.12) 100%)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#ef4444',
    badgeBg: '#ef4444',
    badgeColor: '#000',
    icon: <ShieldAlert size={18} className="broadcast-icon-pulse" />
  },
  WARNING: {
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.1) 100%)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#f59e0b',
    badgeBg: '#f59e0b',
    badgeColor: '#000',
    icon: <AlertTriangle size={18} />
  },
  ADVISORY: {
    bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.14) 0%, rgba(14, 116, 144, 0.08) 100%)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    color: '#06b6d4',
    badgeBg: '#06b6d4',
    badgeColor: '#000',
    icon: <Radio size={18} />
  },
  INFO: {
    bg: 'linear-gradient(135deg, rgba(95, 123, 244, 0.14) 0%, rgba(67, 56, 202, 0.08) 100%)',
    border: '1px solid rgba(95, 123, 244, 0.3)',
    color: '#5f7bf4',
    badgeBg: '#5f7bf4',
    badgeColor: '#fff',
    icon: <Info size={18} />
  }
};

const EmergencyBroadcastBanner = () => {
  const { activeAlert, dismissAlert } = useAlerts();

  if (!activeAlert) return null;

  const cfg = SEVERITY_CONFIG[activeAlert.severity] || SEVERITY_CONFIG.WARNING;

  return (
    <div 
      className={`broadcast-banner-container ${activeAlert.severity === 'CRITICAL' ? 'critical-glow' : ''}`}
      style={{
        background: cfg.bg,
        border: cfg.border,
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        position: 'relative',
        backdropFilter: 'blur(12px)',
        boxShadow: activeAlert.severity === 'CRITICAL' 
          ? '0 0 25px rgba(239, 68, 68, 0.25)' 
          : '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <div style={{ color: cfg.color, marginTop: '0.15rem' }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span style={{
                background: cfg.badgeBg,
                color: cfg.badgeColor,
                fontWeight: 800,
                fontSize: '0.68rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                {activeAlert.severity} BROADCAST
              </span>
              {activeAlert.region && (
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                  📍 {activeAlert.region}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                • {new Date(activeAlert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
              {activeAlert.title}
            </h4>
            <p style={{ color: 'hsl(var(--text-main))', fontSize: '0.88rem', lineHeight: '1.5', opacity: 0.9 }}>
              {activeAlert.message}
            </p>
          </div>
        </div>

        <button
          onClick={() => dismissAlert(activeAlert.id)}
          title="Dismiss Alert"
          className="modal-close-btn"
          style={{ width: '28px', height: '28px', flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default EmergencyBroadcastBanner;
