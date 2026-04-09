import { useState } from "react";
import { Play, Pause, X } from "lucide-react";

interface MediaMessageProps {
  tipo: "audio" | "photo" | "video";
  arquivoUrl: string;
  duracao?: number;
  isMine: boolean;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const AudioPlayer = ({ url, duracao }: { url: string; duracao?: number }) => {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => {
    const a = new Audio(url);
    a.addEventListener("ended", () => setPlaying(false));
    return a;
  });

  const toggle = () => {
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 hover:bg-primary/30 transition-colors"
      >
        {playing ? <Pause size={14} className="text-primary" /> : <Play size={14} className="text-primary ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full w-0 transition-all" />
        </div>
        {duracao && (
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">
            {formatDuration(duracao)}
          </p>
        )}
      </div>
    </div>
  );
};

const PhotoMessage = ({ url }: { url: string }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button onClick={() => setExpanded(true)} className="block rounded-xl overflow-hidden max-w-[240px]">
        <img
          src={url}
          alt="Foto"
          className="w-full h-auto max-h-[200px] object-cover"
          loading="lazy"
        />
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            onClick={() => setExpanded(false)}
          >
            <X size={20} />
          </button>
          <img src={url} alt="Foto ampliada" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
};

const VideoMessage = ({ url }: { url: string }) => (
  <div className="rounded-xl overflow-hidden max-w-[280px]">
    <video
      src={url}
      controls
      preload="metadata"
      className="w-full h-auto max-h-[200px]"
    />
  </div>
);

const MediaMessage = ({ tipo, arquivoUrl, duracao }: MediaMessageProps) => {
  if (!arquivoUrl) return null;

  switch (tipo) {
    case "audio":
      return <AudioPlayer url={arquivoUrl} duracao={duracao} />;
    case "photo":
      return <PhotoMessage url={arquivoUrl} />;
    case "video":
      return <VideoMessage url={arquivoUrl} />;
    default:
      return null;
  }
};

export default MediaMessage;
