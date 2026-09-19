/* Ortak yardımcılar. Betikler arasında kopyalanan tarayıcı açma / veri tohumlama
   / animasyon bekleme kodunu tek yerde toplar. */
import { chromium } from 'playwright';

export const APP = 'file://' + new URL('../ilac.html', import.meta.url).pathname;

/* Bu ortamda Chromium önceden kurulu; pinlenmiş sürüm indirmeye çalışmasın. */
const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function launch() {
  return chromium.launch({
    executablePath: EXEC,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
}

/* Başsız Chromium `prefers-reduced-motion: reduce` bildiriyor; açıkça kapatmazsak
   bütün animasyon ölçümleri anlamsız çıkar. */
export async function page(browser, { width = 390, height = 844, motion = true } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion: motion ? 'no-preference' : 'reduce',
  });
  const p = await ctx.newPage();
  p.__errors = [];
  p.on('pageerror', e => p.__errors.push('PAGEERROR ' + e.message));
  p.on('console', m => {
    const t = m.text();
    /* sandbox vekili Google Fonts ve Firebase'i kesiyor — uygulamanın hatası değil */
    if (m.type() === 'error' && !/CERT_AUTHORITY|net::ERR|Failed to load resource/.test(t))
      p.__errors.push('console ' + t);
  });
  return p;
}

export const dayKey = (back = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
};

/* Varsayılan tohum: iki ilaç, üç öğün, bir haftalık geçmiş. `over` ile ezilebilir. */
export function seedData(over = {}) {
  const t0 = dayKey(13), today = dayKey(0);
  const S = {
    meds: [
      { id: 'a', name: 'Vitamin D', times: ['09:00'], color: '#FFE0A8', shape: 'drop', added: t0, stock: 9 },
      { id: 'b', name: 'Demir', times: ['13:00', '21:00'], color: '#FFB3CD', shape: 'capsule', added: t0, stock: 4 },
    ],
    taken: {}, skipped: {}, water: {}, eaten: {},
    diet: [
      { id: 'm1', name: 'Kahvaltı', time: '08:00', items: ['yumurta', 'ekmek', 'yeşillik'], added: t0 },
      { id: 'm2', name: 'Ara öğün', time: '11:00', items: ['elma', 'badem'], added: t0 },
      { id: 'm3', name: 'Öğle', time: '13:00', items: ['tavuk', 'bulgur', 'yoğurt'], added: t0 },
    ],
    settings: { waterGoal: 8 },
  };
  const ratio = [1, .85, .6, 1, .7, .45, .75];
  const all = ['m1#0','m1#1','m1#2','m2#0','m2#1','m3#0','m3#1','m3#2'];
  for (let i = 6; i >= 0; i--) {
    const k = dayKey(i);
    S.taken[k] = i % 3 === 0 ? ['a@09:00'] : ['a@09:00', 'b@13:00', 'b@21:00'];
    if (i % 4 === 0) S.skipped[k] = ['b@21:00'];
    S.water[k] = Math.round(ratio[6 - i] * 8);
    S.eaten[k] = all.slice(0, Math.round(ratio[6 - i] * all.length));
  }
  S.taken[today] = []; S.eaten[today] = all.slice(0, 3);
  return Object.assign(S, over);
}

export async function open(p, over) {
  await p.goto(APP);
  await p.evaluate(d => localStorage.setItem('ilac.v7', JSON.stringify(d)), seedData(over));
  await p.reload();
  await booted(p);
  await settle(p, 3000);
  return p;
}

/* `settle` yalnız "şu an animasyon yok" der; açılıştan hemen sonra çağrılırsa
   sekans daha başlamadan döner ve testler perde altına tıklar. Önce açılışın
   bittiğini bekle. */
export async function booted(p, timeout = 12000) {
  /* `booted` betiğin tepesinde `let` ile tanımlı: global sözcüksel ortamda,
     `window` özelliği olarak değil — `window.booted` daima undefined. */
  await p.waitForFunction('typeof booted !== "undefined" && booted === true',
    null, { timeout, polling: 120 });
}

/* Süreç dışından yoklamak yanıltıyor: bu kum havuzunda bir geçiş ilk karesini
   ~540ms sonra alabiliyor. Sayfanın kendi rAF saatiyle bekle. */
export async function settle(p, max = 2500) {
  await p.evaluate(ms => new Promise(res => {
    const t0 = performance.now();
    (function tick() {
      if (performance.now() - t0 > ms || document.getAnimations().length === 0) return res();
      requestAnimationFrame(tick);
    })();
  }), max);
}

export function suite(name) {
  const rows = [];
  return {
    name, rows,
    ok(label, pass, detail = '') { rows.push({ pass: !!pass, label, detail }); },
    failed() { return rows.filter(r => !r.pass).length; },
    print() {
      for (const r of rows) console.log(`  ${r.pass ? '✓' : '✗'} ${r.label.padEnd(36)}${r.detail}`);
    },
  };
}
