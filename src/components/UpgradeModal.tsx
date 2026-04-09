import { X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
}

const UpgradeModal = ({ open, onClose, feature, description }: UpgradeModalProps) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background w-full max-w-sm rounded-2xl border-2 border-border p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Zap size={18} className="text-primary" />
            </div>
            <h2 className="font-display font-black text-sm uppercase tracking-widest text-foreground">
              RECURSO PARCEIRO
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">{feature}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            COMISSÃO DE 10% vs 15%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            A economia na comissão já paga a assinatura.
          </p>
        </div>

        <button
          onClick={() => {
            onClose();
            navigate("/planos");
          }}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95"
        >
          SER PARCEIRO POR R$ 29,90/MÊS
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          CONTINUAR COMO EXPLORADOR
        </button>
      </div>
    </div>
  );
};

export default UpgradeModal;
