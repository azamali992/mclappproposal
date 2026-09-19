// ─── MCL Delivery — design tokens (TS mirror) ────────────────────────────────
// The Tailwind config is the source of truth for class names; this file is the
// source of truth for values needed in JS: SVG charts, the signature canvas,
// device frames. Keep the two in sync — they are the same numbers.
//
// LOOK: plain. White ground, 1px grey rules, black text, one blue for actions.
// No ramps, no tints beyond the pale status fills, no decoration.

export const color = {
  app: '#FFFFFF',

  surface: '#FFFFFF',
  /** The one fill grey: table head, disabled control, footer. */
  surfaceRaised: '#F7F7F7',
  /** Hover / pressed only. */
  surfaceHigh: '#EEEEEE',
  /** Alias of surfaceRaised. */
  surfaceSunken: '#F7F7F7',

  /** Structural rules: card edges, table rules. 1.7:1 — separation, not a
   *  control boundary. */
  line: '#C6C6C6',
  /** Alias of `line`. */
  lineSoft: '#C6C6C6',
  /** Essential boundaries: inputs, controls. 4.5:1 on white. */
  lineStrong: '#767676',

  fg: '#111111',
  fgMuted: '#555555',
  /** Alias of fgMuted — the third text tier was removed. */
  fgDim: '#555555',
  fgInverse: '#FFFFFF',

  /** The single accent. 6.2:1 as text on white, 6.2:1 with white text on it. */
  accent: '#1A56DB',
  accentHover: '#1443AE',
  accentPress: '#0F3585',
  accentSoft: '#EAF0FC',
  accentLine: '#A8C1EE',
  /** Alias — there is no second brand hue any more. */
  accentBright: '#1A56DB',
  /** Alias of fg. */
  accentInk: '#111111',

  success: '#146B3A',
  successSoft: '#E8F5EC',
  warn: '#8A5300',
  warnSoft: '#FDF3E2',
  danger: '#B3261E',
  dangerSoft: '#FCEBEA',
  info: '#1A56DB',
  infoSoft: '#EAF0FC',

  // CodeBlock — light, like everything else.
  codeBg: '#F7F7F7',
  codeHead: '#F7F7F7',
  codeFg: '#111111',
  codeMuted: '#555555',
  codeLine: '#C6C6C6',

  /** Signature canvas: black ink on white paper. */
  paper: '#FFFFFF',
  ink: '#111111',
} as const;

/** Semantic tone → { text, background, border, solid } raw values. */
export const toneColor = {
  neutral: { fg: '#555555', bg: '#F2F2F2', line: '#C6C6C6', solid: '#555555' },
  info: { fg: '#134BC4', bg: '#EAF0FC', line: '#A8C1EE', solid: '#1A56DB' },
  warn: { fg: '#6F4200', bg: '#FDF3E2', line: '#E3C489', solid: '#8A5300' },
  danger: { fg: '#96201A', bg: '#FCEBEA', line: '#EFB0AC', solid: '#B3261E' },
  success: { fg: '#115C32', bg: '#E8F5EC', line: '#A8D3B8', solid: '#146B3A' },
} as const;

export type Tone = keyof typeof toneColor;

/**
 * Type scale — minor third (1.200) anchored on a 16px base, rounded to whole
 * pixels: 16 · 19 · 23 · 28 · 33 · 40 · 48. Below the base the ratio would
 * fall to 13.3/11.1px, so the three small steps are floored at 14/13/12.
 * Nothing in this product renders under 12px.
 */
export const typeScale = {
  ratio: 1.2,
  base: 16,
  sizes: {
    '2xs': 12,
    xs: 13,
    sm: 14,
    base: 16,
    md: 19,
    lg: 23,
    xl: 28,
    '2xl': 33,
    '3xl': 40,
    '4xl': 48,
  },
} as const;

export const radius = {
  xs: 2,
  sm: 2,
  base: 3,
  md: 4,
  lg: 4,
  xl: 6,
  '2xl': 8,
  '3xl': 20,
} as const;

export const motion = {
  fast: 120,
  base: 160,
  slow: 240,
  entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/**
 * Chart series colours, ordered. Accent first — it is the primary series;
 * grey second — it is the comparison. Every entry is >=4.5:1 on white (the
 * plot ground), and the set is distinguishable without colour vision because
 * the luminances are spread, not just the hues.
 */
export const chartSeries = [
  '#1A56DB', // accent blue   6.2:1
  '#767676', // neutral grey  4.5:1
  '#146B3A', // success green 6.6:1
  '#8A5300', // warn amber    6.3:1
  '#B3261E', // danger red    6.5:1
  '#111111', // black        18.9:1
] as const;

/** Chart furniture. Gridlines are faint; anything carrying data clears 3:1. */
export const chartInk = {
  /** Thin gridlines — furniture, deliberately quiet. */
  grid: '#D9D9D9',
  /** Axis labels — text, so it passes as text. 18.9:1. */
  axis: '#111111',
  /** Empty track behind a donut/progress ring. */
  track: '#EEEEEE',
  /** Comparison / target bar fill. 4.5:1 on white — it carries data. */
  ghost: '#767676',
  /** Alias of `ghost` — there is no separate cap mark any more. */
  ghostCap: '#767676',
  /** Alias of the plot ground. There is no cap highlight. */
  capHighlight: '#FFFFFF',
} as const;

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
