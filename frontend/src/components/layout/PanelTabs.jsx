import { motion, useReducedMotion } from 'framer-motion';
import { MessagesSquare, UserRound } from 'lucide-react';
import { copy } from '../../constants/copy.js';

const TABS = [
  { id: 'chat', label: copy.tabs.chat, Icon: MessagesSquare },
  { id: 'profile', label: copy.tabs.profile, Icon: UserRound },
];

/** Segmented control switching between the chat and profile panels. */
export default function PanelTabs({ activeTab, onTabChange, showChat = true, className = '' }) {
  const prefersReducedMotion = useReducedMotion();
  const tabs = showChat ? TABS : TABS.filter((tab) => tab.id !== 'chat');

  return (
    <div
      role="tablist"
      aria-label={copy.a11y.panelTabs}
      className={[
        'inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-muted/70 p-0.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={isActive}
            aria-controls={`panel-${id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(id)}
            className={[
              'relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {isActive ? (
              <motion.span
                layoutId="panel-tab-indicator"
                className="absolute inset-0 rounded-lg border border-line bg-surface shadow-sm"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34 }
                }
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
