import { useRef, useState } from "react";

export default function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="composer">
      <div className="composer-inner">
        <div className="composer-box">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about a stock you've ingested, e.g. Tesla…"
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <button
            className="send-btn"
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12l16-8-6 8 6 8-16-8z"
                stroke="#05130f"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="#05130f"
              />
            </svg>
          </button>
        </div>
        <div className="composer-hint">Enter to send · Shift + Enter for a new line</div>
      </div>
    </div>
  );
}
