import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext({});

// Pre-seeded mock users for instant testing in local/mock mode
const MOCK_USERS = {
  // Gmail addresses (Primary Demo)
  'admin@gmail.com': {
    id: 'mock-admin-uuid',
    email: 'admin@gmail.com',
    role: 'ADMIN',
    full_name: 'Root Administrator',
    phone: '+91 98765 43210',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },
  'ops@gmail.com': {
    id: 'mock-ops-uuid',
    email: 'ops@gmail.com',
    role: 'OPERATIONS',
    full_name: 'Olivia Operations',
    phone: '+91 98765 43211',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },
  'ground@gmail.com': {
    id: 'mock-ground-uuid',
    email: 'ground@gmail.com',
    role: 'GROUND_TEAM',
    full_name: 'Gary Ground Rescuer',
    phone: '+91 98765 43212',
    is_active: true,
    organization_id: 'mock-org-approved-uuid',
    org_name: 'Global Relief Corp',
    org_status: 'APPROVED'
  },
  'ngo@gmail.com': {
    id: 'mock-ngo-uuid',
    email: 'ngo@gmail.com',
    role: 'NGO',
    full_name: 'Sarah NGO Director',
    phone: '+91 98765 43213',
    is_active: true,
    organization_id: 'mock-org-approved-uuid',
    org_name: 'Global Relief Corp',
    org_status: 'APPROVED'
  },
  'ngo-pending@gmail.com': {
    id: 'mock-ngo-pending-uuid',
    email: 'ngo-pending@gmail.com',
    role: 'NGO',
    full_name: 'Mark NGO Pending',
    phone: '+91 98765 43214',
    is_active: true,
    organization_id: 'mock-org-pending-uuid',
    org_name: 'Hope Initiative',
    org_status: 'PENDING'
  },
  'citizen@gmail.com': {
    id: 'mock-citizen-uuid',
    email: 'citizen@gmail.com',
    role: 'CITIZEN',
    full_name: 'John Citizen',
    phone: '+91 98765 43215',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },

  // Fallback Example.com aliases
  'admin@example.com': {
    id: 'mock-admin-uuid',
    email: 'admin@example.com',
    role: 'ADMIN',
    full_name: 'Root Administrator',
    phone: '+91 98765 43210',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },
  'ops@example.com': {
    id: 'mock-ops-uuid',
    email: 'ops@example.com',
    role: 'OPERATIONS',
    full_name: 'Olivia Operations',
    phone: '+91 98765 43211',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },
  'ground@example.com': {
    id: 'mock-ground-uuid',
    email: 'ground@example.com',
    role: 'GROUND_TEAM',
    full_name: 'Gary Ground Rescuer',
    phone: '+91 98765 43212',
    is_active: true,
    organization_id: 'mock-org-approved-uuid',
    org_name: 'Global Relief Corp',
    org_status: 'APPROVED'
  },
  'ngo@example.com': {
    id: 'mock-ngo-uuid',
    email: 'ngo@example.com',
    role: 'NGO',
    full_name: 'Sarah NGO Director',
    phone: '+91 98765 43213',
    is_active: true,
    organization_id: 'mock-org-approved-uuid',
    org_name: 'Global Relief Corp',
    org_status: 'APPROVED'
  },
  'citizen@example.com': {
    id: 'mock-citizen-uuid',
    email: 'citizen@example.com',
    role: 'CITIZEN',
    full_name: 'John Citizen',
    phone: '+91 98765 43215',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(!isSupabaseConfigured);

  // Initialize Auth
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Mock mode initialization
      const storedMockUser = localStorage.getItem('mock_user_session');
      if (storedMockUser) {
        const mockProfile = JSON.parse(storedMockUser);
        setUser({ id: mockProfile.id, email: mockProfile.email });
        setProfile(mockProfile);
      }
      setLoading(false);
      return;
    }

    // Live Supabase initialization
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching initial session:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile details from Supabase
  const fetchProfile = async (uid, overrideEmail) => {
    try {
      const email = (overrideEmail || user?.email || '').toLowerCase().trim();
      const isAdminEmail = email === 'admin@gmail.com' || email === 'admin@example.com';
      const isOpsEmail = email === 'ops@gmail.com' || email === 'ops@example.com';
      const isGroundEmail = email === 'ground@gmail.com' || email === 'ground@example.com';
      const isNgoEmail = email === 'ngo@gmail.com' || email === 'ngo@example.com';

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (profileError) {
        console.error('Error fetching profile from DB:', profileError);
        // Fallback default based on known admin/staff email
        const defaultRole = isAdminEmail ? 'ADMIN' : isOpsEmail ? 'OPERATIONS' : isGroundEmail ? 'GROUND_TEAM' : isNgoEmail ? 'NGO' : 'CITIZEN';
        const fallbackProfile = {
          id: uid,
          email,
          role: defaultRole,
          full_name: defaultRole === 'ADMIN' ? 'Root Administrator' : 'Citizen User',
          is_active: true,
          organization_id: null
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }

      // Enforce admin role if email is admin@gmail.com
      let resolvedRole = profileData.role;
      if (isAdminEmail && resolvedRole !== 'ADMIN') {
        resolvedRole = 'ADMIN';
        // Auto sync role in profiles table
        supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', uid).then();
      }

      // If user has an organization, fetch its status/name
      let fullProfile;
      if (profileData && profileData.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name, status')
          .eq('id', profileData.organization_id)
          .single();

        fullProfile = {
          ...profileData,
          email,
          role: resolvedRole,
          org_name: orgData?.name || null,
          org_status: orgData?.status || null
        };
      } else {
        fullProfile = {
          ...profileData,
          email,
          role: resolvedRole,
          org_name: null,
          org_status: null
        };
      }

      setProfile(fullProfile);
      return fullProfile;
    } catch (err) {
      console.error('Failed to resolve profile details:', err);
    }
  };

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    const userKey = (email || '').toLowerCase().trim();

    if (isMock) {
      // Mock login handling
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockProfile = MOCK_USERS[userKey] || {
            id: 'mock-dynamic-uuid-' + Math.random(),
            email: userKey,
            role: userKey.includes('admin') ? 'ADMIN' : userKey.includes('ops') ? 'OPERATIONS' : userKey.includes('ground') ? 'GROUND_TEAM' : userKey.includes('ngo') ? 'NGO' : 'CITIZEN',
            full_name: userKey.includes('admin') ? 'Root Administrator' : 'Dynamic Test User',
            phone: '',
            is_active: true,
            organization_id: null,
            org_name: null,
            org_status: null
          };

          localStorage.setItem('mock_user_session', JSON.stringify(mockProfile));
          setUser({ id: mockProfile.id, email: mockProfile.email });
          setProfile(mockProfile);
          setLoading(false);
          resolve({ user: mockProfile, profile: mockProfile, data: mockProfile, error: null });
        }, 300);
      });
    }

    // Live Supabase Login
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: userKey, password });
      if (error) throw error;
      
      const loadedProfile = await fetchProfile(data.user.id, userKey);
      return { data, user: data.user, profile: loadedProfile, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, user: null, profile: null, error };
    }
  };

  // Sign up handler
  const signUp = async (email, password, metadata) => {
    setLoading(true);
    const { fullName, phone, role, orgName } = metadata;

    if (isMock) {
      // Mock signup handling
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const userKey = email.toLowerCase().trim();
          let orgId = null;
          let orgStatus = null;

          if (role === 'NGO') {
            orgId = 'mock-org-dynamic-' + Math.random();
            orgStatus = 'PENDING';
          }

          const newProfile = {
            id: 'mock-dynamic-' + Math.random(),
            email: userKey,
            role: role || 'CITIZEN',
            full_name: fullName || 'New User',
            phone: phone || '',
            is_active: true,
            organization_id: orgId,
            org_name: orgName || null,
            org_status: orgStatus
          };

          // Store temporarily in mock memory users
          MOCK_USERS[userKey] = newProfile;
          localStorage.setItem('mock_user_session', JSON.stringify(newProfile));
          setUser({ id: newProfile.id, email: newProfile.email });
          setProfile(newProfile);
          setLoading(false);
          resolve({ user: { id: newProfile.id, email: newProfile.email }, error: null });
        }, 1000);
      });
    }

    // Live Supabase Sign Up
    try {
      // 1. Sign up user - database trigger handle_new_user defaults role to CITIZEN securely
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (error) throw error;

      // 2. If registering as an NGO and session is created (auto-login), submit NGO application
      if (data?.session && role === 'NGO' && orgName) {
        const { error: rpcErr } = await supabase.rpc('submit_ngo_application', { org_name: orgName });
        if (rpcErr) throw rpcErr;
      }

      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error };
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    if (isMock) {
      return new Promise((resolve) => {
        setTimeout(() => {
          localStorage.removeItem('mock_user_session');
          setUser(null);
          setProfile(null);
          setLoading(false);
          resolve();
        }, 500);
      });
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  // Login via OAuth (only supported in live Supabase mode)
  const loginWithGoogle = async () => {
    if (isMock) {
      // Mock OAuth login - auto log in as citizen
      return login('citizen@example.com', 'password');
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    isMock,
    login,
    signUp,
    logout,
    loginWithGoogle,
    setIsMock,
    refetchProfile: async () => {
      if (user && !isMock) {
        await fetchProfile(user.id);
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
