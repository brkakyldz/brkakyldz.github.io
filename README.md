# brkakyldz.github.io

Berke Akyıldız'ın portfolyo sitesi — <https://brkakyldz.github.io/>

Bu depo **yalnızca yayınlanan siteyi** tutar: HTML sayfaları, CSS, JS,
yazı tipleri ve görseller. GitHub Pages kök dizinden servis ettiği için
burada duran her dosya herkese açıktır; o yüzden başka hiçbir şey
buraya girmez.

## Burada olmayanlar

Kaynak depo ayrıdır ve şunları tutar: proje metinlerinin markdown
kaynakları, sayfaları üreten `build.py`, şema SVG'lerinin temiz hâlleri,
ham ekran görüntüleri, ocean videosunun kaynak dosyası, tasarım
referansları ve çalışma belgeleri. Site oradan üretilir.

## Güncelleme

Bu depodaki dosyalar elle düzenlenmez — kaynak depoda düzenlenir ve
oradan senkronlanır:

    python tools/build.py       # sayfaları üret
    python tools/validate.py    # doğrula
    python tools/publish.py     # bu depoya senkronla

`publish.py` aynalama yapar: kaynakta olmayan dosya buradan silinir.
