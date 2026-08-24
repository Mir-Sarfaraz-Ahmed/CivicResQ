import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleRoute = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="loader-spinner"></div>
        <p className="loader-text">Authorizing access...</p>
      </div>
    );
  }

  // If profile couldn't be loaded or status is inactive, redirect to unauthorized
  if (!profile || profile.is_active === false) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Verify role matches
  const hasAccess = allowedRoles.includes(profile.role);
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  // NGO-specific access guard: Block NGO dashboard access if NGO is pending/suspended/rejected
  if (profile.role === 'NGO') {
    const orgStatus = profile.org_status;
    if (orgStatus !== 'APPROVED') {
      // NGO is not approved yet, redirect to /unauthorized (where they see a descriptive "Pending Approval" lock screen)
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default RoleRoute;
