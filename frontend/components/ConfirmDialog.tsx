"use client";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-sm p-6">
        <h2 className="text-xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-danger-solid">
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
