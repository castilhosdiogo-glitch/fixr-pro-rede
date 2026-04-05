import { useState } from "react";
import { Copy, Share2, Check, Link2, ExternalLink } from "lucide-react";
import { useMyReferralCode } from "@/hooks/useReferral";
import { toast } from "sonner";

/**
 * Hero card showing the professional's unique referral link.
 * Includes copy-to-clipboard and native share (Web Share API).
 */
export const ReferralLinkCard = () => {
  const { data, isLoading } = useMyReferralCode();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!data) return;
    if (navigator.share) {
      await navigator.share({
        title: "Junte-se à Fixr",
        text: `Use meu código ${data.code.code} e comece a receber clientes na sua região!`,
        url: data.url,
      });
    } else {
      handleCopy();
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="h-4 w-24 bg-secondary/40 rounded-full mb-3" />
        <div className="h-10 w-full bg-secondary/30 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Seu código de indicação
          </p>
          <h2 className="font-display font-black text-3xl text-foreground tracking-wider mt-1">
            {data.code.code}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
          <Link2 size={11} className="text-primary" />
          <span className="text-[8px] font-black uppercase tracking-widest text-primary">
            {data.code.clicks} cliques
          </span>
        </div>
      </div>

      {/* URL display */}
      <div className="flex items-center gap-2 bg-secondary/20 border border-border rounded-2xl px-4 py-3 overflow-hidden">
        <span className="text-[10px] font-medium text-muted-foreground truncate flex-1 font-mono">
          {data.url}
        </span>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            copied
              ? "border-green-500 bg-green-500/10 text-green-400"
              : "border-border text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all active:scale-95"
        >
          <Share2 size={13} />
          Compartilhar
        </button>
      </div>

      {/* Reward hint */}
      <p className="text-[9px] font-medium text-muted-foreground text-center">
        A cada amigo ativo você ganha{" "}
        <span className="text-foreground font-bold">1 mês grátis</span> +{" "}
        <span className="text-foreground font-bold">destaque na busca</span>
      </p>
    </div>
  );
};

