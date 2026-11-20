let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  return sharedAudioCtx;
}

function playTwoToneChime(ctx: AudioContext): void {
  const now = ctx.currentTime;

  const notes = [
    { freq: 880, start: 0, duration: 0.14 },
    { freq: 1174.66, start: 0.11, duration: 0.22 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.start);

    gain.gain.setValueAtTime(0.0001, now + note.start);
    gain.gain.exponentialRampToValueAtTime(0.09, now + note.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + note.start + note.duration
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.02);
  }
}

export async function unlockAndPlayNotificationSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    playTwoToneChime(ctx);
  } catch {
    // Silencioso em navegadores sem suporte a Web Audio API
  }
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => playTwoToneChime(ctx)).catch(() => {});
      return;
    }
    playTwoToneChime(ctx);
  } catch {
    // Silencioso caso o navegador bloqueie áudio em background
  }
}
