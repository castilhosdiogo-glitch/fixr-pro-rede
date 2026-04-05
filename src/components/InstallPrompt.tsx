import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[60]"
        >
          <div className="bg-primary p-5 rounded-2xl shadow-none border-2 border-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center rounded-2xl flex-shrink-0">
                <span className="text-primary font-display font-black text-xl">P</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">Instalar Fixr</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-0.5">App rápido e seguro no seu celular</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2.5 bg-white text-primary font-display font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all flex items-center gap-2"
              >
                <Download size={14} />
                Instalar
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="p-2 text-white/50 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

