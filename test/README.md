# Test

`ilac.html` için Playwright tabanlı kontroller. Uygulama tek dosya olduğu için
birim testi yok; hepsi gerçek tarayıcıda çalışan davranış ve ölçüm kontrolleri.

## Çalıştırma

```sh
cd test
npm install
npm test              # hepsi
npm test -- a11y      # tek takım: behaviour | a11y | layout | contrast | motion
```

Chromium yolu `CHROMIUM_PATH` ile verilebilir; verilmezse Playwright'ın kendi
indirdiği sürüm kullanılır.

## Takımlar

| Takım | Ne bakıyor |
| --- | --- |
| `behaviour` | Doz al/geri al/atla, stok muhasebesi, su, öğün maddesi, su hedefi sınırları, ilaç ekleme formu |
| `a11y` | Kontrol adları, Tab dolaşımı, odak halkası, panel odak tuzağı, Escape, odağın geri dönmesi, canlı bölge, diyalog semantiği |
| `layout` | Sekiz ekran boyutunda kadran/foot çakışması, dokunma hedefinin kadrana hizası, yatay kaydırma, düğmenin kabuğa sığması |
| `contrast` | Metin/zemin oranları (WCAG AA 4.5:1) ve birincil düğmenin beyaz etiketi |
| `motion` | Açılış sekansı, hapın kadrana hizası (yeniden boyutlandırma dahil), sekme geçişi, biten öğünün kapanması, geri alma sayacının süresi, hareket azaltma yolu |

## Neden bu şekilde yazıldı

Üç ölçüm tuzağı bu takımın içine gömülü — hepsi gerçek hata gizlemişti:

- **Geçişli özellikleri süreç dışından yoklamak yanıltıyor.** Bu ortamda bir
  geçiş ilk karesini ~540ms sonra alabiliyor; `lib.mjs`'teki `settle()` sayfanın
  kendi `requestAnimationFrame` saatiyle bekler.
- **Başsız Chromium `prefers-reduced-motion: reduce` bildiriyor.** Açıkça
  kapatılmazsa bütün animasyon ölçümleri anlamsız çıkar.
- **Dönüşüm altındaki öğeyi ölçmek yanlış sonuç verir.** Pasif sayfanın
  `scale(.92)`'si yüzünden 44px'lik düğmeler 40px görünüyordu.

Ayrıca kontrast testi zemini **DOM'dan türetir** (opak ataya kadar yürüyüp yarı
saydamları bindirerek), ekran görüntüsünden nokta örneklemez: dar metin
kutularında örnekleme harfin üstüne düşüp anlamsız oran veriyordu. Gradyan
dolgunun beyaz etiketi taşıyamadığı da böyle bir noktada ortaya çıkmıştı.
