import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Mic, MicOff, SendHorizontal, Square } from 'lucide-react';
import Button from '../common/Button.jsx';
import IconButton from '../common/IconButton.jsx';
import LanguageToggle from '../common/LanguageToggle.jsx';
import useSpeechRecognition from '../../hooks/useSpeechRecognition.js';
import messageSchema, {
  MESSAGE_COUNTER_THRESHOLD,
  MESSAGE_MAX_LENGTH,
} from '../../schemas/messageSchema.js';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

const MAX_TEXTAREA_HEIGHT = 160; // ~8 rows
const COUNTER_WARNING_THRESHOLD = 50;

/** Dictation language follows the answer language so both stay consistent. */
const DICTATION_LANGS = { en: 'en-IN', hi: 'hi-IN' };

function dictationMessageFor(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return copy.voice.denied;
    case 'no-speech':
      return copy.voice.noSpeech;
    case 'network':
      return copy.voice.network;
    default:
      return copy.voice.error;
  }
}

/** Auto-growing composer. Enter sends, Shift+Enter adds a newline. */
export default function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  isStarting,
  error,
  onDismissError,
  language,
  onLanguageChange,
}) {
  const { settings } = useSiteSettings();
  const features = settings.features ?? {};
  const showVoiceInput = features.voiceInput !== false;
  const showLanguageToggle = features.languageToggle !== false;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
    mode: 'onSubmit',
  });

  const textareaRef = useRef(null);
  const { ref: registerRef, ...contentField } = register('content');
  const content = watch('content') || '';
  const isDisabled = Boolean(isStarting);
  const isBusy = isStreaming || isDisabled;

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, []);

  const [dictationError, setDictationError] = useState(null);
  // Text already in the field when dictation started; the transcript is appended to it.
  const dictationBaseRef = useRef('');
  const contentRef = useRef(content);
  contentRef.current = content;

  const handleTranscript = useCallback(
    (transcript) => {
      const base = dictationBaseRef.current;
      const separator = base && !/\s$/.test(base) ? ' ' : '';
      const next = `${base}${separator}${transcript}`.slice(0, MESSAGE_MAX_LENGTH);
      setValue('content', next, { shouldValidate: false });
      window.requestAnimationFrame(resize);
    },
    [resize, setValue],
  );

  const { isSupported: isDictationSupported, isListening, toggle: toggleDictation } =
    useSpeechRecognition({
      lang: DICTATION_LANGS[language] || DICTATION_LANGS.en,
      onTranscript: handleTranscript,
      onError: (code) => setDictationError(dictationMessageFor(code)),
    });

  const handleToggleDictation = () => {
    if (isListening) {
      toggleDictation();
      return;
    }
    setDictationError(null);
    dictationBaseRef.current = contentRef.current;
    toggleDictation();
  };

  useEffect(() => {
    resize();
  }, [content, resize]);

  useEffect(() => {
    if (!isStreaming && !isDisabled) textareaRef.current?.focus();
  }, [isStreaming, isDisabled]);

  const submit = handleSubmit(async (values) => {
    const text = values.content.trim();
    if (!text) return;
    const accepted = await onSend(text);
    if (accepted !== false) {
      reset({ content: '' });
      window.requestAnimationFrame(resize);
    }
  });

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const remaining = MESSAGE_MAX_LENGTH - content.length;
  const showCounter = content.length >= MESSAGE_COUNTER_THRESHOLD;
  const errorMessage = errors.content?.message;

  return (
    <div className="shrink-0 border-t border-line bg-surface px-3 py-2.5 sm:px-5">
      <div className="mx-auto max-w-3xl">
        {error ? (
          <div
            role="alert"
            className="mb-2 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-2"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-2xs leading-relaxed text-danger">
              {error.message}
            </span>
            {onDismissError ? (
              <button
                type="button"
                onClick={onDismissError}
                className="shrink-0 rounded text-2xs font-medium text-danger underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {copy.states.dismiss}
              </button>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={submit} noValidate>
          <label htmlFor="composer-input" className="sr-only">
            {copy.composer.label}
          </label>

          <div
            className={[
              'flex items-end gap-2 rounded-xl border bg-surface px-2.5 py-2 transition-colors',
              errorMessage
                ? 'border-danger'
                : 'border-line focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30',
            ].join(' ')}
          >
            <textarea
              id="composer-input"
              {...contentField}
              ref={(element) => {
                textareaRef.current = element;
                registerRef(element);
              }}
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder={copy.composer.placeholder}
              onKeyDown={handleKeyDown}
              onInput={resize}
              aria-invalid={errorMessage ? 'true' : undefined}
              aria-describedby={
                errorMessage ? 'composer-error' : showCounter ? 'composer-counter' : undefined
              }
              disabled={isDisabled}
              className="max-h-40 w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-ink placeholder:text-ink-subtle focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />

            <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {isDictationSupported && showVoiceInput ? (
                <IconButton
                  label={isListening ? copy.voice.stop : copy.voice.start}
                  icon={isListening ? MicOff : Mic}
                  variant={isListening ? 'solid' : 'ghost'}
                  aria-pressed={isListening}
                  onClick={handleToggleDictation}
                  disabled={isBusy}
                />
              ) : null}

              {isStreaming ? (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={Square}
                  onClick={onStop}
                  aria-label={copy.composer.stopGenerating}
                >
                  {copy.composer.stop}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  leftIcon={SendHorizontal}
                  disabled={isDisabled || content.trim().length === 0}
                  isLoading={isStarting}
                >
                  {copy.composer.send}
                </Button>
              )}
            </div>
          </div>
        </form>

        <div className="mt-1.5 flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p
              id="composer-error"
              role={errorMessage ? 'alert' : undefined}
              className={errorMessage ? 'text-2xs text-danger' : 'sr-only'}
            >
              {errorMessage || ''}
            </p>

            {isListening ? (
              <p className="inline-flex shrink-0 items-center gap-1.5 text-2xs font-medium text-primary" role="status">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
                {copy.voice.listening}
              </p>
            ) : null}

            {!isListening && dictationError ? (
              <p role="alert" className="min-w-0 text-2xs leading-relaxed text-danger">
                {dictationError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {showLanguageToggle ? (
              <LanguageToggle
                value={language}
                onChange={onLanguageChange}
                disabled={isDisabled}
              />
            ) : null}
            {showCounter ? (
              <span
                id="composer-counter"
                aria-live="polite"
                className={[
                  'text-2xs tabular-nums',
                  remaining <= COUNTER_WARNING_THRESHOLD ? 'text-warning' : 'text-ink-subtle',
                ].join(' ')}
              >
                {remaining} {copy.composer.counterHint}
              </span>
            ) : null}
            <span className="hidden text-2xs text-ink-subtle sm:inline">
              {copy.composer.hintEnter}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
