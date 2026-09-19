# Proje kuralları

## Frontend tasarım yönü (kalıcı)

`frontend-design` skill'i (Anthropic, `claude-plugins-official`) bu projede kurulu
ve arayüz işlerinde kullanılmalı. Aşağıdakiler bu projenin sahibinin ek, bağlayıcı
tercihleridir — "ortalama AI frontend'i" kabul edilmez.

- **Görsel yön önce belirlenir.** Kod yazmadan önce bu iş için bilinçli bir görsel
  yön tanımla: konu, hedef kullanıcı, arayüzün asıl işi. Tasarım kararları o
  konudan türesin, hazır şablondan değil.
- **Tipografi.** Inter, Arial, Roboto, Helvetica, system-ui varsayılan olarak
  kullanılmaz. Bir ya da iki aile seç; iki ise belirgin biçimde farklı olsunlar.
  Tipografi sayfanın karakterini taşır.
- **Renk.** Tutarlı, karakterli bir renk sistemi kur (token olarak tanımla,
  dağınık hex değerleri bırakma). Rastgele gradient aksanı varsayılan değildir.
- **Düzen.** Kart ızgarası + gradient + üst navbar refleksine düşme. Konu
  gerektiriyorsa asimetrik, ızgarayı kıran düzen kullan.
- **Hareket.** Micro-interaction, hover, loading, geçiş ve sayfa açılış
  animasyonlarını baştan tasarla; hepsi tek bir hareket sistemine (paylaşılan
  eğri + süre token'ları) bağlı olsun. Animasyonlar birbiriyle uyumlu olmalı.
- **Derinlik.** Gölge, saydamlık, doku ve atmosferi gerektiği yerde kullan —
  süs olarak değil, hiyerarşi kurmak için.
- **Mobil baştan.** Responsive davranış sonradan eklenmez; ilk düzen kararıyla
  birlikte düşünülür.
- **Erişilebilirlik pazarlık konusu değil.** Kontrast oranlarını tahmin etme,
  ölç. Dokunma hedefleri en az 44px. `prefers-reduced-motion` desteklenir.
- **Tasarım ile kod kopuk olmaz.** Tasarım kararı kodda token olarak yaşar;
  ekran görüntüsündeki şey ile çalışan şey aynı olmalı.
- **Her proje farklı hissetmeli.** Önceki işin görsel dilini yeni işe kopyalama.

## Doğrulama alışkanlığı

Görsel ya da animasyonlu bir değişiklikten sonra varsayımla yetinme: tarayıcıda
çalıştır ve ölç (`getComputedStyle`, `getAnimations`, kontrast hesabı). GLSL
değişikliğinden sonra shader'ın derlendiğini doğrula.
