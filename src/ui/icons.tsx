// ─── MCL Delivery — icon set ─────────────────────────────────────────────────
// Inline SVG, 24×24 grid, stroke="currentColor", uniform 1.75 stroke weight,
// round caps/joins. No icon library, no network requests.
//
// Usage:  <Truck className="h-4 w-4 text-fg-dim" />
// Size:   control with Tailwind h-/w- classes (default 1em square via `size`).
// Colour: inherits text colour. Never set fill.

import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Pixel size shorthand. Prefer h-/w- classes; this is for one-offs. */
  size?: number | string;
}

function Svg({ size, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export type Icon = (props: IconProps) => JSX.Element;

export const Truck: Icon = (p) => (
  <Svg {...p}>
    <path d="M2 7.5A1.5 1.5 0 0 1 3.5 6h9A1.5 1.5 0 0 1 14 7.5V17H2z" />
    <path d="M14 10h3.6a2 2 0 0 1 1.7.95L21.6 15a2 2 0 0 1 .4 1.2V17h-8z" />
    <circle cx="6.5" cy="17.5" r="2" />
    <circle cx="17.5" cy="17.5" r="2" />
    <path d="M8.5 17.5h7" />
  </Svg>
);

export const Cylinder: Icon = (p) => (
  <Svg {...p}>
    <path d="M10 2.5h4v2.2h-4z" />
    <path d="M9 4.7h6" />
    <path d="M7.5 9a4.5 4.5 0 0 1 9 0v10a2.5 2.5 0 0 1-2.5 2.5h-4A2.5 2.5 0 0 1 7.5 19z" />
    <path d="M7.5 12.5h9" />
    <path d="M7.5 16.5h9" />
  </Svg>
);

export const Warehouse: Icon = (p) => (
  <Svg {...p}>
    <path d="M2.5 9.5 12 4l9.5 5.5V21h-19z" />
    <path d="M7 21v-7h10v7" />
    <path d="M7 17.5h10" />
  </Svg>
);

export const Clipboard: Icon = (p) => (
  <Svg {...p}>
    <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z" />
    <path d="M16 5h2a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 5h2" />
    <path d="M8.5 11.5h7M8.5 15.5h4.5" />
  </Svg>
);

export const Banknote: Icon = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="1.75" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 9.5v5M18 9.5v5" />
  </Svg>
);

export const Check: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Svg>
);

export const CheckCircle: Icon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.2 11 15.2 16.2 9" strokeWidth={2} />
  </Svg>
);

export const X: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M6 6 18 18M18 6 6 18" />
  </Svg>
);

export const XCircle: Icon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" strokeWidth={2} />
  </Svg>
);

export const Alert: Icon = (p) => (
  <Svg {...p}>
    <path d="M10.7 3.9 2.6 17.9a1.5 1.5 0 0 0 1.3 2.25h16.2a1.5 1.5 0 0 0 1.3-2.25L13.3 3.9a1.5 1.5 0 0 0-2.6 0z" />
    <path d="M12 9.5v4" strokeWidth={2} />
    <path d="M12 16.9h.01" strokeWidth={2.25} />
  </Svg>
);

export const Clock: Icon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </Svg>
);

export const Sync: Icon = (p) => (
  <Svg {...p}>
    <path d="M20.5 11.5a8.5 8.5 0 0 0-14.7-5.2L3.5 8.5" />
    <path d="M3.5 4v4.5H8" />
    <path d="M3.5 12.5a8.5 8.5 0 0 0 14.7 5.2l2.3-2.2" />
    <path d="M20.5 20v-4.5H16" />
  </Svg>
);

export const Refresh = Sync;

export const Wifi: Icon = (p) => (
  <Svg {...p}>
    <path d="M2.8 8.9a14 14 0 0 1 18.4 0" />
    <path d="M6 12.4a9 9 0 0 1 12 0" />
    <path d="M9.2 15.9a4.5 4.5 0 0 1 5.6 0" />
    <path d="M12 19.4h.01" strokeWidth={2.25} />
  </Svg>
);

export const WifiOff: Icon = (p) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M2.8 8.9a14 14 0 0 1 4.6-2.9" />
    <path d="M11.2 5.1a14 14 0 0 1 10 3.8" />
    <path d="M6 12.4a9 9 0 0 1 2.6-1.8" />
    <path d="M15.4 11a9 9 0 0 1 2.6 1.4" />
    <path d="M9.2 15.9a4.5 4.5 0 0 1 4.2-.6" />
    <path d="M12 19.4h.01" strokeWidth={2.25} />
  </Svg>
);

export const Printer: Icon = (p) => (
  <Svg {...p}>
    <path d="M7 8.5V3.5h10v5" />
    <path d="M7 17H5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-2" />
    <rect x="7" y="13.5" width="10" height="7" rx="1" />
    <path d="M17.5 11.2h.01" strokeWidth={2.25} />
  </Svg>
);

export const Signature: Icon = (p) => (
  <Svg {...p}>
    <path d="M3 17.5c2.4 0 3-8.5 5-8.5s1.6 6.6 3.4 6.6c1.5 0 1.8-4.3 3.3-4.3 1.2 0 1.4 2.9 2.6 2.9.9 0 1.4-1 1.4-1" />
    <path d="M3 20.8h18" />
  </Svg>
);

export const Pen: Icon = (p) => (
  <Svg {...p}>
    <path d="M14.8 4.6l4.6 4.6M4 20l4.6-1 11-11a1.7 1.7 0 0 0 0-2.4l-2.2-2.2a1.7 1.7 0 0 0-2.4 0l-11 11z" />
  </Svg>
);

export const User: Icon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.5 20.2a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const Users: Icon = (p) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.2" r="3.4" />
    <path d="M3 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.3" />
    <path d="M18.2 14.4A6.5 6.5 0 0 1 21 20" />
  </Svg>
);

export const Route: Icon = (p) => (
  <Svg {...p}>
    <circle cx="5.5" cy="5.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
    <path d="M8 5.5h6.5a3.5 3.5 0 0 1 0 7h-5a3.5 3.5 0 0 0 0 7H16" />
  </Svg>
);

export const Map: Icon = (p) => (
  <Svg {...p}>
    <path d="M9 4.2 3.5 6.3v13.5L9 17.7l6 2.1 5.5-2.1V4.2L15 6.3z" />
    <path d="M9 4.2v13.5M15 6.3v13.5" />
  </Svg>
);

export const Box: Icon = (p) => (
  <Svg {...p}>
    <path d="M12 2.9 20.5 7v10L12 21.1 3.5 17V7z" />
    <path d="M3.5 7 12 11.2 20.5 7M12 11.2V21" />
  </Svg>
);

export const Plus: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const Minus: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M5 12h14" />
  </Svg>
);

export const ChevronRight: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const ChevronLeft: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const ChevronDown: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M5 9l7 7 7-7" />
  </Svg>
);

export const Search: Icon = (p) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="M15.4 15.4 20.5 20.5" strokeWidth={2} />
  </Svg>
);

export const Filter: Icon = (p) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17l-6.6 7.6v5.6l-3.8 2v-7.6z" />
  </Svg>
);

export const Download: Icon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5v11.5" />
    <path d="M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4 18.5v1a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-1" />
  </Svg>
);

export const Settings: Icon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.2 14.4a1.4 1.4 0 0 0 .28 1.55l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05a1.4 1.4 0 0 0-1.55-.28 1.4 1.4 0 0 0-.85 1.29v.14a1.7 1.7 0 0 1-3.4 0v-.07a1.4 1.4 0 0 0-.92-1.29 1.4 1.4 0 0 0-1.55.28l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05a1.4 1.4 0 0 0 .28-1.55 1.4 1.4 0 0 0-1.29-.85h-.14a1.7 1.7 0 0 1 0-3.4h.07a1.4 1.4 0 0 0 1.29-.92 1.4 1.4 0 0 0-.28-1.55l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05a1.4 1.4 0 0 0 1.55.28h.07a1.4 1.4 0 0 0 .85-1.29v-.14a1.7 1.7 0 0 1 3.4 0v.07a1.4 1.4 0 0 0 .85 1.29 1.4 1.4 0 0 0 1.55-.28l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05a1.4 1.4 0 0 0-.28 1.55v.07a1.4 1.4 0 0 0 1.29.85h.14a1.7 1.7 0 0 1 0 3.4h-.07a1.4 1.4 0 0 0-1.29.85z" />
  </Svg>
);

export const Logout: Icon = (p) => (
  <Svg {...p}>
    <path d="M15 8V5.5A1.5 1.5 0 0 0 13.5 4h-7A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7a1.5 1.5 0 0 0 1.5-1.5V16" />
    <path d="M10.5 12h10" strokeWidth={2} />
    <path d="M17.5 8.7 20.8 12l-3.3 3.3" />
  </Svg>
);

export const Database: Icon = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="3.2" />
    <path d="M4 6v6c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2V6" />
    <path d="M4 12v6c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2v-6" />
  </Svg>
);

export const Bell: Icon = (p) => (
  <Svg {...p}>
    <path d="M6 9.5a6 6 0 1 1 12 0c0 4.2 1.4 5.6 1.9 6.1a.7.7 0 0 1-.5 1.2H4.6a.7.7 0 0 1-.5-1.2c.5-.5 1.9-1.9 1.9-6.1z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Svg>
);

export const Lock: Icon = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="1.75" />
    <path d="M8 10.5V7.4a4 4 0 0 1 8 0v3.1" />
    <path d="M12 14.5v2.5" strokeWidth={2} />
  </Svg>
);

export const Battery: Icon = (p) => (
  <Svg {...p}>
    <rect x="2" y="8" width="17" height="8" rx="2" />
    <path d="M21.5 11v2" strokeWidth={2.5} />
  </Svg>
);

export const Menu: Icon = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const MoreVertical: Icon = (p) => (
  <Svg {...p} strokeWidth={2.25}>
    <path d="M12 6.5h.01M12 12h.01M12 17.5h.01" />
  </Svg>
);

/** Name → component, for data-driven nav/menus. */
export const ICONS = {
  truck: Truck,
  cylinder: Cylinder,
  warehouse: Warehouse,
  clipboard: Clipboard,
  banknote: Banknote,
  check: Check,
  checkCircle: CheckCircle,
  x: X,
  xCircle: XCircle,
  alert: Alert,
  clock: Clock,
  sync: Sync,
  refresh: Refresh,
  wifi: Wifi,
  wifiOff: WifiOff,
  printer: Printer,
  signature: Signature,
  pen: Pen,
  user: User,
  users: Users,
  route: Route,
  map: Map,
  box: Box,
  plus: Plus,
  minus: Minus,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  search: Search,
  filter: Filter,
  download: Download,
  settings: Settings,
  logout: Logout,
  database: Database,
  bell: Bell,
  lock: Lock,
  battery: Battery,
  menu: Menu,
  moreVertical: MoreVertical,
} as const;

export type IconName = keyof typeof ICONS;
