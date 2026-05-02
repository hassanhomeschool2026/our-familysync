import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { FamilyProvider, useFamily } from '@/lib/familyContext';

import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import Welcome from './pages/Welcome';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
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
  const { currentUser, loading, family, familyLoadError, reload } = useFamily();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser?.family_id || !family) {
    if (familyLoadError && currentUser?.family_id) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <h1 className="font-heading text-xl font-bold mb-2">We couldn&apos;t load your family</h1>
            <p className="text-sm text-muted-foreground mb-4">{familyLoadError}</p>
            <button
              type="button"
              onClick={() => reload()}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <FamilyProvider>
      <FamilyGate>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/chores" element={<ChoresPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            {/* <Route path="/geofence" element={<GeofencePage />} /> */}
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
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
