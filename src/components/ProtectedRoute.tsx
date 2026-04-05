import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse ml-4">Autenticando...</p>
      </div>
    );
  }

  if (!user) {
    // Redireciona para login e salva a URL pretendida
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
