import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import AdminNav from './AdminNav.jsx';
import IconButton from '../common/IconButton.jsx';
import ThemeToggle from '../layout/ThemeToggle.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { adminCopy } from '../../constants/adminCopy.js';

/**
 * The console frame: a persistent sidebar from the large breakpoint, a drawer
 * below it, and a scrollable content region. The document itself never scrolls,
 * so the console keeps the same fixed viewport as the public site.
 */
export default function AdminLayout() {
  const { username, signOut } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      setDrawerOpen(false);
    }
  }, [signOut]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas text-ink">
      <aside className="hidden shrink-0 border-r border-line bg-surface lg:block lg:w-64 xl:w-72">
        <AdminNav username={username} onSignOut={handleSignOut} isSigningOut={isSigningOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:hidden">
          <IconButton
            label={adminCopy.nav.openNavigation}
            icon={Menu}
            size="md"
            onClick={() => setDrawerOpen(true)}
          />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {adminCopy.brand.name}
          </p>
          <ThemeToggle size="md" />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeDrawer}
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={adminCopy.nav.sectionLabel}
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col border-r border-line bg-surface shadow-pop"
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-end px-2 pt-2">
                <IconButton label={adminCopy.nav.sectionLabel} icon={X} size="sm" onClick={closeDrawer} />
              </div>
              <div className="min-h-0 flex-1">
                <AdminNav
                  username={username}
                  onNavigate={closeDrawer}
                  onSignOut={handleSignOut}
                  isSigningOut={isSigningOut}
                />
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
