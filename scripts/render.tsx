// Renders every surface in every role to catch runtime crashes a typecheck
// cannot. Not a substitute for opening the app — it proves nothing throws on
// first paint with the seeded data. Run: npm run render
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { api, getState } from '../src/core/store.ts';
import { ToastProvider } from '../src/ui/primitives.tsx';
import BackOffice from '../src/apps/backoffice/index.tsx';
import DriverTab from '../src/apps/driver/index.tsx';
import ClientApp from '../src/apps/client/index.tsx';

const SURFACES: Record<string, () => unknown> = {
  client: ClientApp,
  sales: BackOffice,
  clerk: BackOffice,
  driver: DriverTab,
  gate: BackOffice,
  cashier: BackOffice,
  admin: BackOffice,
};

let failures = 0;
for (const user of getState().users) {
  const Surface = SURFACES[user.role];
  if (!Surface) continue;
  api.switchUser(user.id);
  try {
    const html = renderToString(h(ToastProvider, null, h(Surface as never, null)));
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const ok = text.length > 120;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${user.role.padEnd(8)} ${user.name.padEnd(16)} ${html.length} bytes`);
    if (!ok) failures++;
  } catch (e) {
    console.log(`FAIL  ${user.role.padEnd(8)} ${user.name.padEnd(16)} ${(e as Error).message}`);
    failures++;
  }
}

console.log(`\n${failures === 0 ? 'ALL SURFACES RENDER' : failures + ' SURFACE(S) FAILED'}\n`);
process.exit(failures === 0 ? 0 : 1);
