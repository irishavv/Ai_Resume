import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../common/Button.jsx';
import { adminCopy } from '../../constants/adminCopy.js';

/**
 * Shared page stepper for the paged console listings. Renders nothing while
 * everything fits on a single page, so short lists stay uncluttered.
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  unitLabel,
  onChange,
  isDisabled = false,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const current = page + 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-2xs text-ink-subtle">
        {totalItems} {unitLabel}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          leftIcon={ChevronLeft}
          disabled={isDisabled || page <= 0}
          onClick={() => onChange(page - 1)}
        >
          {adminCopy.conversations.previous}
        </Button>
        <span className="text-2xs tabular-nums text-ink-muted">
          {adminCopy.conversations.page} {current} {adminCopy.conversations.of} {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          rightIcon={ChevronRight}
          disabled={isDisabled || current >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {adminCopy.conversations.next}
        </Button>
      </div>
    </div>
  );
}
