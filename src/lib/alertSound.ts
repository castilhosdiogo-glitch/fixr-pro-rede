/**
 * Toca um sinal sonoro de "chamada" (2 bipes em sequência, repetidos 3x) via
 * Web Audio API — sem asset externo. Best-effort: navegadores bloqueiam áudio
 * sem gesto prévio do usuário em algumas situações, então falha silenciosa.
 */
export function playUrgentAlertTone() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();

    const playBeepPair = (startTime: number) => {
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = startTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.17);
      });
    };

    const now = ctx.currentTime;
    [0, 0.6, 1.2].forEach((offset) => playBeepPair(now + offset));

    setTimeout(() => ctx.close().catch(() => undefined), 2500);
  } catch {
    // best-effort — nunca deve quebrar o fluxo de notificações
  }
}
