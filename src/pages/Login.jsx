import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, Briefcase, Landmark, Shield, AlertTriangle } from 'lucide-react';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('CITIZEN'); // For signup: CITIZEN or NGO
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const { login, signUp, loginWithGoogle, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target after auth succeeds
  const from = location.state?.from?.pathname || null;

  const handleRouteRedirect = (resolvedProfile) => {
    if (!resolvedProfile) {
      navigate('/unauthorized');
      return;
    }

    if (resolvedProfile.is_active === false) {
      navigate('/unauthorized');
      return;
    }

    // Direct dashboard routing based on role
    switch (resolvedProfile.role) {
      case 'CITIZEN':
        navigate(from || '/citizen/dashboard');
        break;
      case 'NGO':
        if (resolvedProfile.org_status === 'APPROVED') {
          navigate(from || '/ngo/dashboard');
        } else {
          // Pending/rejected NGO goes to unauthorized state page
          navigate('/unauthorized');
        }
        break;
      case 'GROUND_TEAM':
        navigate(from || '/ground/dashboard');
        break;
      case 'OPERATIONS':
        navigate(from || '/operations/dashboard');
        break;
      case 'ADMIN':
        navigate(from || '/admin/dashboard');
        break;
      default:
        navigate('/unauthorized');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingLocal(true);

    if (!email || !password) {
      setErrorMsg('Please fill in all email and password fields.');
      setLoadingLocal(false);
      return;
    }

    try {
      if (isSignUp) {
        // Signup Flow
        const metadata = {
          fullName,
          phone,
          role,
          orgName: role === 'NGO' ? orgName : null
        };

        const { data, error } = await signUp(email, password, metadata);
        if (error) throw error;
        
        if (isMock) {
          // Mock signup auto-logs in and provides profile details
          setSuccessMsg('Account registered successfully! Logging you in...');
          setTimeout(() => {
            handleRouteRedirect(data || { role: 'CITIZEN', is_active: true });
          }, 800);
        } else {
          setSuccessMsg('Registration successful! Please check your email inbox to verify your account.');
          // Reset form fields
          setIsSignUp(false);
        }
      } else {
        // Login Flow
        const { data, error } = await login(email, password);
        if (error) throw error;

        // Fetch the profile for route redirection.
        // If in mock mode, login response data is the profile directly.
        if (isMock) {
          handleRouteRedirect(data);
        } else {
          // In live mode, AuthContext handles session state setting automatically.
          // Wait for context state to settle and redirect to root coordinator.
          setTimeout(() => {
            navigate('/');
          }, 200);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoadingLocal(false);
    }
  };

  // Shortcut for demo login
  const triggerQuickLogin = async (demoEmail) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingLocal(true);
    try {
      const { data, error } = await login(demoEmail, 'password');
      if (error) throw error;
      handleRouteRedirect(data);
    } catch (err) {
      setErrorMsg('Quick login failed: ' + err.message);
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="bg-glow-layer">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield />
          </div>
          <h1 className="auth-title">CivicResQ</h1>
          <p className="auth-subtitle">
            {isSignUp ? 'Create a secure logistics profile' : 'Disaster Coordination Gateway'}
          </p>
        </div>

        {errorMsg && (
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="info-banner-icon" style={{ color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Authentication Error</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="info-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="info-banner-icon" style={{ color: '#10b981' }}>
              <Shield size={18} />
            </div>
            <div className="info-banner-content">
              <div className="info-banner-title">Success</div>
              <div>{successMsg}</div>
            </div>
          </div>
        )}

        {/* Tab selection for Log In vs Sign Up */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button 
            type="button"
            className="btn"
            style={{ 
              flex: 1, 
              background: !isSignUp ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              color: !isSignUp ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
              border: !isSignUp ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent',
              padding: '0.6rem'
            }}
            onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
          >
            Log In
          </button>
          <button 
            type="button"
            className="btn"
            style={{ 
              flex: 1, 
              background: isSignUp ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              color: isSignUp ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
              border: isSignUp ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent',
              padding: '0.6rem'
            }}
            onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <>
              {/* Role Selection for Sign Up */}
              <div className="form-group">
                <label className="form-label">Profile Purpose</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                      background: role === 'CITIZEN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: role === 'CITIZEN' ? '1px solid hsl(var(--primary))' : '1px solid var(--border-color)',
                      color: role === 'CITIZEN' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                    }}
                    onClick={() => setRole('CITIZEN')}
                  >
                    Citizen (Needs Help)
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                      background: role === 'NGO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: role === 'NGO' ? '1px solid hsl(var(--primary))' : '1px solid var(--border-color)',
                      color: role === 'NGO' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                    }}
                    onClick={() => setRole('NGO')}
                  >
                    NGO (Resource Provider)
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    id="fullName"
                    type="text"
                    className="form-input"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Contact Number</label>
                <div className="input-wrapper">
                  <Phone className="input-icon" />
                  <input
                    id="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Organization (Only for NGO) */}
              {role === 'NGO' && (
                <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <label className="form-label" htmlFor="orgName">Organization Name</label>
                  <div className="input-wrapper">
                    <Landmark className="input-icon" />
                    <input
                      id="orgName"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Red Cross International"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '1rem' }}
            disabled={loadingLocal}
          >
            {loadingLocal ? 'Validating Credentials...' : isSignUp ? 'Create Secured Account' : 'Authenticate & Sign In'}
          </button>
        </form>

        {!isSignUp && (
          <>
            <div className="divider">or continue with</div>
            <button
              type="button"
              className="btn btn-oauth"
              onClick={loginWithGoogle}
              disabled={loadingLocal}
            >
              Sign In with Google Identity
            </button>
          </>
        )}

        {/* Developer Sandbox Panel for quick role testing in Mock Mode */}
        {isMock && (
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1rem' }}>
              <AlertTriangle size={16} />
              <span>Demo Sandbox Quick Logins</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
              Operating in Mock Mode. Click below to bypass auth and instantly log in to any role dashboard.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#5f7bf4' }}
                onClick={() => triggerQuickLogin('citizen@example.com')}
              >
                Citizen
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}
                onClick={() => triggerQuickLogin('ngo@example.com')}
              >
                NGO (Approved)
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#f59e0b' }}
                onClick={() => triggerQuickLogin('ngo-pending@example.com')}
              >
                NGO (Pending)
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#06b6d4' }}
                onClick={() => triggerQuickLogin('ground@example.com')}
              >
                Ground Team
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#a5f3fc' }}
                onClick={() => triggerQuickLogin('ops@example.com')}
              >
                Operations
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                onClick={() => triggerQuickLogin('admin@example.com')}
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
