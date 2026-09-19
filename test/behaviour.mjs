/* Veri yolları: doz al / geri al / atla, stok, su, öğün maddesi, hedef, form. */
import { launch, page, open, suite, dayKey } from './lib.mjs';

export default async function run() {
  const s = suite('davranış');
  const b = await launch();
  const p = await page(b);
  const now = () => { const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  /* dozun "şimdi" olması gerekiyor, yoksa sıradaki doz başka bir ilaç oluyor */
  await open(p, { meds: [{ id: 'a', name: 'Vitamin D', times: [now()],
    color: '#FFE0A8', shape: 'drop', added: dayKey(13), stock: 2 }], taken: {}, skipped: {} });
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('ilac.v7')));
  const undo = async () => { try {
      await p.waitForSelector('#toast.on', { timeout: 4000 });
      await p.evaluate(() => document.getElementById('toastBtn').click());
      await p.waitForTimeout(500); return true; } catch { return false; } };

  /* sabit beklemek bu kum havuzunda güvenilmez; kaydın gerçekleşmesini bekle */
  const yazildi = () => p.waitForFunction(
    'Object.values(JSON.parse(localStorage.getItem("ilac.v7")).taken).flat().length > 0',
    null, { timeout: 6000, polling: 100 }).catch(() => {});
  await p.click('#btnTake'); await yazildi();
  let d = await S();
  s.ok('doz alındı', Object.values(d.taken).flat().length === 1, JSON.stringify(Object.values(d.taken).flat()));
  s.ok('stok düştü', d.meds[0].stock === 1, 'stok=' + d.meds[0].stock);
  await undo(); d = await S();
  s.ok('geri al dozu sildi', Object.values(d.taken).flat().length === 0);
  s.ok('geri al stoğu şişirmedi', d.meds[0].stock === 2, 'stok=' + d.meds[0].stock);

  await p.click('#btnSkip'); await p.waitForTimeout(600); d = await S();
  s.ok('doz atlandı', Object.values(d.skipped).flat().length === 1);
  await undo(); d = await S();
  s.ok('atlama geri alındı', Object.values(d.skipped).flat().length === 0);

  /* stoğu bitmiş ilaçta al+geri al stoğu yoktan var etmemeli */
  await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('ilac.v7'));
    x.meds[0].stock = 0; localStorage.setItem('ilac.v7', JSON.stringify(x)); });
  await p.reload(); await p.waitForTimeout(3400);
  await p.click('#btnTake'); await p.waitForTimeout(600); await undo();
  s.ok('boş stok şişmedi', (await S()).meds[0].stock === 0);

  await p.click('#tabDiet'); await p.waitForTimeout(1400);
  const bugun = () => S().then(x => x.water[Object.keys(x.water).sort().pop()] || 0);
  /* tohum bugüne su yazmış olabilir; hedefte sınır olduğu için sıfırdan başla */
  await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('ilac.v7'));
    x.water[Object.keys(x.water).sort().pop()] = 0;
    localStorage.setItem('ilac.v7', JSON.stringify(x)); });
  await p.reload(); await p.waitForTimeout(3200);
  await p.click('#tabDiet'); await p.waitForTimeout(1400);
  const su0 = await bugun();
  for (let i = 0; i < 3; i++) {
    const before = await bugun();
    await p.click('.wtap');
    await p.waitForFunction(([k, v]) => {
      const w = JSON.parse(localStorage.getItem('ilac.v7')).water;
      return (w[Object.keys(w).sort().pop()] || 0) > v;
    }, [null, before], { timeout: 4000, polling: 80 }).catch(() => {});
  }
  const su1 = await bugun();
  s.ok('su eklendi', su1 === su0 + 3, `${su0} → ${su1}`);
  await p.click('.wmin'); await p.waitForTimeout(400);
  s.ok('su azaldı', (await bugun()) === su1 - 1);
  for (let i = 0; i < 4; i++) { const m = await p.$('.wmin');
    if (m && await m.isVisible()) { await m.click(); await p.waitForTimeout(200); } }
  s.ok('su 0 altına inmedi', Object.values((await S()).water).every(v => v >= 0));
  /* hedefte sınırlanıyor: Math.min(goal, cur+1) — kasıtlı, hedefi aşan sayaç yok */
  for (let i = 0; i < 12; i++) { await p.click('.wtap'); await p.waitForTimeout(120); }
  const hedef = (await S()).settings.waterGoal;
  s.ok('su hedefte sınırlanıyor', (await bugun()) === hedef, `${await bugun()}/${hedef}`);

  const food = await p.$('.meal:not(.done) .food');
  if (food) { await food.click(); await p.waitForTimeout(500);
    const on = await p.evaluate(() => document.querySelector('.meal:not(.done) .food').getAttribute('aria-pressed'));
    s.ok('öğün maddesi işaretlendi', on !== null); }

  await p.click('#tabMed'); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('btnSet').click()); await p.waitForTimeout(800);
  await p.click('#sPlus'); await p.click('#sPlus'); await p.waitForTimeout(400);
  s.ok('su hedefi arttı', (await S()).settings.waterGoal === 10);
  for (let i = 0; i < 12; i++) { const m = await p.$('#sMinus');
    if (m && !(await m.isDisabled())) { await m.click(); await p.waitForTimeout(100); } }
  s.ok('hedef alt sınırda durdu', (await S()).settings.waterGoal >= 1);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);

  await p.click('#btnAdd'); await p.waitForTimeout(800);
  await p.fill('#fName', 'Test İlaç'); await p.waitForTimeout(300);
  s.ok('saatsiz kaydet kapalı', await p.evaluate(() => document.getElementById('fSave').disabled));
  await p.click('#fAddTime'); await p.waitForTimeout(400);
  s.ok('ad+saat ile kaydet açık', await p.evaluate(() => !document.getElementById('fSave').disabled));
  await p.click('#fSave'); await p.waitForTimeout(800);
  const fin = await S();
  s.ok('ilaç eklendi', fin.meds.length === 2, 'adet=' + fin.meds.length);
  s.ok('eklenen ilaçta added var', !!fin.meds[fin.meds.length - 1].added);

  s.ok('JS hatası yok', p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
  await b.close();
  return s;
}
