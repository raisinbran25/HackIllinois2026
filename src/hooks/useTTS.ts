'use client';
import { useState, useRef, useCallback } from 'react';

export function useTTS() {
  const [enabled, setEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track message IDs that have already been spoken to prevent duplicates
  const spokenRef = useRef<Set<string>>(new Set());

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev && audioRef.current) {
        // Turning off — stop any playing audio
        audioRef.current.pause();
        audioRef.current = null;
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  const speak = useCallback(
    async (text: string, messageKey: string) => {
      if (!enabled) return;
      // Prevent duplicate playback for the same message
      if (spokenRef.current.has(messageKey)) return;
      spokenRef.current.add(messageKey);

      try {
        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        setIsSpeaking(true);

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          console.error('TTS request failed:', res.status);
          setIsSpeaking(false);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
        };

        await audio.play();
      } catch (err) {
        console.error('TTS playback error:', err);
        setIsSpeaking(false);
      }
    },
    [enabled]
  );

  return { enabled, isSpeaking, toggle, speak };
}
