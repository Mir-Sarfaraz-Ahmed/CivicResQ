import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, MapPin, Users, HeartPulse, Flame, 
  Waves, AlertTriangle, X, Radio, CheckCircle, Loader 
} from 'lucide-react';

const SOS_PRESETS = [
  { id: 'trapped', label: 'Trapped / Stranded', icon: <Waves size={16} />, category: 'Immediate Rescue' },
  { id: 'medical', label: 'Severe Medical Crisis', icon: <HeartPulse size={16} />, category: 'Urgent Medical' },
  { id: 'fire', label: 'Fire / Structure Danger', icon: <Flame size={16} />, category: 'Fire Evacuation' },
  { id: 'general', label: 'Life Threatening Hazard', icon: <AlertTriangle size={16} />, category: 'Critical Distress' },
];

const QuickSosModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile, isMock } = useAuth();
  const [selectedPreset, setSelectedPreset] = useState('trapped');
  const [peopleCount, setPeopleCount] = useState(1);
  const [note, setNote] = useState('');
  const [gpsLocation, setGpsLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      detectLocation();
    }
  }, [isOpen]);

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: parseFloat(pos.coords.latitude.toFixed(6)),
            lng: parseFloat(pos.coords.longitude.toFixed(6))
          });
          setLocating(false);
        },
        () => {
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const presetObj = SOS_PRESETS.find(p => p.id === selectedPreset) || SOS_PRESETS[0];
    const description = note.trim()
      ? `[URGENT SOS - ${presetObj.label}] ${note.trim()}`
      : `[URGENT 1-TAP SOS] Citizen triggered immediate distress alert for ${presetObj.label}. Urgent dispatch requested.`;

    const sosPayload = {
      description,
      lat: gpsLocation.lat,
      lng: gpsLocation.lng,
      people_affected: parseInt(peopleCount, 10) || 1,
      urgency: 'CRITICAL',
      category: presetObj.category,
      status: 'UNDER_REVIEW',
      created_at: new Date().toISOString()
    };

    if (isMock) {
      const stored = JSON.parse(localStorage.getItem('mock_citizen_requests') || '[]');
      const newReq = {
        id: 'sos-mock-' + Date.now(),
        reported_by: user?.id || 'mock-citizen-uuid',
        priority_score: 95.0,
        ...sosPayload
      };
      stored.unshift(newReq);
      localStorage.setItem('mock_citizen_requests', JSON.stringify(stored));

      setTimeout(() => {
        setSubmitting(false);
        if (onSuccess) onSuccess(newReq);
        onClose();
      }, 500);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .insert([{
          reported_by: user?.id,
          ...sosPayload
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate priority score immediately
        await supabase.rpc('calculate_priority', { req_id: data[0].id });
      }

      setSubmitting(false);
      if (onSuccess) onSuccess(data ? data[0] : null);
      onClose();
    } catch (err) {
      console.error('SOS distress submission error:', err);
      setErrorMsg(err.message || 'Failed to dispatch SOS signal.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '520px', 
          width: '95%',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.15)', 
              color: '#ef4444', 
              padding: '0.4rem', 
              borderRadius: '8px',
              display: 'flex' 
            }}>
              <ShieldAlert size={22} className="broadcast-icon-pulse" />
            </div>
            <div>
              <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#ef4444', fontWeight: 800 }}>
                CRITICAL DISPATCH
              </p>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                1-Tap SOS Emergency Signal
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn"><X size={16} /></button>
        </div>

        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: '1.25rem' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}><AlertTriangle size={16} /></div>
            <div className="info-banner-content"><div>{errorMsg}</div></div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Preset Emergency Pickers */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Select Distress Condition *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {SOS_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    border: selectedPreset === p.id 
                      ? '1.5px solid #ef4444' 
                      : '1px solid rgba(255,255,255,0.08)',
                    background: selectedPreset === p.id 
                      ? 'rgba(239, 68, 68, 0.12)' 
                      : 'rgba(255,255,255,0.02)',
                    color: selectedPreset === p.id ? '#fff' : 'hsl(var(--text-muted))',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: selectedPreset === p.id ? '#ef4444' : 'inherit' }}>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Headcount + Location GPS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">People in Danger *</label>
              <input
                type="number"
                min="1"
                max="100"
                value={peopleCount}
                onChange={e => setPeopleCount(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                required
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">GPS Coordinates</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  {locating ? 'Locating...' : 'Refresh GPS'}
                </button>
              </div>
              <div style={{
                padding: '0.65rem 0.9rem',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#fff',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <MapPin size={13} style={{ color: '#ef4444' }} />
                <span>{gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Quick optional detail */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Optional Quick Note / Landmarks</label>
            <input
              type="text"
              placeholder="e.g. 2nd floor balcony, roof access cut off"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '1rem' }}
            />
          </div>

          {/* Big SOS Trigger Button */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.7rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-sos-trigger"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.75rem',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
              }}
            >
              <ShieldAlert size={18} />
              {submitting ? 'Transmitting Distress Signal...' : 'TRIGGER IMMEDIATE SOS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickSosModal;
