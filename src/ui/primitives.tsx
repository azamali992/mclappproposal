/* ═══════════════════════════════════════════════════════════════════════════
   MCL DELIVERY — UI PRIMITIVES.  Read this block before building a screen.

   LOOK: plain. A government service form or a well-built internal admin tool.
   White page, white panels, 1px grey rules, black text, one blue for actions.
   No shadows, no gradients, no tints, no rails, no stripes, no decoration.
   Separation comes from a border. Never write raw hex, never use Tailwind
   stock palettes (slate-, gray-, blue-). Use the semantic tokens below.

   SURFACES  bg-app = bg-surface = WHITE. bg-surface-raised (#F7F7F7) is the
             ONE fill grey — table head, disabled control, footer strip — and
             bg-surface-sunken is its alias. bg-surface-high (#EEEEEE) is for
             hover/pressed only. There are no elevation levels.
   LINES     border-line (#C6C6C6, 1.7:1) separates — card edges, table rules.
             border-line-strong (#767676, 4.5:1) IDENTIFIES a control — input
             borders, checkbox, toggle track. border-line-soft aliases `line`.
   TEXT      text-fg (#111111, 18.9:1) · text-fg-muted (#555555, 7.5:1).
             text-fg-dim is an ALIAS of muted — the third tier is gone.
             text-fg-inverse = white, for text on a dark or accent fill.
   ACCENT    One blue, #1A56DB: bg-accent / text-accent. 6.2:1 as text on
             white and 6.2:1 with white text on it. Primary buttons and links
             ONLY — never a border, a rail, a tint or decoration. Exactly ONE
             accent action per view: "the next thing to do".
   STATES    success #146B3A · warn #8A5300 · danger #B3261E · info #1A56DB.
             All 6.3-6.6:1 both as text on white and as a fill under white.
             -soft (pale tint) · -fg (text on -soft) · -line (tint border) ·
             -solid (button fill). Flat values, no ramps.
   TYPE      Minor third (1.200) on a 16px base: 16 19 23 28 33 40 48, with
             the small steps floored at 14/13/12. Headings 600 weight. No
             letter-spacing, no uppercase. Small labels: `.eyebrow` (which is
             now plain small bold grey, not an uppercase treatment).
   NUMBERS   Every quantity/currency/ECR is tabular. Use <Money>, <Qty>,
             <EcrTag>, or class `num` / `tabular-nums`. Non-negotiable.
   TARGETS   Buttons 40px (44px at size="lg"), inputs 40px, icon buttons 40px
             (44px at lg). Rows are roomy. Focus is a 2px black outline with a
             2px offset — visible on white, on grey and on the blue fill.
   MOTION    120/160/240ms, ease-entrance in, ease-exit out. Transform +
             opacity only. Reduced motion is handled globally in index.css.
   RTL/URDU  Primitives use logical properties (ps-/pe-, ms-/me-, start-/end-,
             border-s/e, text-start/end), so dir="rtl" flips them for free.
             For Urdu copy add lang="ur" (auto font + leading) or `font-urdu`.

   BUTTONS   primary = solid blue, the single committed action
             secondary = white with a grey border · ghost = plain text
             danger = solid red · success = solid green
   DENSITY   Back-office tables: py-3, text-sm. Driver tab & client phone:
             pass size="lg" to Button/NumberStepper for 44px targets.
   LISTS     Every list needs <EmptyState/> and <Skeleton/>. No exceptions.
   ═══════════════════════════════════════════════════════════════════════ */

import { useT } from '../i18n';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { color } from './tokens';
import type { OrderStatus } from '../core/types';
import { PIPELINE, STATUS_LABEL, STATUS_TONE } from '../core/stateMachine';
import {
  Alert,
  Battery,
  Check,
  CheckCircle,
  ChevronRight,
  Minus,
  Plus,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from './icons';
import type { IconProps } from './icons';

// ─── utils ───────────────────────────────────────────────────────────────────

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type Tone = 'neutral' | 'info' | 'warn' | 'danger' | 'success';

const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-fg border-neutral-line',
  info: 'bg-info-soft text-info-fg border-info-line',
  warn: 'bg-warn-soft text-warn-fg border-warn-line',
  danger: 'bg-danger-soft text-danger-fg border-danger-line',
  success: 'bg-success-soft text-success-fg border-success-line',
};

// The coloured left edge on a Toast. Full-strength status colours, so the
// 4px spine clears 3:1 on white and is legible as a signal, not a tint.
const TONE_BORDER: Record<Tone, string> = {
  neutral: 'border-s-fg-muted',
  info: 'border-s-info',
  warn: 'border-s-warn',
  danger: 'border-s-danger',
  success: 'border-s-success',
};

// A 6px dot is a non-text graphic: it must clear 3:1 on the surface it sits
// on. Every value here is >=4.5:1 on white.
const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-fg-muted',
  info: 'bg-info',
  warn: 'bg-warn',
  danger: 'bg-danger',
  success: 'bg-success',
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  info: 'text-info',
  warn: 'text-warn',
  danger: 'text-danger',
  success: 'text-success',
};

/**
 * Shared focus treatment. One ring, everywhere, always visible.
 * Black rather than accent-coloured: a blue ring disappears on the blue
 * primary button, and it must not depend on the accent to be seen. 2px ring +
 * 2px white offset reads on white, on the #F7F7F7 fill and on every solid
 * status fill.
 */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Leading icon component, e.g. `icon={Truck}`. */
  icon?: (props: IconProps) => JSX.Element;
  /** Place the icon after the label. */
  iconRight?: boolean;
  block?: boolean;
  children?: ReactNode;
}

// Plain button set. Three shapes, nothing else:
//   primary   = solid accent fill, white label
//   secondary = white box with a grey border
//   ghost     = plain text, underlined on hover
//   danger / success = solid status fill, white label
// Hover is never colour alone: solid fills darken AND the label underlines;
// secondary darkens its border as well as its fill. Disabled is an explicit
// grey state, not an opacity wash — #F7F7F7 fill with #555555 text is 7.0:1,
// so a disabled control is still readable, just obviously inert.
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg border-accent font-semibold hover:bg-accent-hover hover:border-accent-hover hover:underline active:bg-accent-press ' +
    'disabled:bg-surface-raised disabled:text-fg-muted disabled:border-line disabled:no-underline',
  secondary:
    'bg-surface text-fg border-line-strong hover:bg-surface-raised hover:border-fg hover:underline active:bg-surface-high ' +
    'disabled:bg-surface-raised disabled:text-fg-muted disabled:border-line disabled:no-underline',
  ghost:
    'bg-transparent text-accent border-transparent hover:bg-surface-raised hover:underline active:bg-surface-high ' +
    'disabled:bg-transparent disabled:text-fg-muted disabled:border-transparent disabled:no-underline',
  danger:
    'bg-danger-solid text-fg-inverse border-danger-solid font-semibold hover:bg-danger-fg hover:border-danger-fg hover:underline active:bg-danger-fg ' +
    'disabled:bg-surface-raised disabled:text-fg-muted disabled:border-line disabled:no-underline',
  success:
    'bg-success-solid text-fg-inverse border-success-solid font-semibold hover:bg-success-fg hover:border-success-fg hover:underline active:bg-success-fg ' +
    'disabled:bg-surface-raised disabled:text-fg-muted disabled:border-line disabled:no-underline',
};

// Bigger targets: 40px default, 44px at lg. `sm` is 36px — still a comfortable
// target, used only for in-row and in-header controls.
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 min-h-9 px-3 text-sm gap-2 rounded',
  md: 'h-10 min-h-10 px-4 text-base gap-2 rounded',
  lg: 'h-12 min-h-12 px-5 text-base gap-2.5 rounded',
};

const BTN_ICON: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon: IconCmp,
    iconRight = false,
    block = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const glyph = IconCmp ? <IconCmp className={cx(BTN_ICON[size], 'shrink-0')} /> : null;
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap border',
        'transition-[background-color,border-color,color] duration-fast ease-entrance',
        BTN_SIZE[size],
        BTN_VARIANT[variant],
        FOCUS,
        block && 'w-full',
        isDisabled && 'pointer-events-none',
        className,
      )}
      {...rest}
    >
      {loading && (
        <Spinner
          className={cx(BTN_ICON[size], 'shrink-0')}
          aria-label="Working"
        />
      )}
      {!loading && !iconRight && glyph}
      {children != null && <span className="truncate">{children}</span>}
      {!loading && iconRight && glyph}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'children'> {
  icon: (props: IconProps) => JSX.Element;
  /** Required — icon-only controls must be named. */
  label: string;
}

/** Icon-only button. 44px on lg (touch), 40px on md, 36px on sm. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ icon: IconCmp, label, size = 'md', className, ...rest }, ref) {
    const box = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
    return (
      <Button
        ref={ref}
        size={size}
        aria-label={label}
        title={label}
        className={cx(box, 'px-0', className)}
        {...rest}
      >
        <IconCmp className={BTN_ICON[size]} />
      </Button>
    );
  },
);

// ─── Card ────────────────────────────────────────────────────────────────────

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Retained for source compatibility — thirty screens pass it. It no longer
   * draws anything: the accent rail was decoration and is gone. A card is a
   * white box with a 1px border, full stop.
   */
  rail?: boolean;
  tone?: Tone;
  interactive?: boolean;
}

export function Card({ rail: _rail, tone, interactive, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded border border-line bg-surface',
        tone === 'danger' && 'border-danger',
        tone === 'warn' && 'border-warn',
        tone === 'success' && 'border-success',
        tone === 'info' && 'border-info',
        interactive &&
          'cursor-pointer transition-[background-color,border-color] duration-fast ease-entrance hover:border-fg hover:bg-surface-raised',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional — if omitted, `children` is used as the title. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot: buttons, badges, filters. */
  action?: ReactNode;
  icon?: (props: IconProps) => JSX.Element;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: IconCmp,
  className,
  children,
  ...rest
}: CardHeaderProps) {
  const heading = title ?? children;
  return (
    <div
      className={cx(
        'flex items-start justify-between gap-4 border-b border-line px-4 py-3',
        className,
      )}
      {...rest}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {IconCmp && (
          <span className="mt-0.5 shrink-0 text-fg-muted">
            <IconCmp className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-md font-semibold text-fg">{heading}</h3>
          {subtitle != null && (
            <p className="mt-0.5 truncate text-sm text-fg-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-4 py-4', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 border-t border-line bg-surface-raised px-4 py-3',
        className,
      )}
      {...rest}
    />
  );
}

// ─── Badge / StatusPill ──────────────────────────────────────────────────────

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Leading state dot. */
  dot?: boolean;
  size?: 'sm' | 'md';
  /**
   * Retained for source compatibility. The diagonal hazard stripes were
   * decoration and are gone; a blocked state is now carried by the danger
   * tone and its label, which is what a reader actually parses.
   */
  hazard?: boolean;
}

/** A small bordered label with a pale tint. Sentence case, no tracking. */
export function Badge({
  tone = 'neutral',
  dot = false,
  size = 'sm',
  hazard: _hazard = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded border font-semibold',
        size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
        TONE_SOFT[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cx('h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export interface StatusPillProps extends Omit<BadgeProps, 'tone' | 'children'> {
  status: OrderStatus;
}

/** Label + tone are derived from the state machine. Never pass them manually. */
export function StatusPill({ status, dot = true, ...rest }: StatusPillProps) {
  const tone = STATUS_TONE[status];
  return (
    <Badge tone={tone} dot={dot} {...rest}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

// ─── StatTile ────────────────────────────────────────────────────────────────

export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  /** Signed change, e.g. +12.4% — tone is inferred from the sign. */
  delta?: number | string;
  deltaTone?: Tone;
  hint?: ReactNode;
  accent?: boolean;
  icon?: (props: IconProps) => JSX.Element;
}

export function StatTile({
  label,
  value,
  delta,
  deltaTone,
  hint,
  accent = false,
  icon: IconCmp,
  className,
  ...rest
}: StatTileProps) {
  const numericDelta = typeof delta === 'number' ? delta : parseFloat(String(delta ?? ''));
  const tone: Tone =
    deltaTone ??
    (Number.isNaN(numericDelta)
      ? 'neutral'
      : numericDelta > 0
        ? 'success'
        : numericDelta < 0
          ? 'danger'
          : 'neutral');
  const deltaText =
    typeof delta === 'number'
      ? `${delta > 0 ? '+' : ''}${delta.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
      : delta;

  return (
    <div
      className={cx(
        'relative overflow-hidden rounded border border-line bg-surface px-4 py-4',
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {IconCmp && <IconCmp className={cx('h-5 w-5', accent ? 'text-accent' : 'text-fg-muted')} />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="num text-2xl font-semibold text-fg">{value}</span>
        {delta != null && delta !== '' && (
          <span className={cx('num text-sm font-semibold', TONE_TEXT[tone])}>{deltaText}</span>
        )}
      </div>
      {hint != null && <p className="mt-1.5 text-sm text-fg-muted">{hint}</p>}
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Wrap in a scroll container — required for sticky headers. */
  scrollHeight?: string;
}

export function Table({ className, scrollHeight, children, ...rest }: TableProps) {
  const table = (
    <table
      className={cx('w-full border-collapse text-start tabular-nums', className)}
      {...rest}
    >
      {children}
    </table>
  );
  if (!scrollHeight) return table;
  return (
    <div className="relative overflow-auto" style={{ maxHeight: scrollHeight }}>
      {table}
    </div>
  );
}

export interface THeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export function THead({ sticky = false, className, ...rest }: THeadProps) {
  return (
    <thead
      className={cx(
        // Light grey header fill. This is the one place a fill genuinely aids
        // comprehension: it tells you where the data starts.
        'bg-surface-raised',
        sticky && 'sticky top-0 z-10',
        className,
      )}
      {...rest}
    />
  );
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx('divide-y divide-line', className)} {...rest} />;
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Marks the row as the live/selected one. */
  active?: boolean;
  tone?: Tone;
  interactive?: boolean;
}

export function TR({ active, tone, interactive, className, ...rest }: TRProps) {
  return (
    <tr
      className={cx(
        'group transition-colors duration-fast ease-entrance',
        interactive && 'cursor-pointer hover:bg-surface-raised',
        // Selected row: a pale tint plus bold text. The inset accent rail is
        // gone — the weight change carries it without colour.
        active && 'bg-accent-soft font-semibold',
        tone === 'danger' && 'bg-danger-soft',
        tone === 'warn' && 'bg-warn-soft',
        tone === 'success' && 'bg-success-soft',
        className,
      )}
      {...rest}
    />
  );
}

export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right' | 'center';
  numeric?: boolean;
}

export function TH({ align, numeric, className, ...rest }: THProps) {
  const a = align ?? (numeric ? 'right' : 'left');
  return (
    <th
      scope="col"
      className={cx(
        // Sentence case, normal tracking, readable size. The uppercase
        // micro-label treatment is gone.
        'whitespace-nowrap border-b border-line px-3 py-3 text-sm font-semibold text-fg',
        a === 'right' && 'text-end',
        a === 'center' && 'text-center',
        className,
      )}
      {...rest}
    />
  );
}

export interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right' | 'center';
  numeric?: boolean;
  muted?: boolean;
}

export function TD({ align, numeric, muted, className, ...rest }: TDProps) {
  const a = align ?? (numeric ? 'right' : 'left');
  return (
    <td
      className={cx(
        // Roomier rows: py-3 gives a ~44px row at this type size.
        'px-3 py-3 text-base text-fg align-middle',
        numeric && 'num',
        muted && 'text-fg-muted',
        a === 'right' && 'text-end',
        a === 'center' && 'text-center',
        className,
      )}
      {...rest}
    />
  );
}

// ─── Field / form primitives ─────────────────────────────────────────────────

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {label != null && (
        <label htmlFor={htmlFor} className="flex items-center gap-1 text-base font-semibold text-fg">
          {label}
          {required && <span className="text-danger-fg">*</span>}
        </label>
      )}
      {children}
      {error != null ? (
        <p className="flex items-start gap-1.5 text-sm font-semibold text-danger-fg">
          <Alert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        hint != null && <p className="text-sm text-fg-muted">{hint}</p>
      )}
    </div>
  );
}

// Plain field: a white box with a 1px #767676 border (4.5:1 — an input border
// is an essential boundary, so it is the strong grey, not the structural one).
// Focus is a 2px black outline, the same one every other control gets.
// Disabled is the grey fill, not an opacity wash.
const CONTROL_BASE =
  'w-full rounded border bg-surface text-fg placeholder:text-fg-muted ' +
  'border-line-strong transition-[border-color] duration-fast ease-entrance ' +
  // No outline override here: the global `:focus-visible` rule in index.css
  // supplies the 2px black ring, and browsers treat text-input focus as
  // focus-visible even on click. The border darkening is the second cue.
  'hover:border-fg focus:border-fg ' +
  'disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-fg-muted ' +
  'disabled:border-line disabled:hover:border-line';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Leading adornment, e.g. a Search icon or "Rs". */
  prefix?: ReactNode;
  suffix?: ReactNode;
  numeric?: boolean;
}

// Inputs are 40px by default, 44px at lg. Nothing under 36px.
const CONTROL_SIZE = {
  sm: 'h-9 px-2.5 text-sm',
  md: 'h-10 px-3 text-base',
  lg: 'h-11 px-3.5 text-base',
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, size = 'md', prefix, suffix, numeric, className, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        CONTROL_BASE,
        CONTROL_SIZE[size],
        numeric && 'num text-end',
        invalid && 'border-danger focus:border-danger',
        prefix != null && 'ps-8',
        suffix != null && 'pe-9',
        className,
      )}
      {...rest}
    />
  );
  if (prefix == null && suffix == null) return input;
  return (
    <div className="relative flex w-full items-center">
      {prefix != null && (
        <span className="pointer-events-none absolute start-2.5 flex items-center text-fg-muted">
          {prefix}
        </span>
      )}
      {input}
      {suffix != null && (
        <span className="pointer-events-none absolute end-3 flex items-center text-sm text-fg-muted">
          {suffix}
        </span>
      )}
    </div>
  );
});

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <div className="relative flex w-full items-center">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(
          CONTROL_BASE,
          CONTROL_SIZE[size],
          'cursor-pointer appearance-none pe-8',
          invalid && 'border-danger focus:border-danger',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute end-2.5 h-4 w-4 text-fg-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(
        CONTROL_BASE,
        'resize-y px-3 py-2.5 text-base',
        invalid && 'border-danger focus:border-danger',
        className,
      )}
      {...rest}
    />
  );
});

export interface NumberStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** lg = 44px touch targets for the driver tab. */
  size?: 'md' | 'lg';
  unit?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/** Big −/+ stepper. Use size="lg" anywhere a driver's thumb is involved. */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  disabled = false,
  size = 'md',
  unit,
  id,
  className,
  'aria-label': ariaLabel,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn =
    size === 'lg' ? 'h-12 w-12 min-h-12 text-fg' : 'h-10 w-10 min-h-10 text-fg';
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div
      className={cx(
        'inline-flex items-stretch overflow-hidden rounded border border-line-strong bg-surface',
        disabled && 'pointer-events-none border-line bg-surface-raised text-fg-muted',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
        className={cx(
          'grid shrink-0 place-items-center border-e border-line-strong transition-colors duration-fast',
          'hover:bg-surface-raised active:bg-surface-high disabled:bg-surface-raised disabled:text-fg-muted disabled:hover:bg-surface-raised',
          FOCUS,
          btn,
        )}
      >
        <Minus className={iconSize} />
      </button>
      <input
        id={id}
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isNaN(n) ? min : clamp(n));
        }}
        className={cx(
          'num w-full min-w-0 border-0 bg-transparent text-center font-semibold text-fg',
          size === 'lg' ? 'h-12 text-lg' : 'h-10 text-base',
        )}
      />
      {unit && (
        <span
          className={cx(
            'grid shrink-0 place-items-center pe-2 text-sm text-fg-muted',
            size === 'lg' ? 'text-base' : '',
          )}
        >
          {unit}
        </span>
      )}
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
        className={cx(
          'grid shrink-0 place-items-center border-s border-line-strong transition-colors duration-fast',
          'hover:bg-surface-raised active:bg-surface-high disabled:bg-surface-raised disabled:text-fg-muted disabled:hover:bg-surface-raised',
          FOCUS,
          btn,
        )}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  hint?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, className, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <label
      htmlFor={id}
      className={cx(
        'group flex min-h-11 cursor-pointer select-none items-start gap-3 py-2',
        disabled && 'cursor-not-allowed text-fg-muted',
        className,
      )}
    >
      <span className="relative mt-px flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          disabled={disabled}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-xs border border-line-strong bg-surface transition-colors duration-fast hover:border-fg checked:border-accent checked:bg-accent disabled:border-line disabled:bg-surface-raised disabled:hover:border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          {...rest}
        />
        <Check className="pointer-events-none absolute h-3.5 w-3.5 text-accent-fg opacity-0 transition-opacity duration-fast ease-entrance peer-checked:opacity-100" />
      </span>
      {(label != null || hint != null) && (
        <span className="min-w-0 leading-tight">
          {label != null && <span className="block text-base text-fg">{label}</span>}
          {hint != null && <span className="mt-0.5 block text-sm text-fg-muted">{hint}</span>}
        </span>
      )}
    </label>
  );
});

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  size?: 'md' | 'lg';
  className?: string;
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
  size = 'md',
  className,
  id,
}: ToggleProps) {
  const autoId = useId();
  const tid = id ?? autoId;
  const track = size === 'lg' ? 'h-7 w-12' : 'h-6 w-10';
  const knob = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  // `knob-shift-*` is the [dir='rtl'] override declared in index.css — it
  // mirrors the travel with a transform, never an animated layout property.
  const shift =
    size === 'lg' ? 'translate-x-5 knob-shift-lg' : 'translate-x-4 knob-shift-md';
  return (
    <div className={cx('flex min-h-11 items-center justify-between gap-4', className)}>
      {(label != null || hint != null) && (
        <label htmlFor={tid} className="min-w-0 cursor-pointer select-none">
          {label != null && <span className="block text-base text-fg">{label}</span>}
          {hint != null && <span className="mt-0.5 block text-sm text-fg-muted">{hint}</span>}
        </label>
      )}
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-fast ease-entrance',
          track,
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface',
          disabled &&
            'pointer-events-none border-line bg-surface-raised [&_span]:!bg-line',
          FOCUS,
        )}
      >
        <span
          className={cx(
            // Off: a grey knob on a white track. On: a white knob on the
            // accent fill. Both read without relying on the fill colour alone,
            // because the knob also travels.
            'absolute start-[3px] rounded-full border border-line-strong transition-transform duration-fast ease-entrance',
            checked ? 'bg-surface border-accent-fg' : 'bg-line-strong',
            knob,
            checked ? shift : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

// ─── Overlay helpers ─────────────────────────────────────────────────────────

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disable backdrop click-to-close for destructive confirmations. */
  dismissOnBackdrop?: boolean;
  className?: string;
  children?: ReactNode;
}

const MODAL_W = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = 'md',
  dismissOnBackdrop = true,
  className,
  children,
}: ModalProps) {
  useScrollLock(open);
  useEscape(open, onClose);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        // Plain 40% black veil. No blur — a blur is an effect, not a signal.
        className="absolute inset-0 animate-fade-in bg-scrim"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          // `shadow-pop` is the single permitted shadow in the product: a
          // dialog must read as above the page. It is deliberately faint.
          'relative flex w-full flex-col overflow-hidden rounded border border-line-strong bg-surface shadow-pop',
          'max-h-[calc(100vh-4rem)] animate-scale-in',
          MODAL_W[size],
          className,
        )}
      >
        {(title != null || subtitle != null) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div className="min-w-0">
              {title != null && (
                <h2 className="truncate text-md font-semibold text-fg">{title}</h2>
              )}
              {subtitle != null && (
                <p className="mt-0.5 truncate text-sm text-fg-muted">{subtitle}</p>
              )}
            </div>
            <IconButton
              icon={X}
              label="Close"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="-me-1.5 -mt-0.5"
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer != null && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-raised px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  width?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Inline-end slide-over. Order detail, audit trail, Oracle payload inspector.
 * `flex justify-end` and `border-s` are direction-aware, and index.css swaps
 * `.animate-slide-left` to the `slide-right` keyframe under [dir='rtl'] — so
 * under Urdu the drawer enters from the left, as it should.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = '30rem',
  className,
  children,
}: DrawerProps) {
  useScrollLock(open);
  useEscape(open, onClose);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-drawer flex justify-end">
      <div
        className="absolute inset-0 animate-fade-in bg-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        style={{ width, maxWidth: '100vw' }}
        className={cx(
          'relative flex h-full animate-slide-left flex-col border-s border-line-strong bg-surface shadow-pop',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title != null && (
              <h2 className="truncate text-md font-semibold text-fg">{title}</h2>
            )}
            {subtitle != null && (
              <p className="mt-0.5 truncate text-sm text-fg-muted">{subtitle}</p>
            )}
          </div>
          <IconButton
            icon={X}
            label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="-me-1.5 -mt-0.5"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer != null && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-raised px-4 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  /** ms; 0 = sticky until dismissed. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

interface ToastApi {
  push: (t: ToastOptions) => number;
  dismiss: (id: number) => void;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  warn: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TOAST_ICON: Record<Tone, (p: IconProps) => JSX.Element> = {
  neutral: CheckCircle,
  info: CheckCircle,
  success: CheckCircle,
  warn: Alert,
  danger: XCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: ToastOptions) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-3), { ...t, id }]);
      const duration = t.duration ?? 4200;
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'danger', duration: 6500 }),
      warn: (title, description) => push({ title, description, tone: 'warn', duration: 5500 }),
      info: (title, description) => push({ title, description, tone: 'info' }),
    }),
    [push, dismiss],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed bottom-4 end-4 z-toast flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
            role="region"
            aria-label="Notifications"
          >
            {items.map((t) => (
              <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  );
}

export interface ToastProps extends ToastOptions {
  onDismiss?: () => void;
  className?: string;
}

export function Toast({
  title,
  description,
  tone = 'neutral',
  onDismiss,
  className,
}: ToastProps) {
  const IconCmp = TOAST_ICON[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        // A white box with a 1px grey border and a 4px coloured left edge.
        // The edge is the only colour: no tonal background, no shadow beyond
        // the shared overlay one.
        'pointer-events-auto flex animate-toast-in items-start gap-3 rounded border border-line border-s-4 bg-surface px-4 py-3 shadow-pop',
        TONE_BORDER[tone],
        className,
      )}
    >
      <IconCmp className={cx('mt-0.5 h-5 w-5 shrink-0', TONE_TEXT[tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className={cx(
            'grid h-8 w-8 shrink-0 place-items-center rounded text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg',
            FOCUS,
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Small count chip after the label. */
  count?: number;
  icon?: (props: IconProps) => JSX.Element;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  size?: 'md' | 'lg';
  className?: string;
}

/** Controlled. Plain underline tabs: the active tab is bold with a 2px rule. */
export function Tabs({ tabs, value, onChange, size = 'md', className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cx(
        'no-scrollbar flex items-stretch gap-1 overflow-x-auto border-b border-line',
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        const IconCmp = t.icon;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={cx(
              'relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-base',
              'transition-colors duration-fast ease-entrance',
              size === 'lg' ? 'min-h-12' : 'min-h-11',
              // Active is bold AND underlined — weight carries it without
              // relying on colour.
              active
                ? 'border-fg font-semibold text-fg'
                : 'border-transparent font-normal text-fg-muted hover:border-line-strong hover:text-fg',
              t.disabled && 'pointer-events-none text-line hover:border-transparent',
              FOCUS,
            )}
          >
            {IconCmp && <IconCmp className="h-4 w-4" />}
            {t.label}
            {t.count != null && (
              <span
                className={cx(
                  'num rounded border border-line px-1.5 text-xs font-semibold',
                  active ? 'bg-surface text-fg' : 'bg-surface-raised text-fg-muted',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export function Spinner({
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { 'aria-label'?: string }) {
  return (
    <span
      role="status"
      className={cx('inline-block h-4 w-4 shrink-0 animate-spin', className)}
      {...rest}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for indeterminate. */
  value?: number;
  tone?: Tone | 'accent';
  size?: 'sm' | 'md';
  label?: ReactNode;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  tone = 'accent',
  size = 'md',
  label,
  showValue,
  className,
  ...rest
}: ProgressBarProps) {
  const pct = value == null ? null : Math.max(0, Math.min(100, value));
  const fill =
    tone === 'accent'
      ? 'bg-accent'
      : tone === 'success'
        ? 'bg-success'
        : tone === 'warn'
          ? 'bg-warn'
          : tone === 'danger'
            ? 'bg-danger'
            : tone === 'info'
              ? 'bg-info'
              : 'bg-fg-muted';
  return (
    <div className={cx('w-full', className)} {...rest}>
      {(label != null || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label != null && <span className="eyebrow">{label}</span>}
          {showValue && pct != null && (
            <span className="num text-sm font-semibold text-fg">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cx(
          // A plain grey track with a square end. The bar is the data; it
          // needs a visible empty state, hence `bg-line` rather than a wash.
          'w-full overflow-hidden rounded-none bg-line',
          size === 'sm' ? 'h-2' : 'h-3',
        )}
      >
        <div
          className={cx(
            'h-full transition-[width] duration-slow ease-entrance',
            fill,
            // Indeterminate: a static third-width bar. There is no shimmer.
            pct == null && 'w-1/3',
          )}
          style={pct == null ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  w?: string;
  h?: string;
  circle?: boolean;
  /** Render n stacked bars — for list/table placeholders. */
  lines?: number;
}

export function Skeleton({ w, h = '1rem', circle, lines, className, ...rest }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cx('flex flex-col gap-2', className)} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            h={h}
            w={i === lines - 1 ? '60%' : '100%'}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{ width: w ?? '100%', height: h }}
      // A static grey block matching the real content's shape. No shimmer:
      // an animated sweep is decoration, and the placeholder's job is only to
      // reserve the space so the layout does not jump when data arrives.
      className={cx(
        'bg-surface-high',
        circle ? 'rounded-full' : 'rounded-sm',
        className,
      )}
      {...rest}
    />
  );
}

export interface EmptyStateProps {
  icon?: (props: IconProps) => JSX.Element;
  title: string;
  hint?: ReactNode;
  /** Alias for `hint`. */
  description?: ReactNode;
  action?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({
  icon: IconCmp,
  title,
  hint,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const body = hint ?? description;
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      {IconCmp && (
        <span className={cx('text-fg-muted', size === 'sm' ? 'h-6 w-6' : 'h-8 w-8')}>
          <IconCmp className="h-full w-full" />
        </span>
      )}
      <div>
        <p className={cx('font-semibold text-fg', size === 'sm' ? 'text-base' : 'text-md')}>
          {title}
        </p>
        {body != null && (
          <p className="mx-auto mt-1 max-w-[52ch] text-base text-fg-muted">{body}</p>
        )}
      </div>
      {action != null && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ─── PipelineTracker ─────────────────────────────────────────────────────────

/** Off-pipeline states and the happy-path stage they branch from. */
const BRANCH_FROM: Partial<Record<OrderStatus, OrderStatus>> = {
  DISPUTED: 'DELIVERED',
  MISMATCH_HELD: 'CONFIRMED',
  POST_FAILED: 'RECONCILED',
};

export interface PipelineTrackerProps {
  current: OrderStatus;
  /** Compact = numbered markers only, no labels. For table rows and cards. */
  compact?: boolean;
  className?: string;
}

/**
 * Plain horizontal stepper over PIPELINE. Each stage is a numbered marker and
 * a label; done stages carry a tick, the current stage is filled and bold.
 * Off-pipeline states (DISPUTED, MISMATCH_HELD, POST_FAILED) mark the stage
 * they diverged from and print a plain note underneath; CANCELLED greys the
 * whole track. No notches, no pulse rings, no hazard stripes.
 */
export function PipelineTracker({ current, compact = false, className }: PipelineTrackerProps) {
  const cancelled = current === 'CANCELLED';
  const branchFrom = BRANCH_FROM[current];
  const anchor: OrderStatus | null = branchFrom ?? (PIPELINE.includes(current) ? current : null);
  const activeIndex = anchor ? PIPELINE.indexOf(anchor) : -1;

  return (
    <div className={cx('w-full', className)}>
      <ol
        className={cx('flex w-full items-stretch', cancelled && 'opacity-60')}
        aria-label="Order pipeline"
      >
        {PIPELINE.map((stage, i) => {
          const done = activeIndex > i;
          const isCurrent = activeIndex === i;
          const branched = isCurrent && !!branchFrom;
          return (
            <li key={stage} className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center">
                <span
                  className={cx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-semibold',
                    branched
                      ? 'border-danger bg-danger text-fg-inverse'
                      : done
                        ? 'border-success bg-success text-fg-inverse'
                        : isCurrent
                          ? 'border-accent bg-accent text-accent-fg'
                          : 'border-line-strong bg-surface text-fg-muted',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {branched ? (
                    <Alert className="h-4 w-4" />
                  ) : done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="num">{i + 1}</span>
                  )}
                </span>
                {i < PIPELINE.length - 1 && (
                  <span
                    className={cx(
                      'mx-2 h-px flex-1',
                      done ? 'bg-success' : 'bg-line',
                    )}
                  />
                )}
              </div>
              {!compact && (
                <span
                  className={cx(
                    'truncate pe-2 text-sm',
                    isCurrent || branched ? 'font-semibold text-fg' : 'text-fg-muted',
                  )}
                  title={STATUS_LABEL[stage]}
                >
                  {STATUS_LABEL[stage]}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {(branchFrom || cancelled) && (
        <div
          className={cx(
            'mt-3 flex items-center gap-2 rounded border px-3 py-2',
            cancelled ? 'border-line bg-surface-raised' : 'border-danger-line bg-danger-soft',
          )}
        >
          {cancelled ? (
            <XCircle className="h-5 w-5 shrink-0 text-fg-muted" />
          ) : (
            <Alert className="h-5 w-5 shrink-0 text-danger-fg" />
          )}
          <span
            className={cx(
              'text-base font-semibold',
              cancelled ? 'text-fg' : 'text-danger-fg',
            )}
          >
            {STATUS_LABEL[current]}
          </span>
          <span className="truncate text-base text-fg-muted">
            {cancelled
              ? 'Order cancelled — pipeline halted.'
              : `Branched at ${STATUS_LABEL[branchFrom as OrderStatus]} — resolve to resume.`}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Device frames ───────────────────────────────────────────────────────────

function StatusBarGlyphs({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-2 text-fg">
      {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-warn-fg" />}
      <svg viewBox="0 0 18 12" className="h-3.5 w-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 4.5}
            y={9 - i * 2.6}
            width="3"
            height={3 + i * 2.6}
            rx="0.8"
            fill="currentColor"
            opacity={online ? 1 : 0.3}
          />
        ))}
      </svg>
      <Battery className="h-4 w-4" />
    </div>
  );
}

export interface DeviceFrameProps {
  children: ReactNode;
  /** Drives the status-bar radio glyphs and the offline banner. */
  online?: boolean;
  /** Extra content in the status bar's right cluster — sync counts etc. */
  indicator?: ReactNode;
  time?: string;
  label?: string;
  className?: string;
}

function useClock(fixed?: string) {
  const [now, setNow] = useState(() => fixed ?? formatClock(new Date()));
  useEffect(() => {
    if (fixed) return;
    const t = window.setInterval(() => setNow(formatClock(new Date())), 30_000);
    return () => window.clearInterval(t);
  }, [fixed]);
  return fixed ?? now;
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Client/dealer phone. A plain 2px dark-grey rounded outline around a white
 * screen — enough to tell the viewer WHICH app is on screen, and nothing more.
 * The metal gradient, the notch, the side buttons and the device shadow are
 * gone; they were set dressing, not information.
 */
export function PhoneFrame({
  children,
  online = true,
  indicator,
  time,
  label,
  className,
}: DeviceFrameProps) {
  const clock = useClock(time);
  return (
    <div className={cx('flex flex-col items-center gap-3', className)}>
      <div className="rounded-3xl border-2 border-bezel bg-surface p-1">
        <div className="relative h-[780px] w-[380px] overflow-hidden rounded-[1rem] bg-app">
          {/* minimal status bar */}
          <div className="relative z-10 flex h-9 items-center justify-between border-b border-line px-4 text-sm">
            <span className="num text-fg">{clock}</span>
            <div className="flex items-center gap-2">
              {indicator}
              <StatusBarGlyphs online={online} />
            </div>
          </div>
          {!online && (
            <div className="flex items-center justify-center gap-2 border-b border-warn-line bg-warn-soft px-3 py-1.5 text-sm font-semibold text-warn-fg">
              <WifiOff className="h-4 w-4" /> Offline — actions queued
            </div>
          )}
          <div className="h-[calc(100%-2.25rem)] overflow-y-auto no-scrollbar">{children}</div>
        </div>
      </div>
      {label && <span className="eyebrow">{label}</span>}
    </div>
  );
}

/** Driver tablet. Same plain outline, landscape working area. */
export function TabletFrame({
  children,
  online = true,
  indicator,
  time,
  label,
  className,
}: DeviceFrameProps) {
  const clock = useClock(time);
  return (
    <div className={cx('flex flex-col items-center gap-3', className)}>
      <div className="rounded-xl border-2 border-bezel bg-surface p-1">
        <div className="relative h-[700px] w-[1020px] max-w-full overflow-hidden rounded bg-app">
          <div className="flex h-9 items-center justify-between border-b border-line bg-surface-raised px-4 text-sm">
            <span className="font-semibold text-fg">MCL Driver Tab</span>
            <span className="num text-fg">{clock}</span>
            <div className="flex items-center gap-2.5">
              {indicator}
              <StatusBarGlyphs online={online} />
            </div>
          </div>
          {!online && (
            <div className="flex items-center justify-center gap-2 border-b border-warn-line bg-warn-soft px-3 py-1.5 text-sm font-semibold text-warn-fg">
              <WifiOff className="h-4 w-4" /> Offline — deliveries queued locally, will sync on
              reconnect
            </div>
          )}
          <div className="h-[calc(100%-2.25rem)] overflow-y-auto">{children}</div>
        </div>
      </div>
      {label && <span className="eyebrow">{label}</span>}
    </div>
  );
}

/** Small online/offline chip for the device `indicator` slot or any toolbar. */
export function ConnectionChip({
  online,
  pending = 0,
  className,
}: {
  online: boolean;
  pending?: number;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold',
        online ? TONE_SOFT.success : TONE_SOFT.warn,
        className,
      )}
    >
      {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {online ? 'Online' : 'Offline'}
      {pending > 0 && <span className="num">· {pending} queued</span>}
    </span>
  );
}

// ─── SignaturePad ────────────────────────────────────────────────────────────

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string | null;
}

export interface SignaturePadProps {
  /** Fires on stroke end with a PNG data URL, or null after clear. */
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Real canvas signature capture — mouse, pen and touch.
 *
 * Light theme: this is ink on PAPER. The stroke is `color.ink` (near-black,
 * 17.8:1) and the well is explicitly white. The canvas element itself stays
 * transparent so the baseline and placeholder underneath remain visible, and
 * the exported PNG is composited onto an opaque white sheet — otherwise the
 * signature would arrive at Oracle as black-on-transparent and disappear the
 * moment anything renders it on a dark ground.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    { onChange, height = 180, label = 'Recipient signature', hint, disabled, className },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [empty, setEmpty] = useState(true);

    const setup = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color.ink;
    }, []);

    useEffect(() => {
      setup();
      const onResize = () => setup();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [setup]);

    /** PNG of the strokes flattened onto opaque white paper. */
    const exportPng = useCallback((): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const sheet = document.createElement('canvas');
      sheet.width = canvas.width;
      sheet.height = canvas.height;
      const sctx = sheet.getContext('2d');
      if (!sctx) return canvas.toDataURL('image/png');
      sctx.fillStyle = color.paper;
      sctx.fillRect(0, 0, sheet.width, sheet.height);
      sctx.drawImage(canvas, 0, 0);
      return sheet.toDataURL('image/png');
    }, []);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      canvas?.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = point(e);
    };

    const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || disabled) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      const p = point(e);
      if (!ctx || !last.current) return;
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      if (empty) setEmpty(false);
    };

    const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current) return;
      drawing.current = false;
      last.current = null;
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
      onChange?.(exportPng());
    };

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      setEmpty(true);
      onChange?.(null);
    }, [onChange]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        isEmpty: () => empty,
        toDataUrl: () => (empty ? null : exportPng()),
      }),
      [clear, empty, exportPng],
    );

    return (
      <div className={cx('flex flex-col gap-1.5', className)}>
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">{label}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={clear}
            disabled={disabled || empty}
            className="min-h-8"
          >
            Clear
          </Button>
        </div>
        <div
          className={cx(
            'relative overflow-hidden rounded border bg-surface',
            empty ? 'border-line-strong' : 'border-fg',
            disabled && 'bg-surface-raised',
          )}
          style={{ height }}
        >
          {/* signing baseline */}
          <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-line-strong" />
          <span className="pointer-events-none absolute bottom-3 start-6 text-sm text-fg-muted">
            Sign above
          </span>
          {empty && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center text-base text-fg-muted">
              Draw signature with finger or stylus
            </span>
          )}
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            onPointerCancel={end}
            className={cx(
              'relative h-full w-full touch-none',
              disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
            )}
          />
        </div>
        {hint && <p className="text-sm text-fg-muted">{hint}</p>}
      </div>
    );
  },
);

// ─── Detail panels ───────────────────────────────────────────────────────────

export interface KeyValueProps {
  label: ReactNode;
  value: ReactNode;
  /** Render value with tabular numerals + medium weight. */
  numeric?: boolean;
  tone?: Tone;
  className?: string;
}

export function KeyValue({ label, value, numeric, tone, className }: KeyValueProps) {
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0',
        className,
      )}
    >
      <dt className="shrink-0 text-base text-fg-muted">{label}</dt>
      <dd
        className={cx(
          'min-w-0 truncate text-end text-base text-fg',
          numeric && 'num',
          tone && TONE_TEXT[tone],
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export interface DefinitionListProps extends HTMLAttributes<HTMLDListElement> {
  /** 2 = side-by-side columns on wide panels. */
  columns?: 1 | 2;
}

export function DefinitionList({ columns = 1, className, ...rest }: DefinitionListProps) {
  return (
    <dl
      className={cx(columns === 2 && 'grid grid-cols-1 gap-x-8 sm:grid-cols-2', className)}
      {...rest}
    />
  );
}

// ─── Data display ────────────────────────────────────────────────────────────

const PKR = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const PKR2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface MoneyProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Hide the "Rs" prefix — for table columns already headed "PKR". */
  bare?: boolean;
  decimals?: boolean;
  /** Colour by sign (credit green / debit red). */
  signed?: boolean;
}

/** PKR display: `Rs 1,234,567`. Always tabular. */
export function Money({
  value,
  bare = false,
  decimals = false,
  signed = false,
  className,
  ...rest
}: MoneyProps) {
  const fmt = decimals ? PKR2 : PKR;
  const abs = Math.abs(value);
  const neg = value < 0;
  return (
    <span
      className={cx(
        'num whitespace-nowrap',
        signed && (neg ? 'text-danger-fg' : value > 0 ? 'text-success-fg' : 'text-fg-muted'),
        className,
      )}
      {...rest}
    >
      {neg && '−'}
      {!bare && <span className="me-1 text-fg-muted">Rs</span>}
      {fmt.format(abs)}
    </span>
  );
}

export interface QtyProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  unit?: string;
  /** Renders "12 / 15" for delivered-of-ordered. */
  of?: number;
}

export function Qty({ value, unit, of, className, ...rest }: QtyProps) {
  const short = of != null && value < of;
  return (
    <span className={cx('num whitespace-nowrap', className)} {...rest}>
      <span className={cx(short && 'font-semibold text-warn-fg')}>{PKR.format(value)}</span>
      {of != null && <span className="text-fg-muted"> / {PKR.format(of)}</span>}
      {unit && <span className="ms-1 text-sm text-fg-muted">{unit}</span>}
    </span>
  );
}

export interface TimestampProps extends HTMLAttributes<HTMLTimeElement> {
  value: string | number | Date;
  /** Show the absolute time inline instead of only on hover. */
  absolute?: boolean;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  const pick = (): [number, Intl.RelativeTimeFormatUnit] => {
    if (s < 45) return [Math.round(s), 'second'];
    if (s < 3600) return [Math.round(s / 60), 'minute'];
    if (s < 86400) return [Math.round(s / 3600), 'hour'];
    if (s < 2592000) return [Math.round(s / 86400), 'day'];
    if (s < 31536000) return [Math.round(s / 2592000), 'month'];
    return [Math.round(s / 31536000), 'year'];
  };
  const [n, unit] = pick();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' });
  return rtf.format(future ? n : -n, unit);
}

function absoluteTime(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative by default; absolute on hover (title) or with `absolute`. */
export function Timestamp({ value, absolute = false, className, ...rest }: TimestampProps) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return <span className={cx('text-fg-muted', className)}>—</span>;
  }
  const abs = absoluteTime(d);
  return (
    <time
      dateTime={d.toISOString()}
      title={abs}
      className={cx('num whitespace-nowrap', className)}
      {...rest}
    >
      {absolute ? abs : relativeTime(d)}
    </time>
  );
}

export interface EcrTagProps extends HTMLAttributes<HTMLSpanElement> {
  /** 10-digit ECR: YY LL BB NNNN. Null renders an "unallocated" placeholder. */
  ecr?: string | null;
  /** Alias for `ecr`. */
  value?: string | null;
  size?: 'sm' | 'md';
  /** Highlight the sequence segment. */
  emphasis?: boolean;
}

/** Monospace, segment-grouped ECR. Segments: YY·LL·BB·NNNN. */
export function EcrTag({
  ecr: ecrProp,
  value,
  size = 'sm',
  emphasis = true,
  className,
  ...rest
}: EcrTagProps) {
  const t = useT();
  const ecr = ecrProp ?? value;
  if (!ecr || !/^\d{10}$/.test(ecr)) {
    return (
      <span
        className={cx(
          'inline-flex items-center rounded border border-line px-2 font-mono text-fg-muted',
          size === 'sm' ? 'h-6 text-xs' : 'h-7 text-sm',
          className,
        )}
        {...rest}
      >
        {t('ECR pending')}
      </span>
    );
  }
  const seg = [ecr.slice(0, 2), ecr.slice(2, 4), ecr.slice(4, 6), ecr.slice(6, 10)];
  return (
    <span
      title={`${t('ECR')} ${ecr} — ${t('Financial year')} ${seg[0]} · ${t('Location')} ${seg[1]} · ${t('Book type')} ${seg[2]} · ${t('Sequence')} ${seg[3]}`}
      className={cx(
        'inline-flex items-center gap-[3px] rounded border border-line bg-surface-raised px-2 font-mono tabular-nums text-fg',
        size === 'sm' ? 'h-6 text-xs' : 'h-7 text-sm',
        className,
      )}
      {...rest}
    >
      {seg.map((s, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className="text-fg-muted">·</span>}
          <span className={cx(i === 3 && emphasis && 'font-semibold text-fg')}>{s}</span>
        </span>
      ))}
    </span>
  );
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone | 'accent';
}

export function Avatar({ initials, size = 'md', tone = 'neutral', className, ...rest }: AvatarProps) {
  const box =
    size === 'sm' ? 'h-7 w-7 text-xs' : size === 'lg' ? 'h-10 w-10 text-base' : 'h-9 w-9 text-sm';
  const skin =
    tone === 'accent'
      ? 'bg-accent-soft text-accent border-accent-line'
      : TONE_SOFT[tone as Tone];
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-full border font-semibold uppercase',
        box,
        skin,
        className,
      )}
      {...rest}
    >
      {initials.slice(0, 2)}
    </span>
  );
}

// ─── Layout bits ─────────────────────────────────────────────────────────────

export interface SectionTitleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional — if omitted, `children` is used as the title. */
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** h1-scale for page heads; default is a section head. */
  level?: 'page' | 'section';
  icon?: (props: IconProps) => JSX.Element;
}

export function SectionTitle({
  title,
  subtitle,
  action,
  level = 'section',
  icon: IconCmp,
  className,
  children,
  ...rest
}: SectionTitleProps) {
  const heading = title ?? children;
  return (
    <div
      className={cx('flex items-end justify-between gap-4', className)}
      {...rest}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {IconCmp && <IconCmp className="h-6 w-6 shrink-0 text-fg-muted" />}
        <div className="min-w-0">
          {level === 'page' ? (
            <h1 className="truncate text-xl font-semibold text-fg">{heading}</h1>
          ) : (
            <h2 className="truncate text-md font-semibold text-fg">{heading}</h2>
          )}
          {subtitle != null && (
            <p className="mt-1 truncate text-base text-fg-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  vertical?: boolean;
}

export function Divider({ label, vertical, className, ...rest }: DividerProps) {
  if (vertical) {
    return <div className={cx('w-px self-stretch bg-line', className)} {...rest} />;
  }
  if (label == null) {
    return <div className={cx('h-px w-full bg-line', className)} {...rest} />;
  }
  return (
    <div className={cx('flex items-center gap-3', className)} {...rest}>
      <span className="h-px flex-1 bg-line" />
      <span className="eyebrow">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** String is printed verbatim; anything else is JSON.stringify'd. */
  code: unknown;
  title?: ReactNode;
  maxHeight?: string;
  /** Right-slot in the header, e.g. a Copy button or HTTP status badge. */
  action?: ReactNode;
  wrap?: boolean;
}

/**
 * Monospace, scrollable payload view. Light: a #F7F7F7 well with a 1px border
 * and black monospace text (17.6:1). A dark console block would be styling,
 * and the payload is content like anything else on the page.
 */
export function CodeBlock({
  code,
  title,
  maxHeight = '22rem',
  action,
  wrap = false,
  className,
  ...rest
}: CodeBlockProps) {
  const text =
    typeof code === 'string' ? code : JSON.stringify(code, null, 2) ?? String(code);
  return (
    <div
      className={cx(
        'overflow-hidden rounded border border-line bg-code',
        className,
      )}
      {...rest}
    >
      {(title != null || action != null) && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-code-head px-3 py-2">
          <span className="truncate text-sm font-semibold text-code-fg">{title}</span>
          {action}
        </div>
      )}
      <pre
        style={{ maxHeight }}
        className={cx(
          'overflow-auto px-3 py-3 font-mono text-sm leading-relaxed tabular-nums text-code-fg',
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
        )}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}

// ─── Misc helpers screens will want ──────────────────────────────────────────

/** Small plain label for grouping toolbars and field groups. */
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('eyebrow', className)} {...rest} />;
}

/** Breadcrumb-ish separator chevron. */
export function Caret({ className }: { className?: string }) {
  return <ChevronRight className={cx('h-4 w-4 shrink-0 text-fg-muted', className)} />;
}
