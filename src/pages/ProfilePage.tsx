import BottomNav from "@/components/BottomNav";

const ProfilePage = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="bg-card border-b-2 border-border p-4">
        <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
          Meu Perfil
        </h1>
      </header>
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center w-20 h-20 bg-secondary text-foreground font-display text-2xl uppercase mb-4">
          ?
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Faça login para acessar seu perfil.
        </p>
        <button className="px-6 py-3 bg-primary text-primary-foreground font-display uppercase text-sm tracking-wider">
          Entrar
        </button>
        <button className="mt-2 px-6 py-3 border-2 border-border text-foreground font-display uppercase text-sm tracking-wider hover:border-primary transition-colors">
          Criar Conta
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
