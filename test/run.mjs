#!/usr/bin/env node
/* Bütün takımı koştur, özet bas, başarısızlıkta sıfırdan farklı çık. */
import behaviour from './behaviour.mjs';
import a11y from './a11y.mjs';
import layout from './layout.mjs';
import contrast from './contrast.mjs';
import motion from './motion.mjs';

const only = process.argv[2];
const ALL = { behaviour, a11y, layout, contrast, motion };
const pick = only ? { [only]: ALL[only] } : ALL;
if (only && !ALL[only]) {
  console.error(`Bilinmeyen takım: ${only}. Seçenekler: ${Object.keys(ALL).join(', ')}`);
  process.exit(2);
}

let fail = 0, total = 0;
for (const [key, fn] of Object.entries(pick)) {
  const t0 = Date.now();
  const s = await fn();
  console.log(`\n${s.name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  s.print();
  fail += s.failed(); total += s.rows.length;
}
console.log(`\n${total - fail}/${total} geçti${fail ? ` · ${fail} BAŞARISIZ` : ''}`);
process.exit(fail ? 1 : 0);
