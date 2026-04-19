import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { FamilyProvider, useFamily } from '@/lib/familyContext';

import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Welcome from './pages/Welcome';
import HomePage from './pages/HomePage';
import TodoPage from './pages/TodoPage';
import ChoresPage from './pages/ChoresPage';
import CheckInPage from './pages/CheckInPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import NotificationsPage from './pages/NotificationsPage';
import UpgradePage from './pages/UpgradePage';
import GeofencePage from './pages/GeofencePage';
import AppLayout from './components/layout/AppLayout';

const FamilyGate = ({ children }) => {
  const { currentUser, loading, family } = useFamily();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser?.family_id || !family) {
    return <Welcome />;
  }

  return children;
};

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <FamilyProvider>
      <FamilyGate>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/chores" element={<ChoresPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/geofence" element={<GeofencePage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/upgrade" element={<UpgradePage />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </FamilyGate>
    </FamilyProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
