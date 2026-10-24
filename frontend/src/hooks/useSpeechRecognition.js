import { useCallback, useEffect, useRef, useState } from 'react';

const RecognitionImpl =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

/** Browser support for the Web Speech API (recognition half). */
export function isSpeechRecognitionSupported() {
  return Boolean(RecognitionImpl);
}

/**
 * Dictation via the Web Speech API.
 *
 * Emits the transcript accumulated since `start()` (interim results included) so
 * the caller can prepend whatever text was already in the field. Returns
 * `{ isSupported, isListening, error, start, stop, toggle }`.
 */
export function useSpeechRecognition({ lang = 'en-IN', onTranscript, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const start = useCallback(() => {
    if (!RecognitionImpl || recognitionRef.current) return false;

    const recognition = new RecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let settled = '';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) settled += text;
        else interim += text;
      }
      const transcript = `${settled}${interim}`.replace(/\s+/g, ' ').trimStart();
      if (transcript) callbacksRef.current.onTranscript?.(transcript);
    };

    recognition.onerror = (event) => {
      // `aborted` is what `stop()` produces; it is not a failure to report.
      if (event.error === 'aborted') return;
      callbacksRef.current.onError?.(event.error || 'unknown');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      callbacksRef.current.onError?.('unknown');
      return false;
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  // Never leave the microphone open after the composer unmounts.
  useEffect(
    () => () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    },
    [],
  );

  return { isSupported: isSpeechRecognitionSupported(), isListening, start, stop, toggle };
}

export default useSpeechRecognition;
