const PROMPTS = [
  "What's going on with Tesla recently?",
  "What was Tesla's closing price recently?",
  "Why did Tesla stock move recently?",
];

export default function EmptyState({ onPick }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 17l5-5 4 4 8-8M20 8v6"
            stroke="#22d3a7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2>Ask the market anything</h2>
      <p>
        Combines live price data and recent news for stocks that have been
        ingested into the system. Start with a company you know is covered.
      </p>
      <div className="prompt-chips">
        {PROMPTS.map((p) => (
          <button key={p} className="prompt-chip" onClick={() => onPick(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
