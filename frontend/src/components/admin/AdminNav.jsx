import { NavLink } from 'react-router-dom';
import {
  FileUp,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ScrollText,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import Button from '../common/Button.jsx';
import { adminCopy } from '../../constants/adminCopy.js';

export const ADMIN_NAV_ITEMS = [
  { to: '/admin', end: true, label: adminCopy.nav.overview, Icon: LayoutDashboard },
  { to: '/admin/profile', label: adminCopy.nav.profile, Icon: UserRound },
  { to: '/admin/resume', label: adminCopy.nav.resume, Icon: FileUp },
  { to: '/admin/settings', label: adminCopy.nav.settings, Icon: Settings2 },
  { to: '/admin/conversations', label: adminCopy.nav.conversations, Icon: MessagesSquare },
  { to: '/admin/ai', label: adminCopy.nav.ai, Icon: Sparkles },
  { to: '/admin/audit', label: adminCopy.nav.audit, Icon: ScrollText },
];

/** Console navigation. Also rendered inside the mobile drawer. */
export default function AdminNav({ onNavigate, onSignOut, username, isSigningOut = false }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-ink">{adminCopy.brand.name}</p>
        <p className="text-2xs text-ink-subtle">{adminCopy.brand.tagline}</p>
      </div>

      <nav aria-label={adminCopy.nav.sectionLabel} className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {ADMIN_NAV_ITEMS.map(({ to, end, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line px-3 py-3">
        {username ? (
          <p className="truncate px-1 text-2xs text-ink-subtle">
            {adminCopy.nav.signedInAs} <span className="font-medium text-ink-muted">{username}</span>
          </p>
        ) : null}
        <Button
          fullWidth
          size="sm"
          variant="outline"
          leftIcon={LogOut}
          onClick={onSignOut}
          isLoading={isSigningOut}
        >
          {adminCopy.nav.signOut}
        </Button>
        <a
          href="/"
          className="block rounded-lg px-2.5 py-1.5 text-center text-2xs font-medium text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {adminCopy.nav.backToSite}
        </a>
      </div>
    </div>
  );
}
