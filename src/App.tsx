import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { BackendGuardScreen } from "@/components/BackendGuardScreen";
import { useBackendGuard } from "@/hooks/useBackendGuard";
import Dashboard from "@/pages/Dashboard";
import CurriculumPage from "@/pages/CurriculumPage";
import BehaviorLogPage from "@/pages/BehaviorLogPage";
import CoachingPage from "@/pages/CoachingPage";
import ProgressPage from "@/pages/ProgressPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { status, errorMessage } = useBackendGuard();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Connecting…</div>
      </div>
    );
  }

  if (status !== 'valid') {
    return <BackendGuardScreen message={errorMessage} />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/curriculum" element={<CurriculumPage />} />
        <Route path="/log" element={<BehaviorLogPage />} />
        <Route path="/coaching" element={<CoachingPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
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
