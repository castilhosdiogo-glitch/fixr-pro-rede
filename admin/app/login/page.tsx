import { ShieldCheck } from "lucide-react";
import { signIn } from "./actions";

const errorMessages: Record<string, string> = {
  missing: "Preencha e-mail e senha.",
  invalid: "Credenciais inválidas.",
  forbidden: "Acesso restrito a administradores.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const errorMessage = error ? errorMessages[error] ?? "Erro ao entrar." : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Fixr Admin</h1>
            <p className="text-xs text-slate-500">Painel administrativo</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {errorMessage}
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">E-mail</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Senha</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Este painel é restrito à equipe Fixr. Todas as ações são registradas.
        </p>
      </div>
    </div>
  );
}
