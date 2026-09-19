// Mounts the app in Urdu and checks the language actually reaches the screen:
// RTL direction, Nastaliq lang attribute, real Urdu glyphs, and no untranslated
// slabs of English left in the dealer and driver surfaces.
// Run: npm run urdu
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
const mm = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
g.matchMedia = mm;
dom.window.matchMedia = mm as never;
dom.window.HTMLCanvasElement.prototype.getContext = (() => null) as never;
// Start the app already in Urdu.
dom.window.localStorage.setItem('mcl.lang', 'ur');

const { createRoot } = await import('react-dom/client');
const { act } = await import('react-dom/test-utils');
const { createElement } = await import('react');
const App = (await import('../src/App.tsx')).default;
const { api, getState } = await import('../src/core/store.ts');
const { missingUrdu } = await import('../src/i18n/index.tsx');

let failures = 0;
const check = (l: string, c: boolean, e = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${e ? ' — ' + e : ''}`);
  if (!c) failures++;
};

const URDU = /[؀-ۿ]/;
const root = createRoot(dom.window.document.getElementById('root')!);
const text = () => dom.window.document.body.textContent ?? '';
/** Share of visible non-numeric characters that are Arabic-script. */
function urduShare(s: string): number {
  const letters = s.replace(/[^\p{L}]/gu, '');
  if (!letters.length) return 0;
  const ur = (letters.match(/[؀-ۿ]/gu) ?? []).length;
  return ur / letters.length;
}

await act(async () => { root.render(createElement(App)); });

check('document direction is RTL', dom.window.document.documentElement.dir === 'rtl');
check('document language is Urdu', dom.window.document.documentElement.lang === 'ur');
check('Urdu glyphs render', URDU.test(text()));

for (const u of getState().users) {
  await act(async () => { api.switchUser(u.id); });
  const t = text();
  const share = urduShare(t);
  const isFieldApp = u.role === 'client' || u.role === 'driver';
  if (isFieldApp) {
    // Field apps are read by drivers and dealers — they must be substantially Urdu.
    check(
      `${u.role.padEnd(7)} renders Urdu`,
      t.length > 200 && share >= 0.5,
      `${Math.round(share * 100)}% Arabic-script`,
    );
  } else {
    // The back office is deliberately mixed: it runs against an English Oracle
    // ERP, and its screens are dominated by Latin data — customer names, SKUs,
    // ECRs, money. A share threshold just measures how table-heavy a screen is.
    // What actually matters is that the chrome a person reads is translated.
    const words = new Set((t.match(/[؀-ۿ]+/gu) ?? []).filter((w) => w.length > 1));
    check(
      `${u.role.padEnd(7)} chrome is Urdu`,
      t.length > 200 && words.size >= 8,
      `${words.size} distinct Urdu words, ${Math.round(share * 100)}% of letters`,
    );
  }
}

const missed = [...missingUrdu];
check('no missing Urdu keys hit during render', missed.length === 0,
  missed.length ? `${missed.length}: ${missed.slice(0, 6).join(' | ')}` : 'complete');

console.log(`\n${failures === 0 ? 'URDU WORKS' : failures + ' CHECK(S) FAILED'}\n`);
process.exit(failures === 0 ? 0 : 1);
