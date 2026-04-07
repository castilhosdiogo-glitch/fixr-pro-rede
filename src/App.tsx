import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";
import { InstallPrompt } from "./components/InstallPrompt";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";

// Critical path — loaded eagerly (always needed)
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy loaded — reduces initial bundle ~40%
const SearchPage           = lazy(() => import("./pages/SearchPage"));
const ProfessionalProfile  = lazy(() => import("./pages/ProfessionalProfile"));
const MessagesPage         = lazy(() => import("./pages/MessagesPage"));
const ProfilePage          = lazy(() => import("./pages/ProfilePage"));
const DashboardPage        = lazy(() => import("./pages/DashboardPage"));
const ClientDashboard      = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard       = lazy(() => import("./pages/AdminDashboard"));
const BroadcastRequestPage = lazy(() => import("./pages/BroadcastRequestPage"));
const ReferralPage         = lazy(() => import("./pages/ReferralPage"));

// Legal pages — lazy loaded
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const FAQ         = lazy(() => import("./pages/FAQ"));

/** Redirect /orcamento/:id → /solicitar?pro=:id */
const OrcamentoRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={"/solicitar?pro=" + (id ?? "")} replace />;
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
      Carregando...
    </p>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <div className="pb-20 sm:pb-0">
                <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/buscar" element={<SearchPage />} />
                    <Route path="/auth" element={<AuthPage />} />

                    {/* Legal Pages — Public */}
                    <Route path="/termos-de-uso" element={<TermosDeUso />} />
                    <Route path="/privacidade" element={<Privacidade />} />
                    <Route path="/faq" element={<FAQ />} />

                    {/* Rotas Privadas */}
                    <Route path="/profissional/:id" element={<ProtectedRoute><ProfessionalProfile /></ProtectedRoute>} />
                    <Route path="/orcamento/:id" element={<OrcamentoRedirect />} />
                    <Route path="/mensagens" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                    <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/meu-painel" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/solicitar" element={<ProtectedRoute><BroadcastRequestPage /></ProtectedRoute>} />
                    <Route path="/indicar" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </ErrorBoundary>
                <InstallPrompt />
              </div>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
