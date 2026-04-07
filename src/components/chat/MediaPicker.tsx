import { useRef, useState } from "react";
import { Camera, Video, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type MediaType = "foto" | "video";

interface MediaPickerProps {
  type: MediaType;
  onSend: (url: string) => Promise<void>;
  disabled?: boolean;
}

const MAX_SIZES: Record<MediaType, number> = {
  foto: 10 * 1024 * 1024,  // 10MB
  video: 50 * 1024 * 1024, // 50MB
};

const ACCEPTS: Record<MediaType, string> = {
  foto: "image/jpeg,image/jpg,image/png,image/webp",
  video: "video/mp4,video/quicktime,video/webm",
};

export function MediaPicker({ type, onSend, disabled }: MediaPickerProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZES[type]) {
      toast.error(`${type === "foto" ? "Foto" : "Vídeo"} muito grande. Máximo ${type === "foto" ? "10MB" : "50MB"}.`);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ url, file });
  };

  const cancel = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!preview || !user) return;
    setUploading(true);
    try {
      const ext = preview.file.name.split(".").pop() ?? (type === "foto" ? "jpg" : "mp4");
      const folder = type === "foto" ? "foto" : "video";
      const path = `chat/${folder}/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, preview.file, {
        contentType: preview.file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(path);
      await onSend(publicUrl);
      cancel();
    } catch {
      toast.error(`Erro ao enviar ${type}. Tente novamente.`);
    } finally {
      setUploading(false);
    }
  };

  if (preview) {
    return (
      <div className="flex items-center gap-2 flex-1">
        {type === "foto" ? (
          <img src={preview.url} alt="preview" className="w-12 h-12 rounded-xl object-cover border-2 border-border flex-shrink-0" />
        ) : (
          <video src={preview.url} className="w-16 h-12 rounded-xl object-cover border-2 border-border flex-shrink-0" muted />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex-1 truncate">
          {preview.file.name}
        </span>
        <button onClick={cancel} className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/20 text-muted-foreground hover:text-destructive flex-shrink-0">
          <X size={16} />
        </button>
        <button
          onClick={handleSend}
          disabled={uploading}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground flex-shrink-0 disabled:opacity-40"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTS[type]}
        capture={type === "foto" ? "environment" : undefined}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title={type === "foto" ? "Enviar foto" : "Enviar vídeo (até 30s)"}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/20 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors flex-shrink-0 active:scale-95"
      >
        {type === "foto" ? <Camera size={18} /> : <Video size={18} />}
      </button>
    </>
  );
}
