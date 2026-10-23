/** Original flat illustration of everyday hardware stock. Replace with a real shop photo from the admin once available. */
export function HeroArt() {
  return (
    <svg viewBox="0 0 520 440" role="img" aria-label="Illustration of plywood sheets, pipes, a paint tin and a brush" className="h-auto w-full">
      <rect x="0" y="372" width="520" height="68" fill="#f1f0ec" />
      <rect x="0" y="372" width="520" height="4" fill="#1f2326" />

      {/* plywood stack */}
      <g>
        <rect x="28" y="318" width="214" height="16" fill="#d9a35f" />
        <rect x="28" y="334" width="214" height="16" fill="#c28a45" />
        <rect x="28" y="350" width="214" height="22" fill="#d9a35f" />
        <rect x="20" y="302" width="214" height="16" fill="#e8b878" />
        <path d="M30 310h60M110 309h90M44 326h80M150 327h70M36 342h100M160 343h60M40 360h70M130 361h90" stroke="#a9763a" strokeWidth="1.5" />
      </g>

      {/* pipes, standing */}
      <g>
        <rect x="270" y="132" width="46" height="240" rx="3" fill="#ffffff" stroke="#1f2326" strokeWidth="3" />
        <rect x="262" y="132" width="62" height="20" rx="3" fill="#dfe6e2" stroke="#1f2326" strokeWidth="3" />
        <rect x="326" y="186" width="42" height="186" rx="3" fill="#1d4b38" stroke="#1f2326" strokeWidth="3" />
        <rect x="319" y="186" width="56" height="18" rx="3" fill="#2d6a52" stroke="#1f2326" strokeWidth="3" />
        <rect x="378" y="236" width="36" height="136" rx="3" fill="#ffffff" stroke="#1f2326" strokeWidth="3" />
        <rect x="372" y="236" width="48" height="16" rx="3" fill="#dfe6e2" stroke="#1f2326" strokeWidth="3" />
      </g>

      {/* paint tin */}
      <g>
        <rect x="428" y="276" width="78" height="96" rx="4" fill="#f2b705" stroke="#1f2326" strokeWidth="3" />
        <rect x="422" y="266" width="90" height="16" rx="4" fill="#d9d7d0" stroke="#1f2326" strokeWidth="3" />
        <rect x="438" y="304" width="58" height="32" fill="#ffffff" stroke="#1f2326" strokeWidth="2" />
        <text x="467" y="326" textAnchor="middle" fontFamily="var(--font-heading), sans-serif" fontWeight="800" fontSize="17" fill="#1d4b38">
          SS
        </text>
        <path d="M440 282c0 14 6 14 6 24" stroke="#f2b705" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* brush leaning on the plywood */}
      <g transform="rotate(-24 150 220)">
        <rect x="142" y="120" width="16" height="110" rx="6" fill="#1d4b38" stroke="#1f2326" strokeWidth="3" />
        <rect x="139" y="228" width="22" height="20" fill="#c9ced1" stroke="#1f2326" strokeWidth="3" />
        <rect x="136" y="246" width="28" height="36" rx="3" fill="#f2b705" stroke="#1f2326" strokeWidth="3" />
        <path d="M144 252v26M150 252v26M156 252v26" stroke="#1f2326" strokeWidth="1.5" />
      </g>

      {/* tape-measure strip across the top of the scene */}
      <rect x="20" y="40" width="480" height="30" fill="#f2b705" stroke="#1f2326" strokeWidth="3" />
      <g stroke="#1f2326">
        {Array.from({ length: 48 }, (_, i) => {
          const x = 28 + i * 10;
          const tall = i % 5 === 0;
          return <line key={i} x1={x} y1="40" x2={x} y2={tall ? 60 : 52} strokeWidth={tall ? 2 : 1.25} />;
        })}
      </g>
    </svg>
  );
}
