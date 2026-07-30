import Modal from './Modal';
import styles from './Dialog.module.css';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  function handleClose() {
    if (pending) {
      return;
    }
    onCancel();
  }

  return (
    <Modal label={title} onClose={handleClose}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} disabled={pending} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? `${styles.confirm} ${styles.danger}` : styles.confirm}
          disabled={pending}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
