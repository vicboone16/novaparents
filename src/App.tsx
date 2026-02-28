import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { BackendGuardScreen } from "@/components/BackendGuardScreen";
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
import NotFound from "./pages/NotFound";
import { CoachBotFAB } from "./components/CoachBot";

const queryClient = new QueryClient();

function AppContent() {
  const { status, errorMessage } = useBackendGuard();
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

  if (status === 'loading' || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-display">Connecting…</div>
      </div>
    );
  }

  if (status !== 'valid') {
    return <BackendGuardScreen message={errorMessage} />;
  }

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

  return (
    <>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/toolkit" element={<ToolkitPage />} />
          <Route path="/log" element={<BehaviorLogPage />} />
          <Route path="/academy" element={<NovaAcademyPage />} />
          <Route path="/behavior-lab" element={<BehaviorLabPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/audit" element={<AuditDashboardPage />} />
          <Route path="/admin/academy" element={<AcademyAdminPage />} />
          <Route path="/admin/behavior-lab" element={<BehaviorLabAdminPage />} />
          {/* Legacy redirects */}
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
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
