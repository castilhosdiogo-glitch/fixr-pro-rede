import { useState, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Images, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanUpgradePrompt } from "@/components/chat/PlanUpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

interface PortfolioItem {
  id: string;
  foto_url: string;
  legenda: string | null;
  created_at: string;
}

const MAX_SIZE = 10 * 1024 * 1024;

const PortfolioPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { can, upgradeMessage } = usePlanGate();
  const canUse = can("portfolio");
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [legenda, setLegenda] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: items = [] } = useQuery<PortfolioItem[]>({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("profissional_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PortfolioItem[];
    },
    enabled: !!user && canUse,
  });

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE) { toast.error("Foto muito grande. Máximo 10MB."); return; }
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPreviewUrl(url);
  };

  const uploadPhoto = async () => {
    if (!pendingFile || !user) return;
    if (items.length >= 20) { toast.error("Limite de 20 fotos atingido."); return; }
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() ?? "jpg";
      const path = `portfolio/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, pendingFile, {
        contentType: pendingFile.type, upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("portfolio").getPublicUrl(path);
      const { error: dbError } = await supabase.from("portfolio").insert({
        profissional_id: user.id,
        foto_url: publicUrl,
        legenda: legenda.trim() || null,
      });
      if (dbError) throw dbError;
      toast.success("Foto adicionada ao portfólio.");
      setPendingFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setLegenda("");
      qc.invalidateQueries({ queryKey: ["portfolio", user.id] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("LIMITE_PORTFOLIO")) {
        toast.error("Limite de 20 fotos atingido.");
      } else if (msg.includes("PLANO_INSUFICIENTE")) {
        toast.error("Portfólio exclusivo do plano Elite.");
      } else {
        toast.error("Erro ao fazer upload. Tente novamente.");
      }
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio").delete().eq("id", id).eq("profissional_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto removida.");
      qc.invalidateQueries({ queryKey: ["portfolio", user?.id] });
    },
  });

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Portfólio | Fixr Elite" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">PORTFÓLIO</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mt-0.5">
              EXCLUSIVO ELITE · {items.length}/20 FOTOS
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {!canUse ? (
          <PlanUpgradePrompt message={upgradeMessage("portfolio")} />
        ) : (
          <>
            {/* Upload area */}
            {items.length < 20 && (
              <div className="rounded-2xl border-2 border-dashed border-yellow-500/40 bg-yellow-500/5 p-6 space-y-4">
                <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="preview" className="w-full h-48 object-cover rounded-xl border-2 border-yellow-500/30" />
                    <input type="text" placeholder="LEGENDA OPCIONAL"
                      value={legenda} onChange={(e) => setLegenda(e.target.value)}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
                    />
                    <div className="flex gap-3">
                      <button onClick={() => { setPendingFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                        className="flex-1 py-3 rounded-xl bg-secondary/20 text-muted-foreground font-display font-black text-xs uppercase tracking-widest">
                        CANCELAR
                      </button>
                      <button onClick={uploadPhoto} disabled={uploading}
                        className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-display font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        PUBLICAR
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => inputRef.current?.click()} className="w-full flex flex-col items-center gap-3 py-8">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center">
                      <Plus size={24} className="text-yellow-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">ADICIONAR FOTO</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">JPG/PNG · MÁX 10MB</p>
                  </button>
                )}
              </div>
            )}

            {/* Portfolio grid */}
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Images size={32} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NENHUMA FOTO NO PORTFÓLIO</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <div key={item.id} className="relative group rounded-xl overflow-hidden border-2 border-border aspect-square">
                    <img src={item.foto_url} alt={item.legenda ?? "portfólio"} className="w-full h-full object-cover" />
                    {item.legenda && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white truncate">{item.legenda}</p>
                      </div>
                    )}
                    <button onClick={() => removePhoto.mutate(item.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PortfolioPage;
