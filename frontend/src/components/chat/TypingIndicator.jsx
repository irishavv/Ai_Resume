import { copy } from '../../constants/copy.js';

/** Three pulsing dots shown before the first streamed token arrives. */
export default function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={copy.chat.generating}>
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-ink-subtle animate-bounce-dot"
            style={{ animationDelay: `${index * 0.16}s` }}
          />
        ))}
      </span>
      <span className="text-2xs text-ink-subtle">{copy.chat.generating}</span>
    </span>
  );
}
