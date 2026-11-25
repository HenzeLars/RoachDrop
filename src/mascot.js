// Bearded cockroach mascot — original inline SVG with reactive states. 🪳
// States: idle, hype, hop, wing, pop, spin, drop, rip. No external assets.

export const MASCOT_SVG = `
<svg viewBox="0 0 100 100" class="roach-svg" aria-label="Roach mascot">
  <defs>
    <radialGradient id="shell" cx="40%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#caa64b"/>
      <stop offset="55%" stop-color="#8a5a1e"/>
      <stop offset="100%" stop-color="#4a2c0c"/>
    </radialGradient>
  </defs>
  <!-- wings (hidden unless .wing state) -->
  <g class="wings">
    <ellipse class="wing wing-l" cx="30" cy="54" rx="16" ry="8" fill="#caa64b" opacity="0.85" stroke="#2a1806" stroke-width="1"/>
    <ellipse class="wing wing-r" cx="70" cy="54" rx="16" ry="8" fill="#caa64b" opacity="0.85" stroke="#2a1806" stroke-width="1"/>
  </g>
  <!-- antennae -->
  <path class="antenna" d="M38 30 Q 22 8 10 14" stroke="#caa64b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path class="antenna" d="M62 30 Q 78 8 90 14" stroke="#caa64b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- legs (6 total — it's a roach) -->
  <g stroke="#6b4413" stroke-width="2.5" stroke-linecap="round">
    <path d="M32 50 L 16 52"/><path d="M30 60 L 12 66"/><path d="M30 70 L 16 80"/>
    <path d="M68 50 L 84 52"/><path d="M70 60 L 88 66"/><path d="M70 70 L 84 80"/>
  </g>
  <!-- body shell -->
  <ellipse cx="50" cy="58" rx="24" ry="30" fill="url(#shell)" stroke="#2a1806" stroke-width="1.5"/>
  <line x1="50" y1="34" x2="50" y2="86" stroke="#2a1806" stroke-width="1.2" opacity="0.6"/>
  <!-- head -->
  <circle cx="50" cy="34" r="15" fill="#7a4e18" stroke="#2a1806" stroke-width="1.5"/>
  <!-- eyes -->
  <g class="eyes">
    <circle cx="44" cy="32" r="3.2" fill="#0b0a10"/>
    <circle cx="56" cy="32" r="3.2" fill="#0b0a10"/>
    <circle cx="45" cy="31" r="1" fill="#fff"/>
    <circle cx="57" cy="31" r="1" fill="#fff"/>
  </g>
  <!-- beard -->
  <path class="beard" d="M40 42 Q 50 60 60 42 Q 56 50 50 52 Q 44 50 40 42 Z" fill="#e9e6ff" stroke="#b9b4d6" stroke-width="0.8"/>
  <!-- mouth -->
  <path class="mouth" d="M45 44 Q 50 48 55 44" stroke="#0b0a10" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`;

// One-shot action states revert to idle after their animation.
const ONE_SHOT = new Set(['hop', 'wing', 'pop', 'spin', 'drop', 'hype']);
let revertTimer = null;

// Swap the wrapper state that drives CSS animations. One-shots auto-revert.
export function setMascotState(el, state, holdMs = 0) {
  if (!el) return;
  if (revertTimer) { clearTimeout(revertTimer); revertTimer = null; }
  el.dataset.state = state;
  // Restart animation even if the same state is re-triggered.
  el.classList.remove('anim-reset');
  void el.offsetWidth;
  el.classList.add('anim-reset');
  if (ONE_SHOT.has(state)) {
    const ms = holdMs || ({ hop: 400, wing: 600, pop: 700, spin: 900, drop: 900, hype: 500 }[state] || 600);
    revertTimer = setTimeout(() => {
      if (el.dataset.state === state) el.dataset.state = 'idle';
      revertTimer = null;
    }, ms);
  }
}