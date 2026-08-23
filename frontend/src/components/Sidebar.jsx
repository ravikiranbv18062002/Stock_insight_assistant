import { useAuth } from "../context/AuthContext";

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function Sidebar({
  conversations,
  activeLocalId,
  onSelect,
  onNewChat,
}) {
  const { email, logout } = useAuth();
  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark">
          <span className="dot" />
          Stock Insight
        </div>
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#22d3a7" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          New research
        </button>
      </div>

      <div className="conv-list">
        <div className="conv-list-label">Conversations</div>
        {conversations.length === 0 && (
          <div className="conv-empty">
            Nothing yet — start a new research thread above.
          </div>
        )}
        {conversations.map((c) => (
          <button
            key={c.localId}
            className={`conv-item ${c.localId === activeLocalId ? "active" : ""}`}
            onClick={() => onSelect(c.localId)}
          >
            <span className="conv-item-title">{c.title || "New conversation"}</span>
            <span className="conv-item-meta">{timeAgo(c.createdAt)} ago</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{initial}</div>
          <span className="user-email">{email}</span>
        </div>
        <button className="logout-btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
