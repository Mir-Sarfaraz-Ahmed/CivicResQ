import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext({});

// Pre-seeded mock users for instant testing in local/mock mode
const MOCK_USERS = {
  'citizen@example.com': {
    id: 'mock-citizen-uuid',
    email: 'citizen@example.com',
    role: 'CITIZEN',
    full_name: 'John Citizen',
    phone: '+1 (555) 010-0200',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },
  'ngo@example.com': {
    id: 'mock-ngo-uuid',
    email: 'ngo@example.com',
    role: 'NGO',
    full_name: 'Sarah NGO Lead',
    phone: '+1 (555) 020-0300',
    is_active: true,
    organization_id: 'mock-org-approved-uuid',
    org_name: 'Global Relief Corp',
    org_status: 'APPROVED'
  },
  'ngo-pending@example.com': {
    id: 'mock-ngo-pending-uuid',
    email: 'ngo-pending@example.com',
    role: 'NGO',
    full_name: 'Mark NGO Pending',
    phone: '+1 (555) 022-0333',
    is_active: true,
    organization_id: 'mock-org-pending-uuid',
    org_name: 'Hope Initiative',
    org_status: 'PENDING'
  },
  'ground@example.com': {
    id: 'mock-ground-uuid',
    email: 'ground@example.com',
    role: 'GROUND_TEAM',
    full_name: 'Gary Ground',
    phone: '+1 (555) 030-0400',
    is_active: true,
    organization_id: 'mock-org-approved-uuid',
    org_name: 'Global Relief Corp',
    org_status: 'APPROVED'
  },
  'ops@example.com': {
    id: 'mock-ops-uuid',
    email: 'ops@example.com',
    role: 'OPERATIONS',
    full_name: 'Olivia Operations',
    phone: '+1 (555) 040-0500',
    is_active: true,
    organization_id: null,
    org_name: null,
    org_status: null
  },
  'admin@example.com': {
    id: 'mock-admin-uuid',
    email: 'admin@example.com',
    role: 'ADMIN',
    full_name: 'Alice Admin',
    phone: '+1 (555) 050-0600',
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
  const fetchProfile = async (uid) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (profileError) {
        console.error('Error fetching profile from DB:', profileError);
        // Fallback default
        setProfile({
          id: uid,
          role: 'CITIZEN',
          is_active: true,
          organization_id: null
        });
        return;
      }

      // If user has an organization, fetch its status/name
      if (profileData && profileData.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name, status')
          .eq('id', profileData.organization_id)
          .single();

        setProfile({
          ...profileData,
          org_name: orgData?.name || null,
          org_status: orgData?.status || null
        });
      } else {
        setProfile({
          ...profileData,
          org_name: null,
          org_status: null
        });
      }
    } catch (err) {
      console.error('Failed to resolve profile details:', err);
    }
  };

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    if (isMock) {
      // Mock login handling
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const userKey = email.toLowerCase().trim();
          const mockProfile = MOCK_USERS[userKey] || {
            id: 'mock-dynamic-uuid-' + Math.random(),
            email: userKey,
            role: 'CITIZEN',
            full_name: 'Dynamic Test User',
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
          resolve({ user: { id: mockProfile.id, email: mockProfile.email }, error: null });
        }, 800);
      });
    }

    // Live Supabase Login
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error };
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
