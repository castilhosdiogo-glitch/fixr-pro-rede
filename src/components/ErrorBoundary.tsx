import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in dev; swap for Sentry/LogRocket in production
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-destructive" />
            </div>

            <div>
              <h2 className="font-display font-black text-sm uppercase tracking-widest text-foreground">
                Algo deu errado
              </h2>
              <p className="text-[10px] font-medium text-muted-foreground mt-2 leading-relaxed">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
            </div>

            {import.meta.env.DEV && (
              <pre className="text-left text-[8px] font-mono text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-3 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={this.reset}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-display font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                <RefreshCw size={14} />
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.assign("/")}
                className="w-full py-3 bg-secondary/20 border border-border text-foreground font-display font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-secondary/40 transition-all"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Lightweight inline boundary for non-critical sections */
export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-destructive">
            Erro ao carregar esta seção
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
