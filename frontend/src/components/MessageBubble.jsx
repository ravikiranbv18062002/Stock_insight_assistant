import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ role, content, ts }) {
  const isAi = role === "ai";

  return (
    <div className={`msg-row ${isAi ? "ai" : "human"}`}>
      <div className="msg-meta">
        <span className={`msg-tag ${isAi ? "ai" : "human"}`}>
          {isAi ? "ASSISTANT" : "YOU"}
        </span>
        <span className="msg-time">{formatTime(ts)}</span>
      </div>
      <div className="msg-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="msg-table-wrap">
                <table>{children}</table>
              </div>
            ),
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
