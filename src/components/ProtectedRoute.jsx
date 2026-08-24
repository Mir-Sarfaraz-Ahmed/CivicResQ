import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="loader-spinner"></div>
        <p className="loader-text">Securing session...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page and save the location they tried to access
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
