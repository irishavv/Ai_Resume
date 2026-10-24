import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import IconButton from '../common/IconButton.jsx';
import { copy } from '../../constants/copy.js';

function legacyCopy(value) {
  try {
    const element = document.createElement('textarea');
    element.value = value;
    element.setAttribute('readonly', '');
    element.style.position = 'fixed';
    element.style.top = '-1000px';
    element.style.opacity = '0';
    document.body.appendChild(element);
    element.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(element);
    return succeeded;
  } catch {
    return false;
  }
}

/** Copies a value to the clipboard and confirms it inline. */
export default function CopyButton({ value, label = copy.chat.copyAnswer, className = '' }) {
  const [state, setState] = useState('idle');
  const timeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    let succeeded = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        succeeded = true;
      } catch {
        succeeded = legacyCopy(value);
      }
    } else {
      succeeded = legacyCopy(value);
    }

    setState(succeeded ? 'copied' : 'failed');
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setState('idle'), 1800);
  };

  const message = state === 'copied' ? copy.chat.copied : state === 'failed' ? copy.chat.copyFailed : '';

  return (
    <span className={['inline-flex items-center gap-1.5', className].filter(Boolean).join(' ')}>
      <IconButton
        label={label}
        icon={state === 'copied' ? Check : Copy}
        size="xs"
        onClick={handleCopy}
      />
      <span
        className={[
          'text-2xs font-medium',
          state === 'copied' ? 'text-success' : state === 'failed' ? 'text-danger' : 'sr-only',
        ].join(' ')}
        role="status"
        aria-live="polite"
      >
        {message}
      </span>
    </span>
  );
}
