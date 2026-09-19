/** @type {import('tailwindcss').Config} */
// ─── MCL Delivery — design tokens (Tailwind v3.4 JS config) ──────────────────
// Single source of truth for colour, type, spacing, radius, motion.
// Screens consume SEMANTIC names (bg-surface, text-fg-muted, border-line),
// never raw hex.
//
// LOOK: plain. White page, white panels, 1px grey rules, black text, one blue
// for actions. Separation comes from a border, never from a shadow or a tint.
// There are no elevation levels, no brand ramps, no decorative fills. If a
// value exists to look nice rather than to communicate, it is not here.
//
// CONTRAST CONTRACT (measured 2026-09-18, WCAG 2.1 relative luminance):
//   fg #111111        18.9:1 on white · 17.6:1 on #F7F7F7
//   fg-muted #555555   7.5:1 on white ·  7.0:1 on #F7F7F7   (fg-dim is an alias)
//   accent #1A56DB     6.2:1 as text on white AND 6.2:1 with white text on it
//   success/warn/danger/info  all 6.3–6.6:1 both ways on white
//   every -fg on its -soft tint  ≥6.4:1
//   line-strong #767676  4.5:1 — every ESSENTIAL boundary (inputs, controls)
//   line #C6C6C6         1.7:1 — structural rules only (card edges, row rules);
//                        never the sole means of identifying a control.

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ────────────────────────────────────────────────────────
        // Two values, total. White is the product; the grey is a FILL used
        // only where it aids comprehension (table head, disabled control,
        // hover). There is no "elevation" — nothing is above anything else.
        app: '#FFFFFF', // page
        surface: {
          DEFAULT: '#FFFFFF', // cards, panels, rows
          raised: '#F7F7F7', // table head, disabled control, footer fill
          high: '#EEEEEE', // hover / pressed only
          sunken: '#F7F7F7', // alias of raised — kept so screens compile
        },

        // ── Lines ───────────────────────────────────────────────────────────
        // Two values. `line` separates; `line-strong` identifies a control.
        line: {
          DEFAULT: '#C6C6C6', // card edges, table rules, dividers
          soft: '#C6C6C6', // alias — kept so screens compile
          strong: '#767676', // input / control borders (4.5:1)
        },

        // ── Text ────────────────────────────────────────────────────────────
        // Two tiers. `dim` is an alias of `muted`: the third tier is gone, so
        // the 300-odd `text-fg-dim` call sites got MORE legible, not less.
        fg: {
          DEFAULT: '#111111', // body — 18.9:1
          muted: '#555555', // secondary — 7.5:1
          dim: '#555555', // alias of muted
          inverse: '#FFFFFF', // text on a dark fill
        },

        // ── One accent ──────────────────────────────────────────────────────
        // A plain accessible blue. Primary buttons and links ONLY. Not a
        // border colour, not a rail, not a tint, not decoration.
        accent: {
          DEFAULT: '#1A56DB', // 6.2:1 as text, 6.2:1 as a fill under white
          hover: '#1443AE',
          press: '#0F3585',
          fg: '#FFFFFF',
          soft: '#EAF0FC', // selected-row tint
          line: '#A8C1EE', // selected-row edge
          bright: '#1A56DB', // alias — the brand hue is gone
          ink: '#111111', // alias
        },

        // ── Status ──────────────────────────────────────────────────────────
        // Functional, not decorative. DEFAULT is legible as text on white AND
        // as a fill under white. -fg is the text colour on -soft. -solid is
        // the button fill. Four names each, one flat value each.
        success: {
          DEFAULT: '#146B3A',
          fg: '#115C32',
          soft: '#E8F5EC',
          line: '#A8D3B8',
          solid: '#146B3A',
        },
        warn: {
          DEFAULT: '#8A5300',
          fg: '#6F4200',
          soft: '#FDF3E2',
          line: '#E3C489',
          solid: '#8A5300',
        },
        danger: {
          DEFAULT: '#B3261E',
          fg: '#96201A',
          soft: '#FCEBEA',
          line: '#EFB0AC',
          solid: '#B3261E',
        },
        info: {
          DEFAULT: '#1A56DB',
          fg: '#134BC4',
          soft: '#EAF0FC',
          line: '#A8C1EE',
          solid: '#1A56DB',
        },
        neutral: {
          soft: '#F2F2F2',
          fg: '#555555',
          line: '#C6C6C6',
        },

        // CodeBlock. Light now — a dark console well is styling, not content.
        code: {
          DEFAULT: '#F7F7F7',
          head: '#F7F7F7',
          fg: '#111111',
          muted: '#555555',
          line: '#C6C6C6',
        },
        // Device frames: one grey outline, nothing else.
        bezel: {
          DEFAULT: '#8C8C8C',
          edge: '#B0B0B0',
          glass: '#FFFFFF',
        },

        scrim: {
          DEFAULT: 'rgba(0, 0, 0, 0.40)',
          strong: 'rgba(0, 0, 0, 0.50)',
        },
      },

      fontFamily: {
        // Plain system stack. No webfont for Latin, no stylistic sets.
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'Menlo',
          'monospace',
        ],
        // Urdu / Nastaliq — UNCHANGED. `font-urdu` also sets line-height 2
        // (index.css); Nastaliq descends far below the baseline and its
        // diacritics collide at Latin leading. Pair with dir="rtl" lang="ur".
        urdu: [
          'Noto Nastaliq Urdu',
          'Jameel Noori Nastaleeq',
          'Urdu Typesetting',
          'serif',
        ],
      },

      // Type scale: MINOR THIRD (1.200) anchored on a 16px base, rounded to
      // whole pixels — 16 · 19 · 23 · 28 · 33 · 40 · 48. Below the base the
      // ratio would fall to 13.3/11.1px, so the three small steps are floored
      // at 14/13/12 instead: nothing in this product renders under 12px.
      // No letter-spacing on any step. Leading is generous (base is 1.5).
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }], // 12 / 16
        xs: ['0.8125rem', { lineHeight: '1.125rem' }], // 13 / 18
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14 / 20
        base: ['1rem', { lineHeight: '1.5rem' }], // 16 / 24  ← body
        md: ['1.1875rem', { lineHeight: '1.75rem' }], // 19 / 28
        lg: ['1.4375rem', { lineHeight: '2rem' }], // 23 / 32
        xl: ['1.75rem', { lineHeight: '2.25rem' }], // 28 / 36
        '2xl': ['2.0625rem', { lineHeight: '2.5rem' }], // 33 / 40
        '3xl': ['2.5rem', { lineHeight: '3rem' }], // 40 / 48
        '4xl': ['3rem', { lineHeight: '3.5rem' }], // 48 / 56
      },

      // 4px rhythm with half-steps for table padding.
      spacing: {
        px: '1px',
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        4.5: '1.125rem',
        5.5: '1.375rem',
        7.5: '1.875rem',
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        68: '17rem', // back-office sidebar
        112: '28rem',
      },

      // Nearly square. A plain box has a 2–4px corner, not a pill.
      borderRadius: {
        none: '0',
        xs: '0.125rem', // 2
        sm: '0.125rem', // 2
        DEFAULT: '0.1875rem', // 3
        md: '0.25rem', // 4
        lg: '0.25rem', // 4
        xl: '0.375rem', // 6
        '2xl': '0.5rem', // 8
        '3xl': '1.25rem', // 20 — device frame outline only
      },

      // No elevation. Separation is a 1px border. Every legacy shadow token is
      // kept as a NAME so the thirty screens that reference them still compile,
      // but every one resolves to `none`. The single exception is `pop`, used
      // by Modal and Drawer so an overlay reads as above the page — and it is
      // deliberately almost invisible.
      // Tailwind's own scale (DEFAULT/sm/md/lg/xl/2xl/inner) is flattened too,
      // so a stray `shadow-lg` from anywhere cannot reintroduce elevation.
      boxShadow: {
        none: 'none',
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        hair: 'none',
        card: 'none',
        raised: 'none',
        device: 'none',
        accent: 'none',
        knob: 'none',
        inset: 'none',
        pop: '0 2px 8px 0 rgba(0, 0, 0, 0.14)',
      },

      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out, entrances
        exit: 'cubic-bezier(0.4, 0, 1, 1)', // ease-in, exits
        standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '160ms',
        slow: '240ms',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'translate3d(0,6px,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'slide-left': {
          from: { transform: 'translate3d(100%,0,0)' },
          to: { transform: 'translate3d(0,0,0)' },
        },
        // RTL twin of slide-left — the drawer enters from the left under
        // dir="rtl". index.css swaps the animation-name on [dir='rtl'].
        'slide-right': {
          from: { transform: 'translate3d(-100%,0,0)' },
          to: { transform: 'translate3d(0,0,0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translate3d(0,10px,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16,1,0.3,1) both',
        'slide-left': 'slide-left 220ms cubic-bezier(0.32,0.72,0,1) both',
        'slide-right': 'slide-right 220ms cubic-bezier(0.32,0.72,0,1) both',
        'toast-in': 'toast-in 160ms cubic-bezier(0.16,1,0.3,1) both',
        spin: 'spin 700ms linear infinite',
      },

      zIndex: {
        drawer: '60',
        modal: '70',
        toast: '90',
      },
    },
  },
  plugins: [],
};
