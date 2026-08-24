import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Shield, ChevronLeft, ChevronRight, Upload, MapPin, 
  AlertTriangle, Users, FileText, PhoneCall, HelpCircle, 
  Droplet, Flame, HeartPulse, Home, Radio, Sparkles, Plus, LogOut,
  Mail, MessageSquare, ShieldCheck, CheckCircle2, Copy, Navigation, Check
} from 'lucide-react';
import EmergencyBroadcastBanner from '../../components/EmergencyBroadcastBanner';

// Default Coordinates: Central Delhi, India (India Gate / Central Secretariat area)
const DELHI_LAT = 28.6139;
const DELHI_LNG = 77.2090;

const CATEGORIES = [
  { id: 'flooding', name: 'Flooding & Water', icon: <Droplet /> },
  { id: 'fire', name: 'Active Fire', icon: <Flame /> },
  { id: 'medical', name: 'Medical Emergency', icon: <HeartPulse /> },
  { id: 'shelter', name: 'Shelter Collapse', icon: <Home /> },
  { id: 'utility', name: 'Power / Utility Out', icon: <Radio /> },
  { id: 'other', name: 'Other Distress', icon: <HelpCircle /> }
];

const CitizenReport = () => {
  const navigate = useNavigate();
  const { user, profile, logout, isMock } = useAuth();
  
  // Wizard State with LocalStorage Persistence Recovery
  const [step, setStep] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).step || 1;
    } catch {}
    return 1;
  });

  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markerInstance = useRef(null);

  const [category, setCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).category || 'flooding';
    } catch {}
    return 'flooding';
  });

  const [urgency, setUrgency] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).urgency || 'MEDIUM';
    } catch {}
    return 'MEDIUM';
  });

  const [description, setDescription] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).description || '';
    } catch {}
    return '';
  });

  const [peopleAffected, setPeopleAffected] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).peopleAffected || 1;
    } catch {}
    return 1;
  });

  const [latitude, setLatitude] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved && JSON.parse(saved).latitude) return JSON.parse(saved).latitude;
    } catch {}
    return DELHI_LAT;
  });

  const [longitude, setLongitude] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved && JSON.parse(saved).longitude) return JSON.parse(saved).longitude;
    } catch {}
    return DELHI_LNG;
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [contactMethod, setContactMethod] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).contactMethod || 'PHONE';
    } catch {}
    return 'PHONE';
  });

  // Contact info starts clean and empty with placeholder guidance
  const [contactInfo, setContactInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_report_draft');
      if (saved) return JSON.parse(saved).contactInfo || '';
    } catch {}
    return '';
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Save form draft automatically on change
  useEffect(() => {
    if (!submittedReport) {
      const draft = {
        step, category, urgency, description, peopleAffected,
        latitude, longitude, contactMethod, contactInfo
      };
      localStorage.setItem('citizen_report_draft', JSON.stringify(draft));
    }
  }, [step, category, urgency, description, peopleAffected, latitude, longitude, contactMethod, contactInfo, submittedReport]);

  // Try fetching Browser Geolocation if no custom coordinates were saved
  useEffect(() => {
    const saved = localStorage.getItem('citizen_report_draft');
    if (!saved && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(parseFloat(position.coords.latitude.toFixed(6)));
          setLongitude(parseFloat(position.coords.longitude.toFixed(6)));
        },
        () => console.log('Geolocation defaulted to Delhi, India coordinates.')
      );
    }
  }, []);

  // Initialize Map in Step 2 centered on Delhi, India
  useEffect(() => {
    if (step === 2 && mapRef.current && window.L) {
      const timer = setTimeout(() => {
        if (leafletMapInstance.current) {
          leafletMapInstance.current.remove();
        }

        const map = window.L.map(mapRef.current).setView([latitude, longitude], 13);
        leafletMapInstance.current = map;

        // Dark Theme Tile Layer
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        // Add Draggable Marker
        const marker = window.L.marker([latitude, longitude], {
          draggable: true
        }).addTo(map);
        markerInstance.current = marker;

        marker.bindPopup(`
          <div style="color:#000; font-family:sans-serif; padding:0.2rem;">
            <strong>Emergency Pin Location</strong><br/>
            <span>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}</span>
          </div>
        `);

        // Listen for drag end
        marker.on('dragend', () => {
          const latLng = marker.getLatLng();
          const newLat = parseFloat(latLng.lat.toFixed(6));
          const newLng = parseFloat(latLng.lng.toFixed(6));
          setLatitude(newLat);
          setLongitude(newLng);
        });

        // Listen for map clicks
        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          setLatitude(newLat);
          setLongitude(newLng);
        });

      }, 100);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1 && !description.trim()) {
      setErrorMsg('Please describe the emergency situation to assist first responders.');
      return;
    }
    if (step === 4 && !contactInfo.trim()) {
      setErrorMsg('Please enter your contact details before submitting.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => prev - 1);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleResetForm = () => {
    localStorage.removeItem('citizen_report_draft');
    setSubmittedReport(null);
    setStep(1);
    setCategory('flooding');
    setUrgency('MEDIUM');
    setDescription('');
    setPeopleAffected(1);
    setLatitude(DELHI_LAT);
    setLongitude(DELHI_LNG);
    setImageFile(null);
    setImagePreview(null);
    setContactMethod('PHONE');
    setContactInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const selectedCategory = CATEGORIES.find(c => c.id === category)?.name || 'Other';
      const calculatedScore = parseFloat((
        (urgency === 'CRITICAL' ? 40 : urgency === 'HIGH' ? 25 : urgency === 'MEDIUM' ? 15 : 5) + 
        Math.min(parseInt(peopleAffected, 10) * 3.5, 35) + 
        20.0
      ).toFixed(1));

      if (isMock) {
        // Mock Form Submission
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const newReport = {
          id: 'REQ-' + Math.floor(100000 + Math.random() * 900000),
          description,
          lat: latitude,
          lng: longitude,
          people_affected: parseInt(peopleAffected, 10),
          urgency,
          category: selectedCategory,
          priority_score: calculatedScore,
          status: 'UNDER_REVIEW',
          contact_method: contactMethod,
          contact_info: contactInfo,
          created_at: new Date().toISOString()
        };

        const stored = localStorage.getItem('mock_citizen_requests');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newReport);
        localStorage.setItem('mock_citizen_requests', JSON.stringify(list));

        // Clear draft & set confirmation screen state
        localStorage.removeItem('citizen_report_draft');
        setSubmittedReport(newReport);
      } else {
        // Live Supabase database insertion
        if (!user) throw new Error('Session expired. Please log in.');

        // 1. Insert emergency_requests
        const { data: requestData, error: requestErr } = await supabase
          .from('emergency_requests')
          .insert([{
            reported_by: user.id,
            description,
            lat: latitude,
            lng: longitude,
            people_affected: parseInt(peopleAffected, 10),
            urgency,
            category: selectedCategory,
            contact_method: contactMethod,
            contact_info: contactInfo,
            status: 'UNDER_REVIEW'
          }])
          .select()
          .single();

        if (requestErr) throw requestErr;

        // 2. Insert request_items automatically based on category
        let defaultResourceNeeded = 'Water & Supplies';
        if (category === 'fire') defaultResourceNeeded = 'Fire Suppression / Blankets';
        if (category === 'medical') defaultResourceNeeded = 'Emergency Trauma Kits';
        if (category === 'shelter') defaultResourceNeeded = 'Tarps / Temporary Shelter';
        if (category === 'utility') defaultResourceNeeded = 'Power Generator';

        await supabase
          .from('request_items')
          .insert([{
            request_id: requestData.id,
            resource_type: defaultResourceNeeded,
            quantity_required: 1,
            quantity_fulfilled: 0
          }]);

        // 3. Photo upload if file selected
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${requestData.id}_evidence.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from('emergency-evidence')
            .upload(filePath, imageFile);

          if (uploadErr) {
            console.warn('Storage upload warning:', uploadErr.message);
          }
        }

        // 4. Calculate initial priority score
        await supabase.rpc('calculate_priority', { req_id: requestData.id });

        // Clear draft & set confirmation screen state
        localStorage.removeItem('citizen_report_draft');
        setSubmittedReport({
          ...requestData,
          category: selectedCategory,
          priority_score: calculatedScore
        });
      }
    } catch (err) {
      console.error('Distress report submission failure:', err);
      setErrorMsg(err.message || 'Distress submission failed. Please verify network connection.');
    } finally {
      setSubmitting(false);
    }
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
                <Link to="/citizen/dashboard" className="nav-item">
                  <Radio />
                  Active Trackers
                </Link>
              </li>
              <li>
                <Link to="/citizen/report" className="nav-item active">
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
          <button onClick={handleLogout} className="btn btn-secondary btn-block">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="main-content">
        {/* Emergency Broadcast Banner */}
        <EmergencyBroadcastBanner />

        {/* ── SUCCESSFUL SUBMISSION CONFIRMATION SCREEN ── */}
        {submittedReport ? (
          <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
            <div className="glass-panel" style={{ padding: '2.5rem 2rem', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Header Status Beacon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={30} />
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#10b981' }}>
                    DISTRESS SIGNAL LOGGED
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginTop: '0.15rem' }}>
                    Emergency Report Transmitted
                  </h2>
                </div>
              </div>

              {/* Reference ID & Priority Banner */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.75rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                    Tracking Reference ID
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
                      {submittedReport.id}
                    </code>
                    <button
                      onClick={() => handleCopyId(submittedReport.id)}
                      style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Copy Reference ID"
                    >
                      {copiedId ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                    Calculated Priority Score
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: submittedReport.priority_score >= 60 ? '#ef4444' : '#f59e0b' }}>
                      {submittedReport.priority_score?.toFixed(1) || '85.0'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>/ 100</span>
                  </div>
                </div>
              </div>

              {/* Protocol Status Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Current Status</span>
                  <span className="status-pill status-under_review">UNDER REVIEW · IN MATCHING QUEUE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Category & Urgency</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{submittedReport.category} ({submittedReport.urgency})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Location Coordinates</span>
                  <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>
                    📍 {submittedReport.lat?.toFixed(4)}, {submittedReport.lng?.toFixed(4)} (Delhi Region)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>People Reported</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{submittedReport.people_affected} affected</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/citizen/dashboard')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.25rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                >
                  <Radio size={16} />
                  Track Live Response Status
                </button>
                <button
                  onClick={handleResetForm}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.25rem' }}
                >
                  Submit Another Report
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* ── 4-STEP REPORTING WIZARD ── */
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Link to="/citizen/dashboard" style={{ color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <ChevronLeft size={16} />
                Back to Dashboard
              </Link>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>Report Local Distress</h1>

            {/* Wizard Header Progress Node Bar */}
            <div className="wizard-header">
              <div 
                className="wizard-progress-bar"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              ></div>

              <div className={`wizard-step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                <div className="wizard-step-circle">1</div>
                <span className="wizard-step-label">Intake</span>
              </div>
              <div className={`wizard-step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                <div className="wizard-step-circle">2</div>
                <span className="wizard-step-label">Location</span>
              </div>
              <div className={`wizard-step-node ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                <div className="wizard-step-circle">3</div>
                <span className="wizard-step-label">Evidence</span>
              </div>
              <div className={`wizard-step-node ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
                <div className="wizard-step-circle">4</div>
                <span className="wizard-step-label">Submit</span>
              </div>
            </div>

            {errorMsg && (
              <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className="info-banner-icon" style={{ color: '#ef4444' }}>
                  <AlertTriangle size={18} />
                </div>
                <div className="info-banner-content">
                  <div className="info-banner-title">Validation Error</div>
                  <div>{errorMsg}</div>
                </div>
              </div>
            )}

            {/* Step 1: Intake info */}
            {step === 1 && (
              <div className="wizard-step-content">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Step 1: What is the nature of the emergency?</h2>
                
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <div className="category-picker-grid">
                    {CATEGORIES.map((cat) => (
                      <div 
                        key={cat.id}
                        className={`category-card ${category === cat.id ? 'selected' : ''}`}
                        onClick={() => setCategory(cat.id)}
                      >
                        <div className="category-icon">{cat.icon}</div>
                        <span className="category-title">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Urgency Priority Level</label>
                  <div className="urgency-picker">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((lvl) => (
                      <div
                        key={lvl}
                        className={`urgency-option urgency-option-${lvl.toLowerCase()} ${urgency === lvl ? 'selected' : ''}`}
                        onClick={() => setUrgency(lvl)}
                      >
                        {lvl}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label" htmlFor="description">Describe what is happening *</label>
                  <textarea
                    id="description"
                    className="form-input form-input-noicon"
                    rows={4}
                    placeholder="Provide details (e.g. 'Flash flooding on Main Road near Sector 4, water level 4ft and rising. 4 family members stranded on 1st floor.')"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label" htmlFor="peopleAffected">Estimated People Stranded / Affected</label>
                  <div className="input-wrapper">
                    <Users className="input-icon" />
                    <input
                      id="peopleAffected"
                      type="number"
                      min={1}
                      className="form-input"
                      value={peopleAffected}
                      onChange={(e) => setPeopleAffected(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Set Location (Defaults to Delhi, India) */}
            {step === 2 && (
              <div className="wizard-step-content">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Step 2: Map Disaster Location (Delhi, India Region)</h2>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Drag the marker or click on the map to pinpoint the exact location of distress.
                </p>

                <div className="map-picker-container" style={{ height: '380px', borderRadius: '12px', overflow: 'hidden' }}>
                  <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                  <div className="map-coords-badge">
                    📍 Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)} (Delhi Pin)
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Photo Evidence */}
            {step === 3 && (
              <div className="wizard-step-content">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Step 3: Upload Photo Evidence (Optional)</h2>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  If safe to do so, upload an image of the event to help coordinators dispatch correct vehicle assets.
                </p>

                {!imagePreview ? (
                  <label className="upload-dropzone">
                    <Upload />
                    <div>
                      <p style={{ fontWeight: 600, color: '#fff' }}>Click to upload file</p>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>PNG, JPG or JPEG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="upload-preview">
                      <img src={imagePreview} alt="Evidence preview" />
                      <button 
                        type="button" 
                        className="upload-preview-remove"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        &times;
                      </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '1rem' }}>
                      {imageFile?.name}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Verification & Contact with Dynamic Icon & Placeholder */}
            {step === 4 && (
              <div className="wizard-step-content">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Step 4: Contact & Confirm Submission</h2>

                <div className="form-group">
                  <label className="form-label">Contact Method Preference</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    {[
                      { id: 'PHONE', label: 'Phone Call', icon: <PhoneCall size={14} /> },
                      { id: 'SMS', label: 'SMS Text', icon: <MessageSquare size={14} /> },
                      { id: 'EMAIL', label: 'Email', icon: <Mail size={14} /> }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="btn"
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          background: contactMethod === m.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: contactMethod === m.id ? '1px solid hsl(var(--primary))' : '1px solid var(--border-color)',
                          color: contactMethod === m.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                          fontWeight: contactMethod === m.id ? 700 : 500
                        }}
                        onClick={() => setContactMethod(m.id)}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label" htmlFor="contactInfo">
                    {contactMethod === 'EMAIL' 
                      ? 'Email Address for Status Updates *' 
                      : contactMethod === 'SMS' 
                        ? 'Mobile Number for SMS Broadcasts *' 
                        : 'Phone Number for Direct Rescue Callbacks *'}
                  </label>
                  <div className="input-wrapper">
                    {contactMethod === 'EMAIL' ? (
                      <Mail className="input-icon" />
                    ) : contactMethod === 'SMS' ? (
                      <MessageSquare className="input-icon" />
                    ) : (
                      <PhoneCall className="input-icon" />
                    )}
                    <input
                      id="contactInfo"
                      type={contactMethod === 'EMAIL' ? 'email' : 'tel'}
                      className="form-input"
                      placeholder={
                        contactMethod === 'EMAIL'
                          ? 'citizen.report@example.com'
                          : contactMethod === 'SMS'
                            ? '+91 98765 43210 (Mobile for SMS alerts)'
                            : '+91 98765 43210 (Direct Rescue Callback)'
                      }
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Review card panel */}
                <div className="glass-card" style={{ marginTop: '2rem', padding: '1.25rem', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={16} />
                    Summary Review Panel
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>Category:</span>
                      <p style={{ fontWeight: 600, color: '#fff' }}>{CATEGORIES.find(c => c.id === category)?.name}</p>
                    </div>
                    <div>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>Urgency priority:</span>
                      <p style={{ fontWeight: 600, color: '#fff' }}>{urgency}</p>
                    </div>
                    <div>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>Location (Delhi Pin):</span>
                      <p style={{ fontWeight: 600, color: '#fff' }}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
                    </div>
                    <div>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>People Stranded:</span>
                      <p style={{ fontWeight: 600, color: '#fff' }}>{peopleAffected} individuals</p>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Incident Description:</span>
                    <p style={{ color: '#fff', fontStyle: 'italic', marginTop: '0.25rem', wordBreak: 'break-word' }}>"{description || 'No description entered'}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="wizard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrevStep}
                disabled={step === 1 || submitting}
              >
                Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextStep}
                >
                  Continue
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #059669 100%)' }}
                >
                  {submitting ? 'Transmitting Distress Signal...' : 'Transmit Distress Signal'}
                </button>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default CitizenReport;
