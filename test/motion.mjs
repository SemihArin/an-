/* Açılış sekansı, sekme geçişi, hareket azaltma, yeniden boyutlandırmada
   hapın kadrana hizası, biten öğünün kapanması, geri alma sayacı. */
import { launch, page, open, settle, suite, dayKey } from './lib.mjs';

export default async function run() {
  const s = suite('hareket ve durum');
  const b = await launch();

  /* açılış: kalp tam boy ve ortada → hap kadranın merkezinde */
  let p = await page(b);
  await p.goto((await import('./lib.mjs')).APP);
  await p.waitForTimeout(700);
  const boot = await p.evaluate(() => ({ shape: scene.shape, scale: +scene.scale.toFixed(2), off: scene.off }));
  s.ok('açılışta kalp tam boy', boot.shape === 3 && boot.scale > .7, JSON.stringify(boot));
  s.ok('açılışta kalp ortada', boot.off[0] === 0 && boot.off[1] === 0);
  await p.waitForTimeout(3600);
  s.ok('hap devraldı', await p.evaluate(() => booted && scene.shape !== 3));
  const sapma = await p.evaluate(() => {
    const t = document.querySelector('.track').getBoundingClientRect();
    const wx = scene.off[0] * innerHeight + innerWidth / 2;
    const wy = innerHeight / 2 - (scene.off[1] + .05) * innerHeight;
    return Math.round(Math.hypot(wx - (t.x + t.width / 2), wy - (t.y + t.height / 2)));
  });
  s.ok('hap kadranın merkezinde', sapma <= 1, `sapma ${sapma}px`);
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(900);
  const sapma2 = await p.evaluate(() => {
    const t = document.querySelector('.track').getBoundingClientRect();
    const wx = scene.off[0] * innerHeight + innerWidth / 2;
    const wy = innerHeight / 2 - (scene.off[1] + .05) * innerHeight;
    return Math.round(Math.hypot(wx - (t.x + t.width / 2), wy - (t.y + t.height / 2)));
  });
  s.ok('yeniden boyutlandırmada hiza korunuyor', sapma2 <= 1, `sapma ${sapma2}px`);
  await p.context().close();

  /* diyet sekmesinde hap sönüyor, dönünce geri geliyor */
  p = await page(b); await open(p);
  await p.click('#tabDiet'); await p.waitForTimeout(1300);
  s.ok('diyette hap sönük', await p.evaluate(() => scene.alive < .1));
  await p.click('#tabMed'); await p.waitForTimeout(1300);
  s.ok('ilaçta hap geri geldi', await p.evaluate(() => scene.alive > .9));
  s.ok('geçişte hiza kaymıyor', await p.evaluate(() => Math.abs(scene.off[0]) < .005));

  /* biten öğün kapanıyor, dokununca açılıyor */
  await p.click('#tabDiet'); await settle(p, 2500);
  const done = await p.$('.meal.done .msum');
  if (done) {
    const kapali = await p.evaluate(() => document.querySelector('.meal.done').getBoundingClientRect().height);
    await done.click(); await p.waitForTimeout(500);
    const acik = await p.evaluate(() => document.querySelector('.meal.done').getBoundingClientRect().height);
    s.ok('biten öğün kapanıyor', acik > kapali + 40, `${Math.round(kapali)} → ${Math.round(acik)}px`);
  } else s.ok('biten öğün kapanıyor', true, '(bu tohum verisinde biten öğün yok)');

  /* geri alma sayacı ile bildirimin ömrü örtüşmeli */
  await p.click('#tabMed'); await p.waitForTimeout(900);
  await p.evaluate(() => { const b2 = document.getElementById('btnTake'); if (!b2.disabled) b2.click(); });
  try {
    await p.waitForSelector('#toast.on', { timeout: 4000 });
    const t = await p.evaluate(() => {
      const a = document.getElementById('toastBar').getAnimations()[0];
      return a ? a.effect.getTiming().duration : null; });
    s.ok('geri alma sayacı 5s', t === 5000, `${t}ms`);
  } catch { s.ok('geri alma sayacı 5s', false, 'bildirim görünmedi'); }
  await p.context().close();

  /* hareket azaltma yolu çökmüyor */
  p = await page(b, { motion: false });
  await p.goto((await import('./lib.mjs')).APP); await p.waitForTimeout(2600);
  s.ok('hareket azaltmada açılıyor', await p.evaluate(() => booted === true));
  s.ok('JS hatası yok', p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
  await b.close();
  return s;
}
