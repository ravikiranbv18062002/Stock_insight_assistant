const POINTS = [18, 24, 20, 32, 28, 40, 36, 52, 46, 60, 54, 68, 62, 74];

function toPath(points, width, height) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const step = width / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / (max - min)) * (height - 10) - 5;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function Sparkline() {
  const width = 420;
  const height = 130;
  const linePath = toPath(POINTS, width, height);
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const length = width * 1.4;

  return (
    <svg
      className="sparkline-wrap"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3a7" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22d3a7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <path
        d={linePath}
        stroke="#22d3a7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: "draw 1.6s ease forwards 0.2s",
        }}
      />
      <style>{`
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}
