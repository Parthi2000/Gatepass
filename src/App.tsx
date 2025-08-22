import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


// Pages
import LoginPage from './pages/LoginPage';
import EmployeePage from './pages/EmployeePage';
import ManagerPage from './pages/ManagerPage';
import SecurityPage from './pages/SecurityPage';
import AdminPage from './pages/AdminPage';
import LogisticsPage from './pages/LogisticsPage';
import PackageDetailPage from './pages/PackageDetailPage';

// Route guard component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    // User is not authenticated, redirect to login
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but doesn't have the required role
    // Redirect to their appropriate role page instead of dashboard
    if (user.role === 'employee') return <Navigate to="/employee" replace />;
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    if (user.role === 'security') return <Navigate to="/security" replace />;
    if (user.role === 'logistics') return <Navigate to="/logistics" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
  }
  
  // User is authenticated and has the required role (if specified)
  return <>{children}</>;
};

// Component to redirect users based on their role
const RoleRedirect = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/" replace />;
  
  if (user.role === 'employee') return <Navigate to="/employee" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  if (user.role === 'security') return <Navigate to="/security" replace />;
  if (user.role === 'logistics') return <Navigate to="/logistics" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  
  // Fallback
  return <Navigate to="/" replace />;
};

function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<LoginPage />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/employee" 
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <DashboardProvider>
              <EmployeePage />
            </DashboardProvider>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/manager" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/security" 
        element={
          <ProtectedRoute allowedRoles={['security']}>
            <SecurityPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/logistics" 
        element={
          <ProtectedRoute allowedRoles={['logistics']}>
            <LogisticsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/package/:id" 
        element={
          <ProtectedRoute>
            <PackageDetailPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <ToastContainer 
      position="top-right"
      autoClose={2000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
    </>
  );
}

export default App;