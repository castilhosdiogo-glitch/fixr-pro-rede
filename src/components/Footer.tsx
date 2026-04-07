import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 w-fit group">
              <Logo className="w-6 h-6 group-hover:scale-95 transition-transform" />
              <span className="font-display font-black text-lg text-foreground">Fixr</span>
            </Link>
            <p className="text-xs text-muted-foreground">
              Conectando clientes com profissionais verificados
            </p>
          </div>

          {/* Para Clientes */}
          <div>
            <h3 className="font-display font-bold text-sm mb-4 text-foreground">
              Para Clientes
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/buscar"
                  className="hover:text-primary transition-colors"
                >
                  Encontrar Profissionais
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="hover:text-primary transition-colors"
                >
                  Como Funciona
                </Link>
              </li>
              <li>
                <a
                  href="mailto:suporte@fixrapp.com.br"
                  className="hover:text-primary transition-colors"
                >
                  Suporte
                </a>
              </li>
            </ul>
          </div>

          {/* Para Profissionais */}
          <div>
            <h3 className="font-display font-bold text-sm mb-4 text-foreground">
              Para Profissionais
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/auth"
                  state={{ mode: "register-professional" }}
                  className="hover:text-primary transition-colors"
                >
                  Criar Perfil
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="hover:text-primary transition-colors"
                >
                  Planos
                </Link>
              </li>
              <li>
                <a
                  href="mailto:suporte@fixrapp.com.br"
                  className="hover:text-primary transition-colors"
                >
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display font-bold text-sm mb-4 text-foreground">
              Legal
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/termos-de-uso"
                  className="hover:text-primary transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  to="/privacidade"
                  className="hover:text-primary transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>
              © {currentYear} Fixrapp Tecnologia Ltda. Todos os direitos reservados.
            </p>
            <div className="flex gap-4">
              <a
                href="https://twitter.com/fixrapp"
                className="hover:text-primary transition-colors"
                rel="noopener noreferrer"
                target="_blank"
              >
                Twitter
              </a>
              <a
                href="https://instagram.com/fixrapp"
                className="hover:text-primary transition-colors"
                rel="noopener noreferrer"
                target="_blank"
              >
                Instagram
              </a>
              <a
                href="https://facebook.com/fixrapp"
                className="hover:text-primary transition-colors"
                rel="noopener noreferrer"
                target="_blank"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
