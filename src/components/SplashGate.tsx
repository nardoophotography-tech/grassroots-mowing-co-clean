import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashGateProps {
  onEnter: () => void;
}

// ── Inline SVG: Mount Isa Mines Horizon Silhouette ────────────────────────
const MinesHorizon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1200 220"
    className="w-full"
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3D1A06" />
        <stop offset="100%" stopColor="#1A0A02" />
      </linearGradient>
      <linearGradient id="ridgeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2C1208" />
        <stop offset="100%" stopColor="#1A0A02" />
      </linearGradient>
    </defs>

    {/* Distant Selwyn Range ridge */}
    <path
      d="M0,95 L50,80 L100,88 L160,68 L220,78 L280,55 L340,70 L400,58 L460,72
         L520,50 L580,62 L640,44 L700,58 L760,42 L820,56 L880,46 L940,60 L1000,50
         L1060,65 L1120,52 L1200,70 L1200,220 L0,220 Z"
      fill="url(#ridgeGrad)"
      opacity="0.7"
    />

    {/* Mid-ground buildings — left cluster */}
    <rect x="150" y="110" width="70" height="80" fill="#1A0A02" />
    <rect x="170" y="90" width="25" height="25" fill="#120602" />
    <rect x="200" y="100" width="15" height="95" fill="#0D0401" />

    {/* Conveyor arm */}
    <line x1="220" y1="120" x2="300" y2="100" stroke="#1A0A02" strokeWidth="6" />

    {/* Central processing complex */}
    <rect x="320" y="80" width="90" height="110" fill="#120602" />
    <rect x="340" y="60" width="35" height="25" fill="#0D0401" />
    <rect x="380" y="70" width="20" height="30" fill="#150703" />

    {/* Ore processing tower — stepped silhouette */}
    <rect x="450" y="45" width="28" height="140" fill="#0D0401" />
    <rect x="438" y="85" width="52" height="28" fill="#120602" />
    <rect x="442" y="115" width="46" height="18" fill="#150703" />

    {/* Horizontal pipe/conveyor runs */}
    <rect x="478" y="75" width="80" height="8" fill="#0D0401" />
    <rect x="480" y="95" width="5" height="90" fill="#120602" />

    {/* ─── THE ICONIC MAIN CHIMNEY STACK (270m — dominant feature) ─── */}
    <rect x="590" y="-30" width="16" height="210" fill="#080301" />
    {/* Stack collar/base */}
    <rect x="582" y="168" width="32" height="22" fill="#120602" />
    {/* Faint red/white banding near top (aviation hazard) */}
    <rect x="590" y="10" width="16" height="12" fill="#3D0A06" opacity="0.8" />
    <rect x="590" y="35" width="16" height="8" fill="#3D0A06" opacity="0.6" />

    {/* Second stack (copper smelter) */}
    <rect x="630" y="20" width="11" height="160" fill="#0D0401" />
    <rect x="623" y="170" width="25" height="18" fill="#120602" />

    {/* Third shorter stack */}
    <rect x="655" y="55" width="8" height="125" fill="#150703" />

    {/* ─── MINE HEADFRAME (A-frame structure) ─── */}
    <polygon
      points="730,188 752,5 774,188"
      fill="none"
      stroke="#080301"
      strokeWidth="5"
    />
    {/* Headframe cross-braces */}
    <line x1="736" y1="150" x2="769" y2="150" stroke="#0D0401" strokeWidth="3" />
    <line x1="739" y1="110" x2="766" y2="110" stroke="#0D0401" strokeWidth="2.5" />
    <line x1="742" y1="75" x2="762" y2="75" stroke="#0D0401" strokeWidth="2" />
    {/* Headframe base building */}
    <rect x="736" y="178" width="32" height="22" fill="#0D0401" />
    {/* Winding cable */}
    <line x1="752" y1="5" x2="752" y2="178" stroke="#150703" strokeWidth="2" strokeDasharray="4,8" opacity="0.5" />

    {/* Right cluster — workshops */}
    <rect x="820" y="95" width="65" height="90" fill="#120602" />
    <rect x="840" y="78" width="28" height="22" fill="#0D0401" />
    <rect x="858" y="85" width="18" height="100" fill="#150703" />

    {/* Far right structures */}
    <rect x="940" y="105" width="50" height="80" fill="#1A0A02" />
    <rect x="955" y="88" width="22" height="22" fill="#120602" />

    {/* Sparse outback scrub on horizon */}
    <ellipse cx="120" cy="108" rx="18" ry="9" fill="#1A2E08" />
    <ellipse cx="270" cy="98" rx="14" ry="7" fill="#1A2E08" />
    <ellipse cx="890" cy="106" rx="20" ry="10" fill="#1A2E08" />
    <ellipse cx="1060" cy="102" rx="16" ry="8" fill="#1A2E08" />
    <ellipse cx="1150" cy="110" rx="12" ry="6" fill="#1A2E08" />

    {/* Red earth ground plane */}
    <rect x="0" y="178" width="1200" height="42" fill="#3D1A06" />

    {/* Ground texture — ochre dust specks */}
    {[80, 200, 350, 500, 700, 850, 1000, 1120].map((x, i) => (
      <ellipse key={i} cx={x} cy={185 + (i % 3) * 4} rx="4" ry="2" fill="#6B3210" opacity="0.5" />
    ))}
  </svg>
);

// ── Inline SVG: Totem figure ────────────────────────────────────────────
const TotemFigure = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 200"
    width="100"
    height="167"
    aria-hidden="true"
  >
    {/* Roots */}
    <path d="M55,185 C50,195 40,200 30,198" stroke="#4A2008" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M60,188 C60,198 55,205 48,205" stroke="#4A2008" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M65,185 C70,195 80,200 90,198" stroke="#4A2008" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M60,188 C65,200 72,205 72,205" stroke="#3D1A06" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M52,187 C45,200 38,205 35,205" stroke="#3D1A06" strokeWidth="2.5" fill="none" strokeLinecap="round" />

    {/* Body */}
    <rect x="50" y="100" width="20" height="85" rx="5" fill="#7C3D12" />

    {/* Spiral on torso */}
    <path d="M60,130 m0,0 a8,8 0 1,1 0.1,0" fill="none" stroke="#C8691B" strokeWidth="1.5" opacity="0.7" />

    {/* Legs */}
    <rect x="48" y="178" width="10" height="20" rx="4" fill="#5C2D0A" />
    <rect x="62" y="178" width="10" height="20" rx="4" fill="#5C2D0A" />

    {/* Left Arm — raised up-left */}
    <line x1="50" y1="115" x2="22" y2="90" stroke="#7C3D12" strokeWidth="10" strokeLinecap="round" />
    <circle cx="19" cy="86" r="6" fill="#8B4513" />
    {/* Left hand fingers */}
    <line x1="19" y1="80" x2="14" y2="72" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />
    <line x1="19" y1="80" x2="20" y2="70" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />
    <line x1="19" y1="80" x2="25" y2="73" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />

    {/* Right Arm — raised up-right */}
    <line x1="70" y1="115" x2="98" y2="90" stroke="#7C3D12" strokeWidth="10" strokeLinecap="round" />
    <circle cx="101" cy="86" r="6" fill="#8B4513" />
    {/* Right hand fingers */}
    <line x1="101" y1="80" x2="96" y2="72" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />
    <line x1="101" y1="80" x2="101" y2="70" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />
    <line x1="101" y1="80" x2="107" y2="73" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />

    {/* Head */}
    <ellipse cx="60" cy="90" rx="16" ry="18" fill="#8B4513" />
    {/* Headpiece / crown */}
    <line x1="52" y1="74" x2="48" y2="60" stroke="#C8691B" strokeWidth="3" strokeLinecap="round" />
    <line x1="57" y1="72" x2="55" y2="57" stroke="#C8691B" strokeWidth="3" strokeLinecap="round" />
    <line x1="63" y1="72" x2="63" y2="57" stroke="#C8691B" strokeWidth="3" strokeLinecap="round" />
    <line x1="68" y1="73" x2="72" y2="58" stroke="#C8691B" strokeWidth="3" strokeLinecap="round" />
    {/* Eyes */}
    <circle cx="54" cy="90" r="3" fill="#2C1A0A" />
    <circle cx="66" cy="90" r="3" fill="#2C1A0A" />
    {/* Eye shine */}
    <circle cx="55" cy="89" r="1" fill="#F7F4EB" />
    <circle cx="67" cy="89" r="1" fill="#F7F4EB" />
    {/* Mouth */}
    <path d="M54,98 Q60,103 66,98" fill="none" stroke="#5C2D0A" strokeWidth="2" strokeLinecap="round" />

    {/* Spiral pattern on head */}
    <circle cx="60" cy="90" r="8" fill="none" stroke="#C8691B" strokeWidth="1" opacity="0.4" />

    {/* Grass base */}
    <ellipse cx="60" cy="195" rx="40" ry="8" fill="#1A3A0A" opacity="0.6" />
    {[30, 38, 46, 54, 62, 70, 78, 86, 92].map((x, i) => (
      <path
        key={i}
        d={`M${x},195 C${x - 3 + (i % 3) * 2},${180 + (i % 2) * 5} ${x + 2},${170 + (i % 3) * 4} ${x + (i % 2 === 0 ? -4 : 4)},${160 + (i % 3) * 6}`}
        stroke="#2C5F2E"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
    ))}
  </svg>
);

// ── Concentric dot-art circles ─────────────────────────────────────────
const DotArtCircles = ({ cx = 50, cy = 50, maxR = 48 }: { cx?: number; cy?: number; maxR?: number }) => {
  const rings = [maxR, maxR * 0.75, maxR * 0.52, maxR * 0.32, maxR * 0.15];
  const dotCounts = [16, 12, 9, 6, 0];
  const colors = ['#C8691B', '#8B4513', '#C8691B', '#D4A85A', '#C8691B'];

  return (
    <g>
      {rings.map((r, ri) => (
        <g key={ri}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors[ri]} strokeWidth={ri === 0 ? 2 : 1.5}
            strokeDasharray={ri % 2 === 1 ? '3,4' : undefined} opacity={0.85} />
          {Array.from({ length: dotCounts[ri] }, (_, di) => {
            const angle = (di / dotCounts[ri]) * Math.PI * 2 - Math.PI / 2;
            const dx = cx + r * Math.cos(angle);
            const dy = cy + r * Math.sin(angle);
            return <circle key={di} cx={dx} cy={dy} r={ri === 0 ? 2.5 : ri === 1 ? 2 : 1.8} fill={colors[ri]} opacity={0.9} />;
          })}
        </g>
      ))}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4} fill="#C8691B" />
    </g>
  );
};

// ── Dot art border strip ───────────────────────────────────────────────
const DotArtBorder = ({ height = 60 }: { height?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 400 ${height}`} className="w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {/* Background strip */}
    <rect width="400" height={height} fill="#3D1A06" />
    {/* Clusters of concentric arcs */}
    {[40, 120, 200, 280, 360].map((x, i) => (
      <g key={i}>
        {[24, 18, 12, 6].map((r, ri) => (
          <circle key={ri} cx={x} cy={height} r={r} fill="none"
            stroke={ri % 2 === 0 ? '#C8691B' : '#D4A85A'} strokeWidth={1.5}
            strokeDasharray={ri % 2 === 1 ? '2,3' : undefined} opacity={0.8} />
        ))}
        {/* Dots along top arc */}
        {Array.from({ length: 8 }, (_, di) => {
          const angle = Math.PI + (di / 7) * Math.PI;
          return (
            <circle key={di} cx={x + 24 * Math.cos(angle)} cy={height + 24 * Math.sin(angle)}
              r={2} fill="#C8691B" opacity={0.9} />
          );
        })}
      </g>
    ))}
    {/* Horizontal dotted connectors */}
    <line x1="40" y1={height / 2} x2="360" y2={height / 2} stroke="#8B4513" strokeWidth={1}
      strokeDasharray="4,6" opacity={0.4} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main SplashGate Component
// ─────────────────────────────────────────────────────────────────────────────
export const SplashGate: React.FC<SplashGateProps> = ({ onEnter }) => {
  const [exiting, setExiting] = React.useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 700);
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col overflow-hidden select-none"
          style={{ background: 'linear-gradient(180deg, #0A1A0A 0%, #142814 12%, #1E4020 28%, #4A7A28 42%, #6B4A18 58%, #8B3A08 72%, #5C2008 88%, #2C0E04 100%)' }}
        >
          {/* ── Top dot-art border ───────────────────────────────────── */}
          <div className="shrink-0">
            <DotArtBorder height={48} />
          </div>

          {/* ── Main content area ────────────────────────────────────── */}
          <div className="flex-1 relative flex flex-col items-center justify-between px-6 py-4 overflow-hidden">

            {/* Large background concentric circles — artistic overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 400 400" className="w-full max-w-2xl opacity-15" aria-hidden="true">
                <DotArtCircles cx={200} cy={200} maxR={195} />
              </svg>
            </div>

            {/* Corner dot clusters */}
            <svg className="absolute top-4 left-4 opacity-30 pointer-events-none" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
              <DotArtCircles cx={20} cy={20} maxR={18} />
            </svg>
            <svg className="absolute top-4 right-4 opacity-30 pointer-events-none" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
              <DotArtCircles cx={80} cy={20} maxR={18} />
            </svg>

            {/* ── Logo ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
              className="relative z-10 text-center pt-2"
            >
              <div className="inline-flex items-center gap-3 mb-1">
                {/* Small totem icon in header */}
                <svg viewBox="0 0 30 40" width="24" height="32" aria-hidden="true">
                  <ellipse cx="15" cy="22" rx="5" ry="6" fill="#8B4513" />
                  <rect x="12" y="26" width="6" height="12" rx="2" fill="#7C3D12" />
                  <line x1="12" y1="28" x2="5" y2="22" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />
                  <line x1="18" y1="28" x2="25" y2="22" stroke="#7C3D12" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <h1
                  className="text-4xl md:text-5xl font-black tracking-tight"
                  style={{ color: '#F7F4EB', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
                >
                  Grass<span style={{ color: '#C8691B' }}>Roots</span>
                </h1>
              </div>
              <p
                className="text-xs md:text-sm tracking-[0.35em] uppercase font-semibold"
                style={{ color: '#D4A85A' }}
              >
                Mowing Co.
              </p>
              <div className="mt-1 h-px w-32 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #C8691B, transparent)' }} />
            </motion.div>

            {/* ── Central totem figure + tagline ───────────────────── */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }}
                style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}
              >
                <TotemFigure />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-center"
              >
                <p className="text-xs tracking-[0.25em] uppercase font-medium" style={{ color: '#D4A85A' }}>
                  Professional Yard Restoration
                </p>
                <p className="text-xs tracking-[0.15em] mt-0.5" style={{ color: '#A0845A', opacity: 0.8 }}>
                  Mount Isa &amp; Region · Est. 2024
                </p>
              </motion.div>

              {/* ── Enter / Book button ─────────────────────────────── */}
              <motion.button
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.5, ease: 'easeOut' }}
                onClick={handleEnter}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="relative mt-2 px-10 py-3.5 text-sm font-black tracking-[0.2em] uppercase rounded-full cursor-pointer overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #C8691B 0%, #8B3A08 50%, #C8691B 100%)',
                  color: '#F7F4EB',
                  boxShadow: '0 0 40px rgba(200, 105, 27, 0.5), 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,220,150,0.25)',
                  border: '1.5px solid rgba(200,140,60,0.5)',
                }}
              >
                {/* Shimmer overlay */}
                <span
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{ background: 'linear-gradient(135deg, rgba(255,220,150,0.3) 0%, transparent 50%, rgba(255,220,150,0.1) 100%)' }}
                />
                <span className="relative z-10">View Our Web App</span>
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="text-[10px] tracking-widest uppercase text-center"
                style={{ color: '#8B6A40', opacity: 0.7 }}
              >
                Check Availability · Book Your Restoration
              </motion.p>
            </div>

            {/* ── Acknowledgment of Country strip ─────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="relative z-10 text-center max-w-sm px-4 pb-2"
            >
              <p className="text-[9px] leading-relaxed" style={{ color: '#8B6A40', opacity: 0.65 }}>
                GrassRoots Mowing Co. acknowledges the Traditional Custodians of the land on which we operate in Mount Isa and surrounding regions.
              </p>
            </motion.div>
          </div>

          {/* ── Mount Isa Mines Horizon ──────────────────────────────── */}
          <div className="shrink-0 relative" style={{ marginTop: '-2px' }}>
            <MinesHorizon />
          </div>

          {/* ── Bottom dot-art border ────────────────────────────────── */}
          <div className="shrink-0">
            <DotArtBorder height={40} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
