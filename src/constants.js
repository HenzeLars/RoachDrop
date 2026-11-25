// Core constants for RoachDrop. No forbidden branding anywhere. 🪳

export const COLS = 10;
export const ROWS = 20;          // visible rows
export const HIDDEN = 2;         // spawn rows above the visible board
export const TOTAL_ROWS = ROWS + HIDDEN;

export const LOCK_DELAY = 500;   // ms of grace on ground contact
export const MAX_LOCK_RESETS = 15;

export const DAS = 150;          // delayed auto-shift (ms)
export const ARR = 40;           // auto-repeat rate (ms)
export const SOFT_DROP = 35;     // ms per cell while holding soft drop (~23x gravity)

export const LINES_PER_LEVEL = 10;

// Gravity in ms per cell, indexed by level (clamped). Lower = faster.
export const GRAVITY = [
  800, 720, 630, 550, 470, 380, 300, 220, 130, 100,
  80, 80, 80, 70, 70, 60, 60, 50, 50, 40,
];

// Neon palette
export const COLORS = {
  bg: '#0b0a10',
  grid: 'rgba(176, 38, 255, 0.08)',
  gridStrong: 'rgba(176, 38, 255, 0.16)',
  purple: '#b026ff',
  pink: '#ff2a85',
  cyan: '#22d3ee',
  text: '#e9e6ff',
  dim: '#8b86a8',
};

// Per-piece neon colors
export const PIECE_COLORS = {
  I: '#22d3ee',
  J: '#4f7cff',
  L: '#ff9f1c',
  O: '#ffe14d',
  S: '#39ff88',
  T: '#b026ff',
  Z: '#ff2a85',
};