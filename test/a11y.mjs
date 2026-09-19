/* Klavye ve ekran okuyucu yüzeyi. */
import { launch, page, open, suite } from './lib.mjs';

export default async function run() {
  const s = suite('erişilebilirlik');
  const b = await launch();
  const p = await page(b);
  await open(p);

  s.ok('her kontrolün adı var', (await p.evaluate(() => {
    const bad = [];
    document.querySelectorAll('button,a,input,textarea').forEach(e => {
      if (e.offsetParent === null) return;
      const n = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim();
      if (!n) bad.push(e.id || e.className || e.tagName);
    });
    return bad;
  })).length === 0);

  const tabs = [];
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab');
    tabs.push(await p.evaluate(() => { const a = document.activeElement;
      return a ? (a.id || (typeof a.className === 'string' ? a.className : '') || a.tagName) : 'yok'; })); }
  s.ok('Tab gövdede dolaşıyor', tabs.filter(t => t && t !== 'BODY').length >= 5, tabs.slice(0, 5).join(' → '));

  await p.evaluate(() => document.getElementById('btnTake').focus());
  s.ok('odak halkası görünür',
    parseFloat(await p.evaluate(() => getComputedStyle(document.getElementById('btnTake')).outlineWidth)) >= 2);

  await p.evaluate(() => document.getElementById('btnSet').focus());
  await p.evaluate(() => document.getElementById('btnSet').click());
  await p.waitForTimeout(900);
  s.ok('panel açıldı', await p.evaluate(() => document.getElementById('sheetSet').classList.contains('open')));
  const inside = [];
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab');
    inside.push(await p.evaluate(() => {
      const sh = document.getElementById('sheetSet');
      return sh.contains(document.activeElement) ? 'panel' : 'DIŞARI'; })); }
  s.ok('odak panelde kalıyor', inside.every(x => x === 'panel'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  s.ok('Escape kapatıyor', !(await p.evaluate(() => document.getElementById('sheetSet').classList.contains('open'))));
  s.ok('odak açan düğmeye döndü',
    (await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'btnSet');

  const t = await p.evaluate(() => { const x = document.getElementById('toast');
    return x.getAttribute('role') + '/' + x.getAttribute('aria-live'); });
  s.ok('bildirim canlı bölge', t === 'status/polite', t);
  s.ok('sekmeler aria-pressed bildiriyor',
    await p.evaluate(() => document.getElementById('tabMed').getAttribute('aria-pressed') === 'true'));
  s.ok('sayfa dili tr', (await p.evaluate(() => document.documentElement.lang)) === 'tr');
  s.ok('paneller diyalog', await p.evaluate(() =>
    [...document.querySelectorAll('.sheet')].every(x => x.getAttribute('role') === 'dialog')));
  s.ok('JS hatası yok', p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
  await b.close();
  return s;
}
