import { useRef, useCallback, useEffect } from 'react';

// For a real AAA feel, you'd use actual audio files here.
// Since we don't have external assets, we'll use the Web Audio API to synthesize retro sounds.
export function useAudio() {
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    // AudioContext must be initialized after user interaction
    const initAudio = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  }, []);

  const playEatSound = useCallback(() => {
    playTone(600, 'square', 0.1, 0.1);
    setTimeout(() => playTone(800, 'square', 0.1, 0.1), 50);
    
    // Haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [playTone]);

  const playGameOverSound = useCallback(() => {
    playTone(300, 'sawtooth', 0.2, 0.2);
    setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.2), 150);
    setTimeout(() => playTone(200, 'sawtooth', 0.5, 0.2), 350);

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200, 50, 400]);
    }
  }, [playTone]);

  return { playEatSound, playGameOverSound };
}
