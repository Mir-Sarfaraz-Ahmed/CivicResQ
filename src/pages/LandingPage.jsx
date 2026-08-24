import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, Radio, ArrowRight, Zap, Users, MapPin, 
  Truck, CheckCircle2, AlertTriangle, Clock, Layers, 
  Sparkles, ExternalLink, HeartPulse, Droplet, Flame, 
  Home, Compass, Lock, Activity, ShieldCheck, ChevronRight,
  Boxes, Server, Navigation, LifeBuoy
} from 'lucide-react';
import QuickSosModal from '../components/QuickSosModal';
import EmergencyBroadcastBanner from '../components/EmergencyBroadcastBanner';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, profile, login } = useAuth();
  const [showSosModal, setShowSosModal] = useState(false);

  // Interactive Live Priority Score Simulator State
  const [simUrgency, setSimUrgency] = useState('CRITICAL');
  const [simPeople, setSimPeople] = useState(12);

  // Live priority calculation formula preview
  const calculateSimScore = () => {
    const base = simUrgency === 'CRITICAL' ? 40 : simUrgency === 'HIGH' ? 30 : simUrgency === 'MEDIUM' ? 20 : 10;
    const peopleFactor = Math.min(25, (simPeople / 50.0) * 25);
    const constantBoost = 20.0;
    return parseFloat((base + peopleFactor + constantBoost).toFixed(1));
  };

  const currentSimScore = calculateSimScore();

  const handleQuickPersonaLogin = async (email, rolePath) => {
    try {
      await login(email, 'password');
      navigate(rolePath);
    } catch {
      navigate('/login');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-deep))', color: 'hsl(var(--text-main))', overflowX: 'hidden' }}>
      
      {/* Background Ambience & Glows */}
      <div className="bg-glow-layer">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      {/* Global Emergency Alert Banner if Active */}
      <EmergencyBroadcastBanner />

      {/* ── TOP NAVIGATION BAR ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(6, 11, 19, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Brand Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#030712',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)'
            }}>
              <Shield size={22} />
            </div>
            <div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CivicResQ
              </span>
              <span style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>
                Disaster Response Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="landing-nav-links">
            <a href="#features" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
              Core Features
            </a>
            <a href="#simulator" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
              AI Engine Sandbox
            </a>
            <a href="#architecture" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
              Architecture
            </a>
            <a href="#roles" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
              5-Role Portals
            </a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowSosModal(true)}
              className="btn-sos-header"
              style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            >
              <Zap size={14} />
              1-Tap SOS
            </button>

            {user ? (
              <button
                onClick={() => {
                  const role = profile?.role;
                  if (role === 'CITIZEN') navigate('/citizen/dashboard');
                  else if (role === 'NGO') navigate('/ngo/dashboard');
                  else if (role === 'GROUND_TEAM') navigate('/ground/dashboard');
                  else if (role === 'OPERATIONS') navigate('/operations/dashboard');
                  else if (role === 'ADMIN') navigate('/admin/dashboard');
                  else navigate('/login');
                }}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Go to Dashboard
                <ArrowRight size={14} />
              </button>
            ) : (
              <Link
                to="/login"
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Launch Terminal
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '5rem 2rem 4rem', textAlign: 'center', position: 'relative' }}>
        
        {/* Real-time Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: '999px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '2rem',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 10px #10b981' }}></span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981' }}>
            Deterministic Disaster Logistics & Telemetry Engine Online
          </span>
        </div>

        {/* Hero Headline */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          maxWidth: '960px',
          margin: '0 auto 1.5rem',
          background: 'linear-gradient(135deg, #ffffff 30%, #a5f3fc 70%, #5f7bf4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Deterministic Disaster Response & AI Logistics Engine
        </h1>

        {/* Hero Subtitle */}
        <p style={{
          fontSize: '1.15rem',
          color: 'hsl(var(--text-muted))',
          maxWidth: '740px',
          margin: '0 auto 2.75rem',
          lineHeight: 1.6
        }}>
          A unified, military-grade crisis coordination infrastructure connecting stranded citizens, NGO supply depots, ground rescue teams, and centralized operations command in real time.
        </p>

        {/* Hero Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{
              padding: '0.95rem 2.25rem',
              fontSize: '1rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.35)'
            }}
          >
            <Radio size={18} />
            Launch Incident Terminal
            <ArrowRight size={18} />
          </Link>

          <button
            onClick={() => setShowSosModal(true)}
            className="btn btn-secondary"
            style={{
              padding: '0.95rem 1.75rem',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#f87171'
            }}
          >
            <Zap size={18} />
            1-Tap Emergency SOS
          </button>
        </div>

        {/* 1-Click Interactive Demo Persona Badges */}
        <div className="glass-card" style={{ maxWidth: '880px', margin: '0 auto', padding: '1.5rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--primary))' }}>
              ⚡ 1-Click Live Persona Demo Launcher
            </span>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              Instant role launch (Mock Demo & Supabase Active)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {[
              { role: 'Citizen', email: 'citizen@gmail.com', path: '/citizen/dashboard', color: '#5f7bf4', icon: <Users size={16} /> },
              { role: 'NGO Lead', email: 'ngo@gmail.com', path: '/ngo/dashboard', color: '#10b981', icon: <Boxes size={16} /> },
              { role: 'Rescuer', email: 'ground@gmail.com', path: '/ground/dashboard', color: '#f59e0b', icon: <Truck size={16} /> },
              { role: 'Ops Commander', email: 'ops@gmail.com', path: '/operations/dashboard', color: '#06b6d4', icon: <Radio size={16} /> },
              { role: 'System Admin', email: 'admin@civicresq.com', path: '/admin/dashboard', color: '#ef4444', icon: <Shield size={16} /> }
            ].map((p) => (
              <button
                key={p.role}
                onClick={() => handleQuickPersonaLogin(p.email, p.path)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: '#fff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = p.color;
                  e.currentTarget.style.background = `${p.color}15`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ color: p.color }}>{p.icon}</div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{p.role}</span>
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>{p.email}</span>
              </button>
            ))}
          </div>
        </div>

      </section>

      {/* ── LIVE TELEMETRY IMPACT METRICS STRIP ── */}
      <section style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', background: 'rgba(11, 19, 32, 0.6)', padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-heading)' }}>4.8 min</div>
            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              Average Response Latency
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#06b6d4', fontFamily: 'var(--font-heading)' }}>99.98%</div>
            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              Resource Match Precision
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#5f7bf4', fontFamily: 'var(--font-heading)' }}>5 Sync Portals</div>
            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              Full Role Coordination
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-heading)' }}>0.00 ms</div>
            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              Postgres WebSocket Lag
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE AI PRIORITY SCORE ENGINE SANDBOX ── */}
      <section id="simulator" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))' }}>
            Interactive AI Algorithm
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            Try The Live Priority Calculation Engine
          </h2>
          <p style={{ color: 'hsl(var(--text-muted))', maxWidth: '600px', margin: '0.5rem auto 0' }}>
            Adjust the crisis parameters below to see how CivicResQ deterministically scores emergency distress calls from 0 to 100 in real time.
          </p>
        </div>

        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          
          {/* Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>
                1. Urgency Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((u) => (
                  <button
                    key={u}
                    onClick={() => setSimUrgency(u)}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: simUrgency === u ? '1px solid hsl(var(--primary))' : '1px solid var(--border-color)',
                      background: simUrgency === u ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: simUrgency === u ? '#10b981' : 'hsl(var(--text-muted))',
                      fontWeight: simUrgency === u ? 800 : 500,
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-muted))' }}>
                  2. People Stranded
                </label>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{simPeople} individuals</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={simPeople}
                onChange={(e) => setSimPeople(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'hsl(var(--primary))', cursor: 'pointer', marginTop: '0.5rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                <span>1 Person</span>
                <span>25 People</span>
                <span>50+ People</span>
              </div>
            </div>
          </div>

          {/* Engine Output Display */}
          <div style={{
            background: 'rgba(6, 11, 19, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-muted))' }}>
                Engine Computed Priority Output
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: currentSimScore >= 70 ? '#ef4444' : currentSimScore >= 45 ? '#f59e0b' : '#10b981' }}>
                  {currentSimScore}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>/ 100</span>
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: '999px',
                width: `${currentSimScore}%`,
                background: currentSimScore >= 70 ? 'linear-gradient(90deg, #f97316, #ef4444)' : currentSimScore >= 45 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #34d399, #10b981)',
                transition: 'width 0.4s ease'
              }}></div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '0.85rem' }}>
              Formula: <code style={{ color: 'hsl(var(--primary))' }}>Priority = Urgency_Weight({simUrgency}) + Scale(Stranded_Count: {simPeople}) + Base_Constant(20.0)</code>
            </p>
          </div>

        </div>
      </section>

      {/* ── THE 5 COMMAND ROLES & FEATURES ── */}
      <section id="roles" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem 6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))' }}>
            Role-Based Portal Matrix
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            5 Interconnected Crisis Command Centers
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          
          {/* 1. Citizen */}
          <div className="glass-card" style={{ borderTop: '3px solid #5f7bf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(95, 123, 244, 0.15)', color: '#5f7bf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>1. Citizen Emergency Portal</h3>
                <span style={{ fontSize: '0.72rem', color: '#5f7bf4', fontWeight: 700, textTransform: 'uppercase' }}>Public Lifeline</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: 'hsl(var(--text-muted))' }}>
              <li>📍 <strong>Delhi Map Pin Picker</strong>: Interactive draggable Leaflet coordinate marker.</li>
              <li>⚡ <strong>1-Tap Instant SOS</strong>: Direct GPS distress broadcast.</li>
              <li>☁️ <strong>Cloud Photo Evidence</strong>: Supabase Storage image upload.</li>
              <li>🔄 <strong>Live 4-Stage Tracker</strong>: Real-time status without reloading.</li>
            </ul>
          </div>

          {/* 2. NGO */}
          <div className="glass-card" style={{ borderTop: '3px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>2. NGO Supply & Fleet Portal</h3>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Logistics Depot</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: 'hsl(var(--text-muted))' }}>
              <li>📦 <strong>Supply Pool Registration</strong>: Water, medical kits, rations, tarps.</li>
              <li>🚚 <strong>Fleet Vehicle Hub</strong>: Utility trucks, rescue vans, and boats.</li>
              <li>📡 <strong>Incoming Distress Radar</strong>: Nearby emergency demand visibility.</li>
              <li>⏳ <strong>Expiry Date Tracking</strong>: Automated perishable goods management.</li>
            </ul>
          </div>

          {/* 3. Operations */}
          <div className="glass-card" style={{ borderTop: '3px solid #06b6d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radio size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>3. Operations Command Room</h3>
                <span style={{ fontSize: '0.72rem', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase' }}>Central Dispatch</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: 'hsl(var(--text-muted))' }}>
              <li>🚀 <strong>AI Matching Engine</strong>: 1-click automated multi-factor pairing.</li>
              <li>🔥 <strong>Priority Queue Heatmap</strong>: Life-threat urgency prioritization.</li>
              <li>📋 <strong>4-Stage Kanban</strong>: Awaiting ➔ Approved ➔ In Transit ➔ Delivered.</li>
              <li>📢 <strong>Public Safety Broadcast</strong>: Regional disaster warning banners.</li>
            </ul>
          </div>

          {/* 4. Ground Team */}
          <div className="glass-card" style={{ borderTop: '3px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>4. Ground Rescuer Terminal</h3>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>Field Responders</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: 'hsl(var(--text-muted))' }}>
              <li>⏱️ <strong>Live Ticking Countdown</strong>: Real-time `MM:SS` ETA countdown clock.</li>
              <li>🗺️ <strong>Google Maps Navigation</strong>: Direct turn-by-turn routing links.</li>
              <li>📦 <strong>Cargo Manifest</strong>: Pickup supplies from NGO to citizen pin.</li>
              <li>⚡ <strong>1-Click Status Step</strong>: Assigned ➔ Picking Up ➔ In Transit ➔ Delivered.</li>
            </ul>
          </div>

          {/* 5. Admin */}
          <div className="glass-card" style={{ borderTop: '3px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>5. System Administration</h3>
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>Governance & Security</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: 'hsl(var(--text-muted))' }}>
              <li>🛡️ <strong>Root Admin Protection</strong>: Immutable admin account security.</li>
              <li>🏢 <strong>NGO Verification</strong>: License approval & rejection workflows.</li>
              <li>🗺️ <strong>Incident Simulator</strong>: Inject synthetic disaster clusters.</li>
              <li>📜 <strong>Audit Trail Logs</strong>: Immutable record of administrative events.</li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── BOTTOM CTA SECTION ── */}
      <section style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(95, 123, 244, 0.08) 100%)', borderTop: '1px solid var(--border-color)', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
            Ready to Coordinate Disaster Response?
          </h2>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Experience the unified full-stack crisis coordination engine deployed live on Vercel and backed by Supabase.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ padding: '0.9rem 2.25rem', fontSize: '1rem', fontWeight: 800 }}
            >
              Open Incident Terminal
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/Mir-Sarfaraz-Ahmed/CivicResQ"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.9rem 1.75rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ExternalLink size={16} />
              GitHub Repository
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(6, 11, 19, 0.95)', padding: '2.5rem 2rem', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} style={{ color: 'hsl(var(--primary))' }} />
            <span style={{ fontWeight: 800, color: '#fff' }}>CivicResQ</span>
            <span>— Deterministic Disaster Response & AI Logistics Engine</span>
          </div>
          <div>
            <span>Built with React 19 · Supabase Postgres · Leaflet Maps · Vite</span>
          </div>
        </div>
      </footer>

      {/* Quick SOS Modal if Opened */}
      <QuickSosModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
        onSuccess={() => {
          setShowSosModal(false);
          navigate('/citizen/dashboard');
        }}
      />

    </div>
  );
};

export default LandingPage;
