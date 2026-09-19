/* Panel: sahte Firebase verisiyle render, ve cihaz kimliğinin kalıcılığı.
   Ağ kullanılmıyor — fetch sayfa içinde değiştiriliyor. */
import http from 'http';
import fs from 'fs';
import { launch, page, suite } from './lib.mjs';

const PANEL = 'file://' + new URL('../panel.html', import.meta.url).pathname;
const APP_FILE = new URL('../ilac.html', import.meta.url).pathname;

export default async function run() {
  const s = suite('panel ve cihaz kimliği');
  const b = await launch();

  /* ——— panel ——— */
  const p = await page(b, { width: 1280, height: 900 });
  await p.addInitScript(() => {
    const DID_A='9a1f2c44-aaaa-4bbb-8ccc-111111111111', DID_B='7b2e3d55-dddd-4eee-9fff-222222222222';
    const now=Date.now(), DAY=864e5;
    const mk=(t,ty,extra)=>Object.assign({t,ts:new Date(t).toISOString(),ty},extra||{});
    function device(seed,gun){
      const ev={}, ses={}, ends={};
      for(let g=gun;g>=0;g--){
        const base=now-g*DAY;
        const day=new Date(base); day.setHours(8,55,0,0);
        const batch=[];
        const sid='s'+g+seed;
        batch.push(mk(day.getTime()-60000,'acilis',{ilacSayisi:3,ogunSayisi:4,saat:8}));
        const gec=[0,5,22,70,150][(g+seed)%5];
        batch.push(mk(day.getTime()+gec*60000,'doz_alindi',
          {ilac:'Vitamin D',ilacId:'a',saat:'09:00',gecikmeDk:gec,kaynak:g%2?'kadran':'dugme',gunToplam:3}));
        if((g+seed)%4===0)batch.push(mk(day.getTime()+9*36e5,'doz_atlandi',{ilac:'Demir',ilacId:'b',saat:'21:00',gecikmeDk:35}));
        else batch.push(mk(day.getTime()+12*36e5,'doz_alindi',{ilac:'Demir',ilacId:'b',saat:'21:00',gecikmeDk:-8}));
        for(let w=1;w<=4+((g+seed)%4);w++)
          batch.push(mk(day.getTime()+w*9e5,'su',{onceki:w-1,yeni:w,hedef:8,degisim:1}));
        batch.push(mk(day.getTime()+3e6,'sekme',{nereye:'diet',nereden:'med',kaynak:'kaydirma'}));
        ev['b'+g+seed]={d:seed?DID_B:DID_A,s:sid,n:batch.length,e:batch};
        ses[sid]={sid,start:day.getTime()-120000,startIso:new Date(day.getTime()-120000).toISOString(),
          ua:seed?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)':'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
          tz:'Europe/Istanbul',sw:seed?390:1512,sh:seed?844:982,vw:seed?390:1280,vh:seed?844:900,
          dpr:seed?3:2,standalone:!!seed,webgl:true,reduceMotion:false};
        ends['e'+g+seed]={sid,end:day.getTime()+4e5,endIso:new Date(day.getTime()+4e5).toISOString(),
          durMs:4e5+seed*1e5,activeMs:2.2e5};
      }
      return {events:ev,sessions:ses,sessionEnds:ends};
    }
    const DB={ [DID_A]:device(0,29), [DID_B]:device(1,12) };
    const realFetch=window.fetch;
    window.fetch=async (url,opt)=>{
      const u=String(url);
      const J=(o,ok=true)=>new Response(JSON.stringify(o),{status:ok?200:400,headers:{'Content-Type':'application/json'}});
      if(u.includes('identitytoolkit'))return J({idToken:'tok',refreshToken:'ref',localId:'UID1',expiresIn:'3600'});
      if(u.includes('securetoken'))return J({id_token:'tok',refresh_token:'ref',user_id:'UID1',expires_in:'3600'});
      if(u.includes('/devices.json')&&u.includes('shallow'))return J({[DID_A]:true,[DID_B]:true});
      const m=u.match(/\/devices\/([^/.]+)(\/(sessions|sessionEnds))?\.json/);
      if(m){const d=DB[m[1]]; if(!d)return J(null);
        if(m[3])return J(d[m[3]]); return J(d);}
      if(u.includes('/panel.json'))return opt&&opt.method==='PUT'?J(JSON.parse(opt.body)):J(null);
      return realFetch(url,opt);
    };
  });
  await p.goto(PANEL);
  await p.evaluate(() => { CFG.apiKey = 'sahte-anahtar'; });
  await p.fill('#em', 'a@b.c'); await p.fill('#pw', 'x'); await p.click('#go');
  await p.waitForSelector('.tile', { timeout: 15000 });
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({
    cihaz: document.querySelectorAll('.dev[data-id]').length,
    dosem: document.querySelectorAll('.tile').length,
    grafik: document.querySelectorAll('.chart svg').length,
    cubuk: document.querySelectorAll('.bar').length,
    tablo: document.querySelectorAll('details table').length,
    bos: document.querySelectorAll('.chart .empty').length,
    efsane: document.querySelectorAll('.legend i').length,
  }));
  s.ok('iki cihaz listelendi', r.cihaz === 2, String(r.cihaz));
  s.ok('istatistik döşemeleri', r.dosem === 6, String(r.dosem));
  s.ok('beş grafik çizildi', r.grafik === 5, String(r.grafik));
  s.ok('çubuklar var', r.cubuk > 40, String(r.cubuk));
  s.ok('boş grafik yok', r.bos === 0);
  s.ok('iki seri için efsane var', r.efsane >= 2, String(r.efsane));
  s.ok('tablo görünümü var', r.tablo === 3, String(r.tablo));
  /* tam sayı veride yarım adımlı eksen olmamalı */
  const ticks = await p.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<div class="chart" id="_t"></div>');
    barChart(document.getElementById('_t'), { labels: ['a','b','c'],
      series: [{ label: 'x', color: '#1F8F63', values: [1, 2, 1] }] });
    return [...document.querySelectorAll('#_t .axis')].map(t => t.textContent).filter(t => !isNaN(t));
  });
  s.ok('tam sayı veride tam sayı eksen', ticks.every(t => Number.isInteger(+t)), ticks.join(' '));
  const bar = await p.$('.bar');
  if (bar) { await bar.hover(); await p.waitForTimeout(350);
    s.ok('gezinme ipucu çıkıyor', await p.evaluate(() => !!document.querySelector('.tip.on'))); }
  s.ok('panelde JS hatası yok', p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
  await p.context().close();

  /* ——— cihaz kimliği ——— çerez file:// üzerinde çalışmaz, sunarak test et */
  const html = fs.readFileSync(APP_FILE);
  const srv = http.createServer((q, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
  });
  await new Promise(r2 => srv.listen(0, r2));
  const port = srv.address().port;
  const p2 = await page(b);
  const ctx = p2.context();
  const did = () => p2.evaluate(() => { try { return localStorage.getItem('ilac.did'); } catch (e) { return null; } });
  const ck = async () => (await ctx.cookies()).filter(c => c.name === 'ilac.did').map(c => c.value)[0] || null;

  await p2.goto(`http://localhost:${port}/`); await p2.waitForTimeout(2800);
  const d1 = await did();
  s.ok('kimlik üretildi ve çereze de yazıldı', !!d1 && d1 === await ck());
  await p2.evaluate(() => localStorage.removeItem('ilac.did'));
  await p2.reload(); await p2.waitForTimeout(2500);
  s.ok('localStorage silinince çerez kurtarıyor', (await did()) === d1);
  await ctx.clearCookies();
  await p2.reload(); await p2.waitForTimeout(2500);
  s.ok('çerez silinince localStorage kurtarıyor', (await did()) === d1 && (await ck()) === d1);
  await p2.goto(`http://localhost:${port}/?did=sabit-cihaz`); await p2.waitForTimeout(2800);
  s.ok('?did= kimliği çakıyor', (await did()) === 'sabit-cihaz' && (await ck()) === 'sabit-cihaz');
  s.ok('?did= URL\'den siliniyor', !p2.url().includes('did='), p2.url());
  await p2.goto(`http://localhost:${port}/`); await p2.waitForTimeout(2500);
  s.ok('çakılan kimlik kalıcı', (await did()) === 'sabit-cihaz');
  await p2.goto(`http://localhost:${port}/?did=../kotu`); await p2.waitForTimeout(2500);
  s.ok('geçersiz ?did= reddediliyor', (await did()) === 'sabit-cihaz');
  s.ok('uygulamada JS hatası yok', p2.__errors.length === 0, p2.__errors.slice(0, 2).join(' | '));

  await b.close(); srv.close();
  return s;
}
