import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const MessagesPage = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="bg-card border-b-2 border-border p-4">
        <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
          Mensagens
        </h1>
      </header>
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-muted-foreground text-sm">
          Suas conversas com profissionais aparecerão aqui.
        </p>
        <Link
          to="/buscar"
          className="mt-4 px-6 py-3 bg-primary text-primary-foreground font-display uppercase text-sm tracking-wider"
        >
          Buscar Profissionais
        </Link>
      </div>
      <BottomNav />
    </div>
  );
};

export default MessagesPage;
