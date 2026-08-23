import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../hooks/useConversations";
import { api, ApiError } from "../lib/api";
import Sidebar from "../components/Sidebar";
import StatusPill from "../components/StatusPill";
import MessageBubble from "../components/MessageBubble";
import Composer from "../components/Composer";
import EmptyState from "../components/EmptyState";

export default function ChatPage() {
  const { token, email, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    activeLocalId,
    setActiveLocalId,
    createConversation,
    appendMessage,
    setBackendId,
  } = useConversations(email);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [activeConversation?.messages?.length, sending]);

  const ensureConversation = () => {
    if (activeLocalId) return activeLocalId;
    return createConversation();
  };

  const handleSend = async (text) => {
    setError("");
    const localId = ensureConversation();

    appendMessage(localId, { role: "human", content: text, ts: Date.now() });
    setSending(true);

    try {
      const current = conversations.find((c) => c.localId === localId);
      const backendId = current?.backendId ?? null;

      const res = await api.chat(token, text, backendId);

      if (!backendId) {
        setBackendId(localId, res.conversation_id);
      }
      appendMessage(localId, { role: "ai", content: res.answer, ts: Date.now() });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setError(err.message || "Something went wrong sending that message.");
    } finally {
      setSending(false);
    }
  };

  const messages = activeConversation?.messages || [];
  const title = activeConversation?.title || "New conversation";

  return (
    <div className="chat-shell">
      <Sidebar
        conversations={conversations}
        activeLocalId={activeLocalId}
        onSelect={setActiveLocalId}
        onNewChat={createConversation}
      />

      <div className="chat-main">
        <div className="chat-topbar">
          <div className="chat-topbar-title">
            {activeConversation ? title : "Stock Insight Assistant"}
          </div>
          <StatusPill />
        </div>

        {!activeConversation || messages.length === 0 ? (
          <EmptyState onPick={handleSend} />
        ) : (
          <div className="message-feed" ref={feedRef}>
            <div className="message-feed-inner">
              {messages.map((m, i) => (
                <MessageBubble key={i} role={m.role} content={m.content} ts={m.ts} />
              ))}
              {sending && (
                <div className="thinking-row">
                  <div className="thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  analyzing
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <div className="error-banner-inner">{error}</div>
          </div>
        )}

        <Composer onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
