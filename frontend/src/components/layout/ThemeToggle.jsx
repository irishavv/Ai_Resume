import { Moon, Sun } from 'lucide-react';
import IconButton from '../common/IconButton.jsx';
import useTheme from '../../hooks/useTheme.js';
import { copy } from '../../constants/copy.js';

/** Single toggle that stays in sync everywhere it is rendered. */
export default function ThemeToggle({ size = 'sm', variant = 'ghost', className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? copy.a11y.themeToggleLight : copy.a11y.themeToggleDark;

  return (
    <IconButton
      label={label}
      icon={isDark ? Sun : Moon}
      onClick={toggleTheme}
      size={size}
      variant={variant}
      className={className}
    />
  );
}
