import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

// Components & Route Guards
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import RoleQuickSwitcher from './components/RoleQuickSwitcher';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CitizenReport from './pages/citizen/CitizenReport';
import CitizenShelters from './pages/citizen/CitizenShelters';

// NGO Pages
import NgoDashboard from './pages/ngo/NgoDashboard';
import NgoResources from './pages/ngo/NgoResources';
import NgoVehicles from './pages/ngo/NgoVehicles';

// Ground Team Pages
import GroundDashboard from './pages/ground/GroundDashboard';

// Operations Pages
import OperationsDashboard from './pages/operations/OperationsDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Coordinator to redirect logged-in users attempting to visit /login to their role dashboard
const LoginRedirect = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="loader-spinner"></div>
        <p className="loader-text">Loading secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile || profile.is_active === false) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Role based redirection
  switch (profile.role) {
    case 'CITIZEN':
      return <Navigate to="/citizen/dashboard" replace />;
    case 'NGO':
      if (profile.org_status === 'APPROVED') {
        return <Navigate to="/ngo/dashboard" replace />;
      } else {
        return <Navigate to="/unauthorized" replace />;
      }
    case 'GROUND_TEAM':
      return <Navigate to="/ground/dashboard" replace />;
    case 'OPERATIONS':
      return <Navigate to="/operations/dashboard" replace />;
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <Router>
          <Routes>
            {/* Public / Entry routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Citizen Routes */}
            <Route 
              path="/citizen/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['CITIZEN']}>
                    <CitizenDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/citizen/report" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['CITIZEN']}>
                    <CitizenReport />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/citizen/shelters" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['CITIZEN']}>
                    <CitizenShelters />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />

            {/* NGO Routes */}
            <Route 
              path="/ngo/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['NGO']}>
                    <NgoDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ngo/resources" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['NGO']}>
                    <NgoResources />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ngo/vehicles" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['NGO']}>
                    <NgoVehicles />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />

            {/* Ground Team Routes */}
            <Route 
              path="/ground/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['GROUND_TEAM']}>
                    <GroundDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />

            {/* Operations Routes */}
            <Route 
              path="/operations/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['OPERATIONS']}>
                    <OperationsDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />

            {/* Admin Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />

            {/* Fallback wildcard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <RoleQuickSwitcher />
        </Router>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;
