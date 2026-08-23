import { useCallback, useEffect, useState } from "react";

// The chat-service API only exposes POST /chat (which returns a conversation_id)
// and has no endpoint to list past conversations or fetch their message history.
// So conversation titles + message text are kept client-side, scoped per user email.
// This means history is local to the browser/device it was created on.

function storageKey(email) {
  return `sia_conversations_${email}`;
}

function loadAll(email) {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useConversations(email) {
  const [conversations, setConversations] = useState([]);
  const [activeLocalId, setActiveLocalId] = useState(null);

  useEffect(() => {
    if (!email) return;
    setConversations(loadAll(email));
    setActiveLocalId(null);
  }, [email]);

  const persist = useCallback(
    (next) => {
      setConversations(next);
      if (email) {
        localStorage.setItem(storageKey(email), JSON.stringify(next));
      }
    },
    [email]
  );

  const createConversation = useCallback(() => {
    const localId = `local-${Date.now()}`;
    const fresh = {
      localId,
      backendId: null,
      title: null,
      messages: [],
      createdAt: Date.now(),
    };
    persist([fresh, ...conversations]);
    setActiveLocalId(localId);
    return localId;
  }, [conversations, persist]);

  const appendMessage = useCallback(
    (localId, message) => {
      const next = conversations.map((c) => {
        if (c.localId !== localId) return c;
        const messages = [...c.messages, message];
        const title = c.title || (message.role === "human" ? message.content.slice(0, 60) : c.title);
        return { ...c, messages, title };
      });
      persist(next);
    },
    [conversations, persist]
  );

  const setBackendId = useCallback(
    (localId, backendId) => {
      const next = conversations.map((c) =>
        c.localId === localId ? { ...c, backendId } : c
      );
      persist(next);
    },
    [conversations, persist]
  );

  const deleteConversation = useCallback(
    (localId) => {
      const next = conversations.filter((c) => c.localId !== localId);
      persist(next);
      if (activeLocalId === localId) setActiveLocalId(null);
    },
    [conversations, persist, activeLocalId]
  );

  const activeConversation = conversations.find((c) => c.localId === activeLocalId) || null;

  return {
    conversations,
    activeConversation,
    activeLocalId,
    setActiveLocalId,
    createConversation,
    appendMessage,
    setBackendId,
    deleteConversation,
  };
}
