import { useState, useRef, useCallback } from "react";
import { Mic, Square } from "lucide-react";

interface AudioRecorderProps {
  onRecordComplete: (blob: Blob, duration: number) => void;
  disabled?: boolean;
  maxSizeMb?: number;
}

const MAX_DURATION_S = 120; // 2 minutos

const AudioRecorder = ({ onRecordComplete, disabled = false, maxSizeMb = 5 }: AudioRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mimeType });
        const duration = Math.round((Date.now() - startTime.current) / 1000);

        if (blob.size > maxSizeMb * 1024 * 1024) {
          return; // silently drop oversized recordings
        }
        if (duration >= 1) {
          onRecordComplete(blob, duration);
        }
        setElapsed(0);
      };

      mediaRecorder.current = recorder;
      startTime.current = Date.now();
      recorder.start(250);
      setRecording(true);

      timerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startTime.current) / 1000);
        setElapsed(s);
        if (s >= MAX_DURATION_S) stopRecording();
      }, 500);
    } catch {
      // permission denied or no mic
    }
  }, [onRecordComplete, maxSizeMb, stopRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (disabled) return null;

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <span className="text-[10px] font-black uppercase tracking-widest text-destructive animate-pulse">
            {formatTime(elapsed)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-all active:scale-95"
          >
            <Square size={16} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="w-10 h-10 rounded-full bg-secondary/20 border border-border text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
          title="Gravar áudio"
        >
          <Mic size={16} />
        </button>
      )}
    </div>
  );
};

export default AudioRecorder;
