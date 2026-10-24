import { Menu, Target } from 'lucide-react';
import IconButton from '../common/IconButton.jsx';
import PanelTabs from './PanelTabs.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

/** Sticky top bar shown below the large breakpoint. */
export default function TopBar({
  candidateName,
  onOpenSidebar,
  activeTab,
  onTabChange,
  onOpenJobMatch,
}) {
  const { settings } = useSiteSettings();
  const features = settings.features ?? {};
  const tagline = settings.site?.tagline?.trim() || copy.brand.tagline;
  const logoUrl = settings.site?.logoUrl?.trim();

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2">
      <IconButton
        label={copy.sidebar.openNavigation}
        icon={Menu}
        size="md"
        onClick={onOpenSidebar}
      />

      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="hidden h-7 w-7 shrink-0 rounded-md border border-line object-contain sm:block"
        />
      ) : null}

      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="truncate text-sm font-semibold text-ink">{candidateName}</p>
        <p className="truncate text-2xs text-ink-subtle">{tagline}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <PanelTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          showChat={features.chat !== false}
        />
        {features.jobMatch !== false ? (
          <IconButton
            label={copy.jobMatch.openPanel}
            icon={Target}
            size="md"
            onClick={onOpenJobMatch}
          />
        ) : null}
        {features.themeToggle !== false ? <ThemeToggle size="md" /> : null}
      </div>
    </header>
  );
}
