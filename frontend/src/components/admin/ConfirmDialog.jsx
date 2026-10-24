import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { copy } from '../../constants/copy.js';

/**
 * The confirmation step shared by the destructive console actions. While the
 * action runs the dialog cannot be dismissed, so a half-finished delete can
 * never be interrupted.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  isConfirming = false,
  tone = 'danger',
}) {
  return (
    <Modal
      open={open}
      onClose={isConfirming ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isConfirming}>
            {copy.sidebar.cancel}
          </Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isConfirming}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
    </Modal>
  );
}
