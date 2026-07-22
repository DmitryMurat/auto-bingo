interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-yes" onClick={onConfirm}>
            Да
          </button>
          <button type="button" className="confirm-no" onClick={onCancel}>
            Нет
          </button>
        </div>
      </div>
    </div>
  );
}
