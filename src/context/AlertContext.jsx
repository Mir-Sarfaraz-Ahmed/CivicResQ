import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const AlertContext = createContext(null);

const DEFAULT_BROADCASTS = [
  {
    id: 'broadcast-default-1',
    title: 'Flash Flood Warning — Sector 4 & Lower Basins',
    message: 'Rapidly rising water levels near coastal runoff points. Citizens in low-lying zones should prepare for evacuation to designated emergency shelters.',
    severity: 'CRITICAL', // CRITICAL | WARNING | ADVISORY | INFO
    region: 'Metropolitan Coastal Zone',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    is_active: true
  }
];

export const AlertProvider = ({ children }) => {
  const { isMock } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissed_broadcast_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetchActiveBroadcasts();

    // Supabase Realtime subscription for broadcast alerts
    if (!isMock && supabase) {
      const channel = supabase
        .channel('public:broadcast_alerts')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'broadcast_alerts' },
          () => {
            fetchActiveBroadcasts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isMock]);

  const fetchActiveBroadcasts = async () => {
    if (isMock) {
      const stored = localStorage.getItem('mock_broadcast_alerts');
      if (stored) {
        setBroadcasts(JSON.parse(stored));
      } else {
        localStorage.setItem('mock_broadcast_alerts', JSON.stringify(DEFAULT_BROADCASTS));
        setBroadcasts(DEFAULT_BROADCASTS);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('broadcast_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBroadcasts(data);
      } else {
        // Fallback to local default if table doesn't exist yet in Supabase
        const stored = localStorage.getItem('mock_broadcast_alerts');
        setBroadcasts(stored ? JSON.parse(stored) : DEFAULT_BROADCASTS);
      }
    } catch (err) {
      console.warn('Broadcast alerts query fallback:', err);
      setBroadcasts(DEFAULT_BROADCASTS);
    }
  };

  const createBroadcastAlert = async ({ title, message, severity = 'WARNING', region = 'All Sectors' }) => {
    const newAlert = {
      id: 'alert-' + Date.now(),
      title,
      message,
      severity,
      region,
      created_at: new Date().toISOString(),
      is_active: true
    };

    if (isMock) {
      const current = JSON.parse(localStorage.getItem('mock_broadcast_alerts') || '[]');
      const updated = [newAlert, ...current];
      localStorage.setItem('mock_broadcast_alerts', JSON.stringify(updated));
      setBroadcasts(updated);
      return { success: true, alert: newAlert };
    }

    try {
      const { data, error } = await supabase
        .from('broadcast_alerts')
        .insert([newAlert])
        .select();

      if (error) {
        // Fallback to local persistence if table schema is pending
        const current = JSON.parse(localStorage.getItem('mock_broadcast_alerts') || '[]');
        const updated = [newAlert, ...current];
        localStorage.setItem('mock_broadcast_alerts', JSON.stringify(updated));
        setBroadcasts(updated);
      } else {
        setBroadcasts(prev => [data[0], ...prev]);
      }
      return { success: true, alert: newAlert };
    } catch (err) {
      console.error('Error creating broadcast alert:', err);
      const current = JSON.parse(localStorage.getItem('mock_broadcast_alerts') || '[]');
      const updated = [newAlert, ...current];
      localStorage.setItem('mock_broadcast_alerts', JSON.stringify(updated));
      setBroadcasts(updated);
      return { success: true, alert: newAlert };
    }
  };

  const dismissAlert = (id) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('dismissed_broadcast_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const revokeBroadcastAlert = async (id) => {
    if (isMock) {
      const current = JSON.parse(localStorage.getItem('mock_broadcast_alerts') || '[]');
      const updated = current.filter(a => a.id !== id);
      localStorage.setItem('mock_broadcast_alerts', JSON.stringify(updated));
      setBroadcasts(updated);
      return;
    }

    try {
      await supabase
        .from('broadcast_alerts')
        .update({ is_active: false })
        .eq('id', id);
      setBroadcasts(prev => prev.filter(a => a.id !== id));
    } catch {
      setBroadcasts(prev => prev.filter(a => a.id !== id));
    }
  };

  const visibleBroadcasts = broadcasts.filter(b => b.is_active && !dismissedIds.includes(b.id));
  const activeAlert = visibleBroadcasts.length > 0 ? visibleBroadcasts[0] : null;

  return (
    <AlertContext.Provider value={{
      broadcasts,
      visibleBroadcasts,
      activeAlert,
      createBroadcastAlert,
      dismissAlert,
      revokeBroadcastAlert,
      refreshBroadcasts: fetchActiveBroadcasts
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
