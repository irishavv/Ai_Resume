import { useCallback, useEffect, useRef, useState } from 'react';

const SynthesisImpl =
  typeof window !== 'undefined' ? window.speechSynthesis || null : null;

const VOICE_TAGS = { en: 'en', hi: 'hi' };

/** Browser support for the Web Speech API (synthesis half). */
export function isSpeechSynthesisSupported() {
  return Boolean(SynthesisImpl);
}

/**
 * Reads text aloud with the browser speech synthesiser.
 *
 * Only one utterance plays at a time: starting a new one cancels the previous,
 * and unmounting stops playback. `activeId` identifies what is currently being
 * read so the UI can show a playing state on the right message.
 */
export function useSpeechSynthesis({ lang = 'en' } = {}) {
  const [activeId, setActiveId] = useState(null);
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    utteranceRef.current = null;
    setActiveId(null);
    try {
      SynthesisImpl?.cancel();
    } catch {
      /* nothing was playing */
    }
  }, []);

  const speak = useCallback(
    (text, id) => {
      if (!SynthesisImpl) return false;
      const content = String(text ?? '').trim();
      if (!content) return false;

      // Re-clicking the active message stops it instead of restarting.
      if (utteranceRef.current === id) {
        stop();
        return true;
      }

      stop();

      const utterance = new SpeechSynthesisUtterance(content);
      const tag = VOICE_TAGS[lang] || VOICE_TAGS.en;
      utterance.lang = tag === 'hi' ? 'hi-IN' : 'en-IN';
      const voice = SynthesisImpl.getVoices?.().find((item) =>
        item.lang?.toLowerCase().startsWith(tag),
      );
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (utteranceRef.current === id) stop();
      };
      utterance.onerror = () => {
        if (utteranceRef.current === id) stop();
      };

      utteranceRef.current = id;
      setActiveId(id);
      try {
        SynthesisImpl.speak(utterance);
      } catch {
        stop();
        return false;
      }
      return true;
    },
    [lang, stop],
  );

  // Stop playback if the component goes away mid-utterance.
  useEffect(
    () => () => {
      utteranceRef.current = null;
      try {
        SynthesisImpl?.cancel();
      } catch {
        /* nothing was playing */
      }
    },
    [],
  );

  return { isSupported: isSpeechSynthesisSupported(), activeId, speak, stop };
}

export default useSpeechSynthesis;
