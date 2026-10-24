import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { copy } from '../../constants/copy.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Full-height application frame.
 * Desktop: fixed left sidebar plus an optional right-hand panel.
 * Mobile: sticky top bar with a motion-driven slide-over sidebar.
 */
export default function AppShell({
  sidebarContent,
  topBar,
  header,
  aside,
  children,
  sidebarOpen,
  onSidebarClose,
}) {
  const drawerRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    restoreFocusRef.current = document.activeElement || null;
    const drawer = drawerRef.current;
    const firstFocusable = drawer ? drawer.querySelector(FOCUSABLE_SELECTOR) : null;
    if (firstFocusable) firstFocusable.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onSidebarClose?.();
        return;
      }
      if (event.key !== 'Tab' || !drawer) return;

      const focusable = Array.from(drawer.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const restoreTarget = restoreFocusRef.current;
      if (restoreTarget && typeof restoreTarget.focus === 'function') restoreTarget.focus();
    };
  }, [sidebarOpen, onSidebarClose]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas text-ink">
      <aside className="hidden shrink-0 flex-col border-r border-line bg-surface lg:flex lg:w-80 xl:w-[22rem]">
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 lg:hidden">{topBar}</div>
        <div className="hidden shrink-0 lg:flex">{header}</div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          {aside}
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onSidebarClose}
              aria-hidden="true"
            />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={copy.a11y.navigation}
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col border-r border-line bg-surface shadow-pop"
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            >
              {sidebarContent}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
