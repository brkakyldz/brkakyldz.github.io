# Proje Portföyü

Berke Akyıldız'ın proje portföyü. Statik HTML/CSS/JS — build adımı, paket yöneticisi ve
harici bağımlılık yok. Klasörü olduğu gibi herhangi bir statik barındırmaya atabilirsin.

## Yapı

```
portfolio/
├── index.html                  Ana sayfa (hero + 4 proje kartı + yaklaşım)
├── projeler/
│   ├── second-brain-os.html
│   ├── tech-inves.html
│   ├── terminal-organizer.html
│   └── heart-disease-prediction.html
└── assets/
    ├── css/style.css           Tüm tasarım sistemi (renk, tipografi, bileşenler)
    ├── js/site.js              Scrollspy, beliriş animasyonu, lightbox
    └── img/<proje>/*.webp      Ekran görüntüleri
```

## Yerelde çalıştırma

Dosyaları doğrudan çift tıklayarak da açabilirsin, ama `file://` altında bazı tarayıcılar
göreli yolları kısıtlar. Önerilen:

```bash
python -m http.server 4173 --directory portfolio
```

Sonra `http://localhost:4173` adresine git.

## GitHub Pages'e yayınlama

1. Yeni bir repo aç (örn. `brkakyldz.github.io` ya da `portfolio`).
2. Bu klasörün **içeriğini** repo köküne kopyala (yani `index.html` kökte olsun).
3. `Settings → Pages → Source: Deploy from a branch → main / (root)`.

Alt klasörde yayınlarsan (`/portfolio/`) linkler yine çalışır; hepsi göreli.

## İçerik notları

- Sayfalardaki **tüm rakamlar** repo kodundan veya canlı uygulamadan doğrulandı; README'lerdeki
  hatalı değerler (heart-disease için %96,6 recall, 303 satır, yanlış hiperparametreler)
  bilinçli olarak kullanılmadı.
- Terminal Organizer ekran görüntülerinde görünen e-posta adresi maskelendi.
- Heart Disease görsellerinden biri (yinelenen kare) ve tarayıcı çerçevesi görünen kare
  çıkarıldı; kalan üç görsel akışı anlatıyor.
- Görseller WebP'ye çevrildi (2,3 MB → ~900 KB) ve en fazla 1920px genişliğe indirildi.

## Yeni proje eklemek

1. `projeler/` altındaki bir sayfayı kopyala, `slug`'ı ve içeriği değiştir.
2. `assets/img/<yeni-proje>/` klasörünü aç, görselleri WebP olarak koy.
3. `index.html`'e yeni bir `.card` bloğu ekle ve sıra numaralarını güncelle.
4. Komşu proje sayfalarındaki `.pager` linklerini yeni sıraya göre düzelt.
