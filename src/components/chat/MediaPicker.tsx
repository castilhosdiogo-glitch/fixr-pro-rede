import { useRef } from "react";
import { Camera, Video } from "lucide-react";

interface MediaPickerProps {
  onMediaSelect: (file: File, type: "photo" | "video") => void;
  canPhoto?: boolean;
  canVideo?: boolean;
  disabled?: boolean;
}

const PHOTO_MAX_MB = 10;
const VIDEO_MAX_MB = 50;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

const MediaPicker = ({ onMediaSelect, canPhoto = false, canVideo = false, disabled = false }: MediaPickerProps) => {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File, type: "photo" | "video") => {
    const maxMb = type === "photo" ? PHOTO_MAX_MB : VIDEO_MAX_MB;
    const allowedTypes = type === "photo" ? PHOTO_TYPES : VIDEO_TYPES;

    if (!allowedTypes.includes(file.type)) return;
    if (file.size > maxMb * 1024 * 1024) return;

    onMediaSelect(file, type);
  };

  if (!canPhoto && !canVideo) return null;

  return (
    <div className="flex items-center gap-1">
      {canPhoto && (
        <>
          <input
            ref={photoRef}
            type="file"
            accept={PHOTO_TYPES.join(",")}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "photo");
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={disabled}
            className="w-10 h-10 rounded-full bg-secondary/20 border border-border text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 disabled:opacity-30"
            title="Enviar foto"
          >
            <Camera size={16} />
          </button>
        </>
      )}

      {canVideo && (
        <>
          <input
            ref={videoRef}
            type="file"
            accept={VIDEO_TYPES.join(",")}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "video");
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={disabled}
            className="w-10 h-10 rounded-full bg-secondary/20 border border-border text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 disabled:opacity-30"
            title="Enviar vídeo"
          >
            <Video size={16} />
          </button>
        </>
      )}
    </div>
  );
};

export default MediaPicker;
