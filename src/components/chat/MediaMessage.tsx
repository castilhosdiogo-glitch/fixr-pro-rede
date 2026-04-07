import { useState } from "react";
import { Play, Pause, X } from "lucide-react";
import { useRef } from "react";

type MessageType = "texto" | "audio" | "foto" | "video";

interface MediaMessageProps {
  tipo: MessageType;
  content: string;
  arquivo_url?: string | null;
  duracao?: number | null;
  isMine: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioPlayer({ url, duracao }: { url: string; duracao?: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const total = duracao ?? 0;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 active:scale-95"
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="flex-1">
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/70 rounded-full transition-all"
            style={{ width: total > 0 ? `${(currentTime / total) * 100}%` : "0%" }}
          />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(total)}
        </p>
      </div>
    </div>
  );
}

function PhotoMessage({ url, isMine }: { url: string; isMine: boolean }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <img
        src={url}
        alt="foto"
        onClick={() => setFullscreen(true)}
        className="max-w-[220px] max-h-[220px] rounded-xl object-cover cursor-pointer border border-white/10 active:scale-95 transition-transform"
      />
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X size={20} />
          </button>
          <img src={url} alt="foto" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </>
  );
}

function VideoMessage({ url }: { url: string }) {
  return (
    <video
      src={url}
      controls
      playsInline
      className="max-w-[240px] max-h-[200px] rounded-xl object-cover border border-white/10"
    />
  );
}

export function MediaMessage({ tipo, content, arquivo_url, duracao, isMine }: MediaMessageProps) {
  if (tipo === "texto" || !arquivo_url) {
    return <p className="text-sm leading-relaxed">{content}</p>;
  }

  return (
    <div>
      {tipo === "audio" && <AudioPlayer url={arquivo_url} duracao={duracao} />}
      {tipo === "foto" && <PhotoMessage url={arquivo_url} isMine={isMine} />}
      {tipo === "video" && <VideoMessage url={arquivo_url} />}
      {content && content !== "[audio]" && content !== "[foto]" && content !== "[video]" && (
        <p className="text-xs mt-2 opacity-80 leading-relaxed">{content}</p>
      )}
    </div>
  );
}
