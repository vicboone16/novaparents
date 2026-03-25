import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ParentLayout } from "@/components/ParentLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BackendGuardScreen } from "@/components/BackendGuardScreen";
import { UserAccessProvider, useUserAccess } from "@/contexts/UserAccessContext";
import { useBackendGuard } from "@/hooks/useBackendGuard";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import Dashboard from "@/pages/Dashboard";
import ToolkitPage from "@/pages/ToolkitPage";
import BehaviorLogPage from "@/pages/BehaviorLogPage";
import ProgressPage from "@/pages/ProgressPage";
import ProfilePage from "@/pages/ProfilePage";
import AuditDashboardPage from "@/pages/AuditDashboardPage";
import InviteAcceptPage from "@/pages/InviteAcceptPage";
import NovaAcademyPage from "@/pages/NovaAcademyPage";
import BehaviorLabPage from "@/pages/BehaviorLabPage";
import AcademyAdminPage from "@/pages/AcademyAdminPage";
import BehaviorLabAdminPage from "@/pages/BehaviorLabAdminPage";
import InsightsPage from "@/pages/InsightsPage";
import SnapshotBuilderPage from "@/pages/SnapshotBuilderPage";
import DemoAccountsPage from "@/pages/DemoAccountsPage";
import ParentHomePage from "@/pages/ParentHomePage";
import ParentProgressPage from "@/pages/ParentProgressPage";
import ParentRewardsPage from "@/pages/ParentRewardsPage";
import ParentMessagesPage from "@/pages/ParentMessagesPage";
import NotFound from "./pages/NotFound";
import { CoachBotFAB } from "./components/CoachBot";

const queryClient = new QueryClient();

function AppContent() {
  const { status: handshakeStatus, errorMessage: handshakeError } = useBackendGuard();
  const { status: accessStatus, error: accessError, refresh, continueAsIndependent } = useUserAccess();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handshake loading
  if (handshakeStatus === 'loading' || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-display">Connecting…</div>
      </div>
    );
  }

  // Handshake failure
  if (handshakeStatus !== 'valid') {
    return <BackendGuardScreen message={handshakeError} />;
  }

  // Not logged in
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Access loading
  if (accessStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-display">Verifying access…</div>
      </div>
    );
  }

  // Access denied — show parent-friendly onboarding for not_provisioned / no_access
  if (accessStatus === 'no_access' || accessStatus === 'not_provisioned') {
    return (
      <BackendGuardScreen
        message={accessError || 'Access denied.'}
        allowIndependentMode
        onContinueIndependent={continueAsIndependent}
        onCodeRedeemed={refresh}
      />
    );
  }

  // Hard error (backend down, etc.)
  if (accessStatus === 'error') {
    return <BackendGuardScreen message={accessError || 'Something went wrong.'} />;
  }

  return (
    <>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/toolkit" element={<ToolkitPage />} />
          <Route path="/log" element={<BehaviorLogPage />} />
          <Route path="/academy" element={<NovaAcademyPage />} />
          <Route path="/behavior-lab" element={<BehaviorLabPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/insights/new" element={<SnapshotBuilderPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/audit" element={<AuditDashboardPage />} />
          <Route path="/admin/academy" element={<ProtectedRoute><AcademyAdminPage /></ProtectedRoute>} />
          <Route path="/admin/behavior-lab" element={<ProtectedRoute><BehaviorLabAdminPage /></ProtectedRoute>} />
          <Route path="/admin/demo-accounts" element={<ProtectedRoute><DemoAccountsPage /></ProtectedRoute>} />
          <Route path="/learn" element={<Navigate to="/toolkit" replace />} />
          <Route path="/library" element={<Navigate to="/toolkit" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
      <CoachBotFAB />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserAccessProvider>
          <AppContent />
        </UserAccessProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
