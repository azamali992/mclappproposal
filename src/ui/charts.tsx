// ─── MCL Delivery — charts ───────────────────────────────────────────────────
// Dependency-free inline SVG. Theme-aware via tokens.ts (no hex in screens).
// Plain: thin grey gridlines, black axis labels, solid bars. No caps, no
// highlights, no gradients, no rounded flourishes.
//
//  · Primary series is the accent blue (6.2:1 on white). The comparison series
//    is a neutral mid grey (4.5:1 on white). Both clear 3:1 against the plot
//    ground, which is what WCAG 1.4.11 asks of a graphical object.
//  · Gridlines are `chartInk.grid` (#D9D9D9) — furniture, deliberately quiet.
//    Axis labels are `chartInk.axis` (#111111) because they are text and must
//    pass as text, not as furniture.
//
//   <BarChart data={[{ label: 'Jul', value: 1840 }, …]} />
//   <Sparkline values={[12, 18, 9, 22, 30]} />
//   <DonutStat segments={[{ label: 'Posted', value: 812, tone: 'success' }, …]} />

import { useMemo, useState } from 'react';
import { chartInk, color, toneColor } from './tokens';
import type { Tone } from './tokens';

const numFmt = new Intl.NumberFormat('en-US');

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  return numFmt.format(n);
}

function seriesColor(tone?: Tone | 'accent'): string {
  if (!tone || tone === 'accent') return color.accent;
  return toneColor[tone].solid;
}

// ─── BarChart ────────────────────────────────────────────────────────────────

export interface BarDatum {
  label: string;
  value: number;
  tone?: Tone | 'accent';
  /** Ghost bar behind the value — e.g. target or prior year. */
  compare?: number;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  /** Suffix in the tooltip/axis, e.g. "cyl" or "Rs". */
  unit?: string;
  showValues?: boolean;
  /** Draw horizontal gridlines + left axis labels. */
  grid?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Monthly volume. Hover lifts a bar and reveals its exact value. */
export function BarChart({
  data,
  height = 168,
  unit,
  showValues = false,
  grid = true,
  className,
  ariaLabel = 'Bar chart',
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 100; // viewBox units, scales to container
  const padT = 10;
  const padB = 16;
  const padL = grid ? 12 : 2;

  const max = useMemo(() => {
    const m = Math.max(1, ...data.map((d) => Math.max(d.value, d.compare ?? 0)));
    const mag = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / mag) * mag;
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className={className}
        style={{ height }}
        role="img"
        aria-label="No data"
      >
        <div className="grid h-full place-items-center rounded border border-line text-base text-fg-muted">
          No volume recorded
        </div>
      </div>
    );
  }

  const plotH = height - padT - padB;
  const slot = (W - padL) / data.length;
  const barW = Math.min(slot * 0.62, 9);
  const ticks = [0, 0.5, 1];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        role="img"
        aria-label={ariaLabel}
        style={{ overflow: 'visible' }}
      >
        {grid &&
          ticks.map((t) => {
            const y = padT + plotH * (1 - t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  x2={W}
                  y1={y}
                  y2={y}
                  stroke={chartInk.grid}
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={padL - 2}
                  y={y + 2.5}
                  textAnchor="end"
                  fill={chartInk.axis}
                  style={{ fontSize: 8, fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmt(max * t)}
                </text>
              </g>
            );
          })}

        {data.map((d, i) => {
          const x = padL + slot * i + (slot - barW) / 2;
          const h = Math.max(1, (d.value / max) * plotH);
          const y = padT + plotH - h;
          const active = hover === i;
          const fill = seriesColor(d.tone);
          return (
            <g
              key={`${d.label}-${i}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* hit area */}
              <rect
                x={padL + slot * i}
                y={padT}
                width={slot}
                height={plotH}
                fill="transparent"
              />
              {/* Comparison series: a solid neutral-grey bar offset behind
                  the value bar. It carries data, so it is 4.5:1 on white. */}
              {d.compare != null && (
                <rect
                  x={x - 2}
                  y={padT + plotH - (d.compare / max) * plotH}
                  width={barW + 4}
                  height={Math.max(1, (d.compare / max) * plotH)}
                  fill={chartInk.ghost}
                />
              )}
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={fill}
                opacity={hover == null || active ? 1 : 0.55}
                style={{ transition: 'opacity 160ms cubic-bezier(0.16,1,0.3,1)' }}
              />
              <text
                x={padL + slot * i + slot / 2}
                y={height - 4}
                textAnchor="middle"
                fill={chartInk.axis}
                style={{ fontSize: 8.5, fontWeight: active ? 700 : 400 }}
              >
                {d.label}
              </text>
              {(showValues || active) && (
                <text
                  x={padL + slot * i + slot / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fill={color.fg}
                  style={{ fontSize: 8.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmt(d.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && unit && (
        <p className="mt-1 text-center text-sm text-fg-muted">
          {numFmt.format(data[hover].value)} {unit}
        </p>
      )}
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  tone?: Tone | 'accent';
  /**
   * Retained for source compatibility. The gradient wash under the line was
   * decoration and is gone; the line alone carries the trend.
   */
  fill?: boolean;
  /** Dot on the last point. */
  marker?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Sparkline({
  values,
  width = 120,
  height = 32,
  tone = 'accent',
  fill: _fill = true,
  marker = true,
  className,
  ariaLabel = 'Trend',
}: SparklineProps) {
  const stroke = seriesColor(tone);

  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} role="img" aria-label={ariaLabel}>
        <line
          x1={0}
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke={chartInk.ghost}
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2.5;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {marker && <circle cx={lx} cy={ly} r={2.2} fill={stroke} />}
    </svg>
  );
}

// ─── DonutStat ───────────────────────────────────────────────────────────────

export interface DonutSegment {
  label: string;
  value: number;
  tone?: Tone | 'accent';
}

export interface DonutStatProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Big number in the hole. Defaults to the total. */
  centerValue?: string | number;
  centerLabel?: string;
  /** Show the legend beside the ring. */
  legend?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function DonutStat({
  segments,
  size = 128,
  thickness = 14,
  centerValue,
  centerLabel,
  legend = true,
  className,
  ariaLabel = 'Distribution',
}: DonutStatProps) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;

  let offset = 0;

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel} className="shrink-0">
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={chartInk.track}
          strokeWidth={thickness}
        />
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {total > 0 &&
            segments.map((s, i) => {
              const frac = Math.max(0, s.value) / total;
              const len = frac * c;
              const el = (
                <circle
                  key={`${s.label}-${i}`}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={seriesColor(s.tone)}
                  strokeWidth={thickness}
                  strokeLinecap="butt"
                  strokeDasharray={`${Math.max(0, len - 1.5)} ${c - Math.max(0, len - 1.5)}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        <text
          x={cx}
          y={cx - 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color.fg}
          style={{
            fontSize: size * 0.22,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {centerValue ?? fmt(total)}
        </text>
        {centerLabel && (
          <text
            x={cx}
            y={cx + size * 0.15}
            textAnchor="middle"
            fill={chartInk.axis}
            style={{ fontSize: size * 0.1, fontWeight: 400 }}
          >
            {centerLabel}
          </text>
        )}
      </svg>

      {legend && (
        <ul className="min-w-0 flex-1 space-y-2">
          {segments.map((s, i) => (
            <li key={`${s.label}-${i}`} className="flex items-center gap-2 text-base">
              <span
                className="h-3 w-3 shrink-0"
                style={{ background: seriesColor(s.tone) }}
              />
              <span className="min-w-0 flex-1 truncate text-fg">{s.label}</span>
              <span className="num shrink-0 font-semibold text-fg">{numFmt.format(s.value)}</span>
              <span className="num w-11 shrink-0 text-end text-fg-muted">
                {total > 0 ? Math.round((s.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
