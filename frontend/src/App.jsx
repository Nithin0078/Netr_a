
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout shell
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';

// Citizen Portal pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CameraManagement from './pages/citizen/CameraManagement';
import ReportIncident from './pages/citizen/ReportIncident';
import ProfileSettings from './pages/citizen/ProfileSettings';

// Police Dashboard pages
import PoliceDashboard from './pages/police/PoliceDashboard';
import InvestigationWorkflow from './pages/police/InvestigationWorkflow';
import CameraRequests from './pages/police/CameraRequests';
import AuditLogs from './pages/police/AuditLogs';

// Helper Route Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0c10',
        color: '#00f0ff',
        fontSize: '20px',
        fontWeight: 'bold',
        fontFamily: 'Space Grotesk'
      }}>
        NETRA SECURE BOOTING...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/register" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to correct dashboard based on actual role
    const dest = user.role === 'Citizen' ? '/citizen/dashboard' : '/police/dashboard';
    return <Navigate to={dest} replace />;
  }

  return children;
};

// Root navigator helper
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/register" replace />;
  return user.role === 'Citizen' ? (
    <Navigate to="/citizen/dashboard" replace />
  ) : (
    <Navigate to="/police/dashboard" replace />
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Login & Self Register Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Citizen Portal (Requires Citizen Role) */}
        <Route
          path="/citizen"
          element={
            <ProtectedRoute allowedRoles={['Citizen']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<CitizenDashboard />} />
          <Route path="cameras" element={<CameraManagement />} />
          <Route path="report" element={<ReportIncident />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Route>

        {/* Police Dashboard (Requires Police Officer, Admin) */}
        <Route
          path="/police"
          element={
            <ProtectedRoute allowedRoles={['Police Officer', 'Admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<PoliceDashboard />} />
          <Route path="cases" element={<InvestigationWorkflow />} />
          <Route path="requests" element={<CameraRequests />} />
          <Route path="audit" element={<AuditLogs />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
