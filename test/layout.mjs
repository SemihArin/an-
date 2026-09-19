/* Sekiz ekran boyutunda düzen: kadran çakışmıyor mu, yatay kaydırma var mı,
   dokunma hedefi kadranın merkezinde mi, panel kabuğa uyuyor mu. */
import { launch, page, open, suite } from './lib.mjs';

const SIZES = [[320,568],[390,667],[390,844],[414,896],[768,1024],[1024,640],[1280,800],[1440,900]];

export default async function run() {
  const s = suite('düzen');
  const b = await launch();
  for (const [w, h] of SIZES) {
    const p = await page(b, { width: w, height: h });
    await open(p);
    const m = await p.evaluate(() => {
      const R = q => { const e = document.querySelector(q); if (!e) return null;
        const r = e.getBoundingClientRect();
        return { y: r.y, b: r.bottom, w: r.width, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
      const dial = R('.track'), foot = R('.foot'), tap = R('.tap');
      const labs = [...document.querySelectorAll('#labels text')].map(e => e.getBoundingClientRect());
      const bot = labs.length ? Math.max(...labs.map(l => l.bottom)) : dial.b;
      return {
        bosluk: Math.round(foot.y - Math.max(dial.b, bot)),
        sapma: Math.round(Math.hypot(tap.cx - dial.cx, tap.cy - dial.cy)),
        take: Math.round(R('.take').w),
        hScroll: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const etiket = `${w}×${h}`;
    s.ok(`${etiket} kadran/foot çakışmıyor`, m.bosluk >= 0, `boşluk ${m.bosluk}px`);
    s.ok(`${etiket} dokunma hedefi ortalı`, m.sapma <= 1, `sapma ${m.sapma}px`);
    s.ok(`${etiket} yatay kaydırma yok`, !m.hScroll);
    s.ok(`${etiket} düğme kabukta`, m.take <= 320, `${m.take}px`);
    await p.context().close();
  }
  await b.close();
  return s;
}
