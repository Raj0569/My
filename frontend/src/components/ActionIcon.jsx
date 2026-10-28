const icons = {
  view: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  edit: <><path d="m14 5 5 5" /><path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16v4Z" /></>,
  delete: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m5 7 1 13h12l1-13M9 7V4h6v3" /></>,
};

export default function ActionIcon({ action, label, onClick, className = "", disabled = false }) {
  return <button type="button" className={`action-icon ${action === "delete" ? "danger" : ""} ${className}`} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
    <svg viewBox="0 0 24 24" aria-hidden="true">{icons[action]}</svg>
  </button>;
}
