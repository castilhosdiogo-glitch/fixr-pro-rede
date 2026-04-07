import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AudioRecorderProps {
  onSend: (url: string, duration: number) => Promise<void>;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function AudioRecorder({ onSend, disabled }: AudioRecorderProps) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setDuration(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const cancelAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const handleSend = async () => {
    if (!audioBlob || !user) return;
    if (audioBlob.size > MAX_SIZE_BYTES) {
      toast.error("Áudio muito grande. Máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      const path = `chat/audio/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, audioBlob, {
        contentType: audioBlob.type,
        upsert: false,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(path);
      await onSend(publicUrl, duration);
      cancelAudio();
    } catch {
      toast.error("Erro ao enviar áudio. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  // Preview mode after recording
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <audio src={audioUrl} controls className="flex-1 h-10 rounded-xl" style={{ minWidth: 0 }} />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex-shrink-0">
          {formatDuration(duration)}
        </span>
        <button onClick={cancelAudio} className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/20 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
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

  // Recording mode
  if (recording) {
    return (
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2 flex-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
            GRAVANDO {formatDuration(duration)}
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500 text-white flex-shrink-0 active:scale-95"
        >
          <Square size={16} fill="white" />
        </button>
      </div>
    );
  }

  // Idle button
  return (
    <button
      onPointerDown={startRecording}
      disabled={disabled}
      title="Segurar para gravar áudio"
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/20 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors flex-shrink-0 active:scale-95 active:bg-primary/20"
    >
      <Mic size={18} />
    </button>
  );
}
