# brkakyldz.github.io

Berke Akyıldız'ın portfolyo sitesi — <https://brkakyldz.github.io/>

Bu depo sitenin kendisidir: HTML sayfaları, CSS, JS, yazı tipleri ve
görseller. GitHub Pages kök dizinden servis ettiği için burada duran her
dosya herkese açıktır; o yüzden başka hiçbir şey buraya girmez.

## Düzenleme

Sayfalar **doğrudan burada** düzenlenir. 2026-09-09'a kadar site ayrı bir
kaynak depodan üretiliyordu; o depo arşive çekildi ve üretim zinciri
emekli oldu.

Ortak kabuk — `<head>`, üst bar, künye — yedi sayfaya kopyalanmış hâlde
durur. Birinde değişen şeyin diğer altısına elle taşınması gerekir, yoksa
sayfalar sessizce birbirinden ayrışır.

## Arşiv

`C:\new_portfolio` — artık kullanılmıyor, silinmiyor. İçinde sayfaları
üreten `tools/build.py`, proje metinlerinin markdown kaynakları
(`DOCS/PROJECTS/`), şema SVG'lerinin temiz hâlleri, 48 MB ham ekran
görüntüsü, ocean videosunun kaynak dosyası ve tasarım referansları var.
Proje sayfalarını markdown'dan yeniden üretmek gerekirse tek yol orası.

**`tools/publish.py` bir daha çalıştırılmamalı.** O betik bu depoyu
arşivin aynası hâline getiriyor: arşivde bulunmayan dosyayı buradan
siliyor ve burada elle yapılmış her düzenlemeyi eski hâliyle eziyor.
