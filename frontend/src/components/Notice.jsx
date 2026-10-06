export default function Notice({ error, success, onClose }) {
  if (!error && !success) return null;
  return (
    <div className={`notice ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
      <span>{error || success}</span>
      {onClose && <button type="button" className="link" onClick={onClose}>Dismiss</button>}
    </div>
  );
}
