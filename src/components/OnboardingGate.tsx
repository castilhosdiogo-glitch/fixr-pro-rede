import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingState } from "@/hooks/useOnboarding";

/**
 * Rotas ignoradas: páginas onde faz sentido o usuário estar antes de
 * completar o onboarding (auth, próprio wizard, perfil, termos, sair).
 */
const SKIP = [
  "/auth",
  "/onboarding-pro",
  "/onboarding-cliente",
  "/termos-de-uso",
  "/privacidade",
  "/faq",
];

export const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, profile } = useAuth();
  const location = useLocation();
  const { data: state, isLoading } = useOnboardingState();

  if (authLoading || !user) return <>{children}</>;
  if (isLoading || !state) return <>{children}</>;

  const onSkipped = SKIP.some((p) => location.pathname.startsWith(p));
  if (onSkipped) return <>{children}</>;

  if (state.user_type === "professional" && !state.completo) {
    return <Navigate to="/onboarding-pro" replace />;
  }

  if (state.user_type === "client" && !state.completo && profile) {
    return <Navigate to="/onboarding-cliente" replace />;
  }

  return <>{children}</>;
};
