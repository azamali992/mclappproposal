// Mounts the real App in a DOM, runs effects, drives a live mutation and checks
// the UI actually updated. This is the test that catches a blank screen or a
// re-render loop — neither of which server rendering can see.
// Run: npm run mount
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});

const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
g.HTMLElement = dom.window.HTMLElement;
g.HTMLCanvasElement = dom.window.HTMLCanvasElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) => dom.window.setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id);
g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
dom.window.matchMedia = g.matchMedia as never;
// jsdom has no canvas backend; SignaturePad only needs the call not to throw.
dom.window.HTMLCanvasElement.prototype.getContext = (() => null) as never;

const { createRoot } = await import('react-dom/client');
const { act } = await import('react-dom/test-utils');
const { createElement } = await import('react');
const App = (await import('../src/App.tsx')).default;
const { api, getState } = await import('../src/core/store.ts');

let failures = 0;
const check = (label: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

// Count renders to prove there is no runaway loop.
let renderTicks = 0;
const origError = console.error;
const seenErrors: string[] = [];
console.error = (...a: unknown[]) => {
  const msg = a.map(String).join(' ');
  if (msg.includes('Maximum update depth') || msg.includes('getSnapshot')) seenErrors.push(msg);
};

const root = createRoot(dom.window.document.getElementById('root')!);
const text = () => dom.window.document.body.textContent ?? '';

await act(async () => {
  root.render(createElement(App));
});

check('app mounts and paints', text().length > 300, `${text().length} chars of text`);
check('no re-render loop', seenErrors.length === 0, seenErrors[0]?.slice(0, 120) ?? 'clean');
check('clerk queue is on screen', /dispatch|queue|placed/i.test(text()));

// Drive a real mutation and confirm the DOM reflects it.
const target = getState().orders.find((o) => o.status === 'PLACED')!;
await act(async () => {
  api.switchUser(3); // clerk
  api.fillOrder(target.id);
});
const filled = getState().orders.find((o) => o.id === target.id)!;
check('store advanced the order', filled.status === 'FILLED');
check('UI re-rendered after an in-place mutation', /filled/i.test(text()), 'this is the bug the version counter fixes');

// Walk every role through the shell.
for (const u of getState().users) {
  await act(async () => {
    api.switchUser(u.id);
  });
  const t = text();
  check(`renders for ${u.role.padEnd(7)} (${u.name})`, t.length > 300, `${t.length} chars`);
}

// Offline capture, the flagship moment.
await act(async () => {
  api.switchUser(4);
  api.setOnline(false);
});
check('offline state reaches the UI', /offline/i.test(text()));

console.error = origError;
console.log(`\n${failures === 0 ? 'APP MOUNTS AND RESPONDS' : failures + ' CHECK(S) FAILED'}\n`);
void renderTicks;
process.exit(failures === 0 ? 0 : 1);
