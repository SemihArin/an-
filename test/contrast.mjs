/* Metin/zemin kontrastı. Zemini DOM'dan türetir (opak ataya kadar yürüyüp
   yarı saydamları bindirir), tahmin etmez. WCAG AA eşiği 4.5:1. */
import { launch, page, open, suite } from './lib.mjs';

const PAIRS_MED  = ['.name', '.count', '.sub', '.lbl'];
const PAIRS_DIET = ['.cl', '.food .t', '.meal h3 .mn', '.mt b', '.dw .dl', '.rg-n', '.add'];
const PAIRS_LIST = ['.st b', '.st span', '.row b', '.row small', '.lgnd em', '.hdrow b'];

const PROBE = `window.__cr=function(sel,fallback){
  const e=document.querySelector(sel); if(!e)return null;
  const num=cs=>cs.match(/[\\d.]+/g).map(Number);
  const over=(f,bg)=>{const a=f.length>3?f[3]:1;return [0,1,2].map(i=>f[i]*a+bg[i]*(1-a))};
  const stack=[]; let n=e.parentElement, base=null;
  while(n){const c=num(getComputedStyle(n).backgroundColor), a=c.length>3?c[3]:1;
    if(a>0)stack.push(c);
    if(a===1){base=stack.pop();break} n=n.parentElement;}
  if(!base)base=fallback;
  let bg=base; for(let i=stack.length-1;i>=0;i--)bg=over(stack[i],bg);
  const txt=over(num(getComputedStyle(e).color),bg);
  const L=c=>{const f=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
  const a=Math.max(L(txt),L(bg)),b=Math.min(L(txt),L(bg));
  return +((a+.05)/(b+.05)).toFixed(2);};`;

export default async function run() {
  const s = suite('kontrast');
  const b = await launch();
  const p = await page(b);
  await open(p);
  await p.addScriptTag({ content: PROBE });
  /* canvas üstündeki öğelerin zemini DOM'da yok — gerçek pikselden al */
  const shot = (await p.screenshot()).toString('base64');
  const bg = await p.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(8, Math.round(innerHeight * 0.62), 1, 1).data;
    return [d[0], d[1], d[2]];
  }, shot);

  const check = async list => { for (const sel of list) {
    const v = await p.evaluate(([q, f]) => window.__cr(q, f), [sel, bg]);
    if (v === null) continue;
    s.ok(`${sel} ≥ 4.5:1`, v >= 4.5, `${v}:1`);
  }};
  await check(PAIRS_MED);
  await p.click('#tabDiet'); await p.waitForTimeout(1500);
  await p.addScriptTag({ content: PROBE }); await check(PAIRS_DIET);
  await p.click('#tabMed'); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('btnList').click()); await p.waitForTimeout(1400);
  await p.addScriptTag({ content: PROBE }); await check(PAIRS_LIST);

  /* Panel hâlâ açıktı: ekran görüntüsünden örnekleyince düğme yerine panelin
     yüzeyi okunuyordu. Önce kapat. */
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  /* birincil düğme dolgusu: beyaz etiketi taşıyabiliyor mu */
  const box = await p.evaluate(() => { const r = document.querySelector('.take').getBoundingClientRect();
    return [r.x, r.y, r.width, r.height]; });
  const s2 = (await p.screenshot()).toString('base64');
  const btn = await p.evaluate(async ({ b64, box }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const L = (r, gg, bb) => { const f = v => { v /= 255;
      return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
      return .2126 * f(r) + .7152 * f(gg) + .0722 * f(bb); };
    const [x, y, w] = box; let worst = 0;
    for (let i = 2; i <= 8; i++) { const d = g.getImageData(Math.round(x + w * i / 10), Math.round(y + 6), 1, 1).data;
      worst = Math.max(worst, L(d[0], d[1], d[2])); }
    return +((1.05) / (worst + .05)).toFixed(2);
  }, { b64: s2, box });
  s.ok('birincil düğme beyaz etiket ≥ 4.5:1', btn >= 4.5, `${btn}:1`);
  s.ok('JS hatası yok', p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
  await b.close();
  return s;
}
