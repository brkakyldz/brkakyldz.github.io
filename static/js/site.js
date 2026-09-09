/* Ocean / Machine — kaydırma koreografisi.
   İçerik JS olmadan da okunur; burası yalnızca vurgu, perde ve deniz videosunu yönetir. */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* CSS'teki ayrık düzen eşiğiyle aynı sayı: bunun altında .field zaten
     display:none, sıfır boyutlu kutudan --dx/--dy hesaplamak anlamsız. */
  var narrow = window.matchMedia('(max-width: 1150px)');

  /* ---------- deniz videosu: yalnızca isteyene ve yalnızca gerekiyorsa ----------
     Kaynaklar HTML'de durmuyor. 2,9 MB'lık döngü ve 1440p çözme telefonda
     bedava değil; dar ekranda, hareket azaltmada ve veri tasarrufunda video
     hiç istenmiyor. O durumlarda <video> kendi posterini gösteriyor, yani
     kadraj aynı kalıyor ve indirilen tek şey zaten yüklenmiş olan poster.
     JavaScript yoksa da sonuç aynı: kaynak eklenmez, poster kalır. */
  var video = doc.querySelector('.ocean__video');
  if (video) {
    var wideEnough = window.matchMedia('(min-width: 901px)');
    var lightData = window.matchMedia('(prefers-reduced-data: reduce)');
    var wantsVideo = function () {
      return wideEnough.matches && !reduce.matches && !lightData.matches;
    };
    var attached = false;
    var attach = function () {
      if (attached) { return; }
      attached = true;
      ['webm', 'mp4'].forEach(function (kind) {
        var src = video.getAttribute('data-' + kind);
        if (!src) { return; }
        var el = doc.createElement('source');
        el.src = src;
        el.type = kind === 'webm' ? 'video/webm' : 'video/mp4';
        video.appendChild(el);
      });
      video.load();
    };
    var start = function () {
      if (!wantsVideo()) { video.pause(); return; }
      attach();
      video.muted = true;
      var p = video.play();
      if (p && p.catch) { p.catch(function () { /* otomatik oynatma engellendi: poster kalır */ }); }
    };
    start();
    [reduce, wideEnough, lightData].forEach(function (mq) {
      mq.addEventListener && mq.addEventListener('change', start);
    });
    /* sekme gizlenince tarayıcı zaten durdurur; sayfanın sonunda da durdurmaya gerek yok, deniz her yerde görünür */
  }

  /* ---------- iniş: sayfa boyunca ışığın azalması ----------
     Deniz aynı deniz; değişen tek şey üstüne düşen ışık. Açılışta perde yok,
     bölümler boyunca su derinleşir, kapanışta yeniden yüzeye çıkılır ve dalganın
     temposu bir tık yavaşlar. Ölçüler sayfadaki gerçek yer imlerinden okunuyor —
     açılışın bittiği, ilk bölümün başladığı, kapanışın başladığı yer — çünkü
     bölüm eklenip çıkarıldığında burada güncellenecek bir sayı kalmamalı.
     Bölümlerin kendi perdesi (CSS: --veil) bunun üstünde durur; buradaki perde
     onların arasındaki boşlukları, yani denizin göründüğü yeri yönetir. */
  var ocean = doc.querySelector('.ocean');
  var deep = ocean && ocean.querySelector('.ocean__deep');
  var opening = doc.querySelector('.hero');
  var firstChapter = doc.querySelector('.chapter');
  var contact = doc.getElementById('iletisim');
  if (deep && opening && firstChapter && contact) {
    var openEnd = 0, deepStart = 1, closeStart = 2;
    var lastDive = -1, lastRate = 1, queued = false;

    function docTop(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
    function measure() {
      openEnd = docTop(opening) + opening.offsetHeight;
      deepStart = docTop(firstChapter);
      closeStart = docTop(contact);
      if (deepStart <= openEnd) { deepStart = openEnd + 1; }
    }
    /* Yumuşak geçiş: iniş hiçbir yerde kenar yapmasın. */
    function smooth(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }

    function apply() {
      queued = false;
      var vh = window.innerHeight;
      var eye = window.pageYOffset + vh / 2;              /* okuyucunun gözü: ekranın ortası */
      var up = smooth((eye - closeStart) / (vh * .55));   /* kapanışta yüzeye çıkış */
      var dive = eye <= openEnd ? 0 : smooth((eye - openEnd) / (deepStart - openEnd));
      dive = dive * (1 - up * .88);
      var v = Math.round(dive * 1000) / 1000;
      if (v !== lastDive) { ocean.style.setProperty('--dive', v); lastDive = v; }
      /* Kapanışta dalga yavaşlar. Her karede yazmak medya hattını yorar: eşik. */
      if (video && !reduce.matches) {
        var rate = 1 - .3 * up;
        if (Math.abs(rate - lastRate) > .02) {
          try { video.playbackRate = rate; } catch (err) { /* tarayıcı reddedebilir */ }
          lastRate = rate;
        }
      }
    }
    function onScroll() { if (!queued) { queued = true; window.requestAnimationFrame(apply); } }

    measure();
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    /* Yazı tipleri geldiğinde düzen oturur; yer imleri yeniden ölçülür. */
    window.addEventListener('load', function () { measure(); onScroll(); });
  }

  /* ---------- üst çubuk: kaydırdıkça geri çekilir ----------
     Açılışta gezinme kolayca bulunur; sayfa hareket ettikçe çubuk söner ve
     kompozisyonun önünden çekilir. Kaybolmaz: sönük hâlde de tıklanır, imleç
     ya da klavye üstüne geldiğinde tam görünürlüğe döner — o kural CSS'te.
     Buradaki tek durum 0..1 arası bir sayıdır (--fade); sönmenin ne kadar
     olduğu da CSS'te yazar, bu dosya oranı bilmez. */
  var top = doc.querySelector('.top');
  if (top) {
    var lastFade = -1, fadeQueued = false;
    var readFade = function () {
      fadeQueued = false;
      /* Sönme açılışın ilk yarım ekranında tamamlanır; çok kısa sayfalarda
         da bir eşik kalsın diye alt sınır var. */
      var span = Math.max(160, window.innerHeight * .5);
      var f = Math.min(1, Math.max(0, window.pageYOffset / span));
      f = f * f * (3 - 2 * f);                              /* kenarsız geçiş */
      var v = Math.round(f * 100) / 100;
      if (v !== lastFade) { top.style.setProperty('--fade', v); lastFade = v; }
    };
    window.addEventListener('scroll', function () {
      if (!fadeQueued) { fadeQueued = true; window.requestAnimationFrame(readFade); }
    }, { passive: true });
    window.addEventListener('resize', readFade);
    readFade();
  }

  /* ---------- üst çubuk: dar ekranda menü ----------
     Düğme gerçek bir <button>: durumunu aria-expanded ile söyler, açtığı
     listeyi aria-controls ile gösterir. Escape'le ve bir bağlantı seçilince
     kapanır; geniş düzene geçildiğinde de kapanır, çünkü orada liste zaten
     açıkta ve "açık" durumu artık bir şey anlatmaz. */
  var toggle = top && top.querySelector('.top__toggle');
  var topNav = top && top.querySelector('.top__nav');
  if (toggle && topNav) {
    var setOpen = function (open) {
      top.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', function () {
      setOpen(!top.classList.contains('is-open'));
    });
    topNav.addEventListener('click', function (e) {
      if (e.target && e.target.tagName === 'A') { setOpen(false); }
    });
    doc.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && top.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    var wide = window.matchMedia('(min-width: 901px)');
    var closeWhenWide = function (e) { if (e.matches) { setOpen(false); } };
    if (wide.addEventListener) { wide.addEventListener('change', closeWhenWide); }
    else if (wide.addListener) { wide.addListener(closeWhenWide); }
  }

  /* ---------- üst çubuk: nerede olduğunu bildirir ----------
     Menüdeki işaret ekranın ortasından geçen bölümü gösterir; başka bir
     gösterge yok. Bir menü bağlantısı, ya kendisi bu sayfadaki bir bölüme
     gidiyorsa ya da data-sec ile bir bölüme bağlanmışsa takip edilir; ayrıntı
     sayfalarındaki bağlantılar ana sayfaya gittiği için orada takip kendiliğinden
     kapalı kalır ve HTML'deki aria-current="page" bozulmaz. */
  var marks = [];
  Array.prototype.forEach.call(doc.querySelectorAll('.top__nav a'), function (a) {
    var sel = a.getAttribute('data-sec');
    if (!sel) { var h = a.getAttribute('href') || ''; if (h.charAt(0) === '#' && h.length > 1) { sel = h; } }
    var sec = sel && doc.querySelector(sel);
    if (sec) { marks.push({ a: a, sec: sec }); }
  });
  /* Belge sırası, menü sırası değil: aşağıdaki seçim "üstü çizgiyi geçmiş
     sonuncusu" olduğu için sıranın doğru olması şart. */
  marks.sort(function (x, y) {
    return (x.sec.compareDocumentPosition(y.sec) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });

  if (marks.length) {
    var pending = false;
    var readScroll = function () {
      pending = false;
      /* "Bölümün içindeyim" değil, "bu bölümü geçtim, sonrakine varmadım".
         İşler bölümü yalnızca kart destesini kapsıyor; altındaki dört proje
         bölümü hiçbir menü başlığının içinde değil. Kapsama baksaydık işaret
         sayfanın büyük kısmında sönük kalırdı; üstü çizgiyi geçmiş sonuncuyu
         seçmek aradaki boşlukları da doğru başlığa bağlar. */
      var mid = window.innerHeight / 2, on = null;
      marks.forEach(function (m) {
        if (m.sec.getBoundingClientRect().top <= mid) { on = m; }
      });
      marks.forEach(function (m) {
        if (m === on) { m.a.setAttribute('aria-current', 'true'); } else { m.a.removeAttribute('aria-current'); }
      });
    };
    window.addEventListener('scroll', function () {
      if (!pending) { pending = true; window.requestAnimationFrame(readScroll); }
    }, { passive: true });
    window.addEventListener('resize', readScroll);
    readScroll();
  }


  /* ---------- üst çubuk bağlantıları anında gider ----------
     scroll-behavior: smooth sayfa içi ipuçları için doğru, ama gezinme
     bağlantısı yirmi bin pikselden fazla yol alıyor: yumuşak kaydırma
     ziyaretçiyi bütün bölümlerin içinden geçiriyor ve saniyeler sürüyor.
     Gezinmede istenen şey varmak. */
  Array.prototype.forEach.call(doc.querySelectorAll('.top__nav a[href^="#"], .top__name[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      var target = doc.querySelector(a.getAttribute('href'));
      if (!target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) { return; }
      e.preventDefault();
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });

  /* ---------- işler ızgarası: tek iş, bölüme girişte levhaları oturtmak ----------
     Burada eskiden bir yelpaze vardı: sürükleme, oklar, çentikler, klavye ve
     öne tıklama — dört iş için beş ayrı gezinme yolu. Izgara duruyor, o yüzden
     JavaScript'in tek işi kaldı. JS yoksa levhalar zaten açık: opaklık kuralı
     ".no-js .card" tarafından yeniliyor. */
  var worksSection = doc.querySelector('.works');
  if (worksSection) {
    var revealWorks = function () { worksSection.classList.add('is-in'); };
    if ('IntersectionObserver' in window) {
      var worksIo = new IntersectionObserver(function (entries, obs) {
        if (!entries[0].isIntersecting) { return; }
        revealWorks();
        obs.disconnect();
      }, { threshold: 0.12 });
      worksIo.observe(worksSection);
      /* Gözlemci hiç tetiklenmezse (sıfır boyutlu görünüm alanı, gizli sekme)
         levhalar görünmez kalmasın: emniyet supabı. */
      window.setTimeout(revealWorks, 4000);
    } else {
      revealWorks();
    }
  }

  /* ---------- gerçek ürün görüntüleri ----------
     Ayrıntı sayfasında küçük kare yalnızca büyük sahneyi seçer. Büyük sahne
     ve ana sayfadaki levha penceresi ise aynı tam ekran görüntüleyiciyi açar.
     JS yoksa ayrıntı sayfasındaki bağlantılar doğrudan WebP dosyasına gider. */
  Array.prototype.forEach.call(doc.querySelectorAll('.gallery'), function (gallery) {
    var stage = gallery.querySelector('.gallery__stage');
    var stageImage = stage && stage.querySelector('img');
    var items = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-item]'));
    var title = gallery.querySelector('[data-gallery-title]:not([data-gallery-item])');
    var caption = gallery.querySelector('[data-gallery-caption]:not([data-gallery-item])');
    var current = gallery.querySelector('[data-gallery-current]');
    if (!stage || !stageImage || !items.length) { return; }

    function select(index) {
      var item = items[index];
      if (!item) { return; }
      var next = new Image();
      stage.classList.add('is-changing');
      next.onload = function () {
        stageImage.src = item.href;
        stageImage.width = +(item.getAttribute('data-gallery-width') || next.naturalWidth);
        stageImage.height = +(item.getAttribute('data-gallery-height') || next.naturalHeight);
        stageImage.alt = item.getAttribute('data-gallery-caption') || '';
        stage.href = item.href;
        stage.setAttribute('data-gallery-index', index);
        if (title) { title.textContent = item.getAttribute('data-gallery-title') || ''; }
        if (caption) { caption.textContent = item.getAttribute('data-gallery-caption') || ''; }
        if (current) { current.textContent = ('0' + (index + 1)).slice(-2); }
        items.forEach(function (thumb, i) {
          if (i === index) { thumb.setAttribute('aria-current', 'true'); }
          else { thumb.removeAttribute('aria-current'); }
        });
        stage.classList.remove('is-changing');
      };
      next.onerror = function () { stage.classList.remove('is-changing'); };
      next.src = item.href;
    }

    items.forEach(function (item, index) {
      item.addEventListener('click', function (e) { e.preventDefault(); select(index); });
    });
  });

  var openers = doc.querySelectorAll('[data-gallery-open]');
  if (openers.length && typeof HTMLDialogElement !== 'undefined') {
    var dialog = doc.createElement('dialog');
    dialog.className = 'media-lightbox';
    dialog.setAttribute('aria-label', 'Proje ekran görüntüsü');
    dialog.innerHTML =
      '<div class="media-lightbox__top">' +
        '<p class="media-lightbox__count" aria-live="polite"></p>' +
        '<button class="media-lightbox__close" type="button" aria-label="Tam ekran görüntüyü kapat"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg></button>' +
      '</div>' +
      '<figure class="media-lightbox__figure">' +
        '<button class="media-lightbox__nav media-lightbox__prev" type="button" aria-label="Önceki görüntü"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5"/></svg></button>' +
        '<img class="media-lightbox__image" alt="">' +
        '<button class="media-lightbox__nav media-lightbox__next" type="button" aria-label="Sonraki görüntü"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>' +
      '</figure>' +
      '<p class="media-lightbox__caption"><b></b><span></span></p>';
    doc.body.appendChild(dialog);

    var lightImage = dialog.querySelector('.media-lightbox__image');
    var lightCount = dialog.querySelector('.media-lightbox__count');
    var lightTitle = dialog.querySelector('.media-lightbox__caption b');
    var lightCaption = dialog.querySelector('.media-lightbox__caption span');
    var prev = dialog.querySelector('.media-lightbox__prev');
    var next = dialog.querySelector('.media-lightbox__next');
    var close = dialog.querySelector('.media-lightbox__close');
    var groupItems = [], lightIndex = 0, opener = null;

    function galleryItems(group) {
      return Array.prototype.slice.call(doc.querySelectorAll('[data-gallery-item][data-gallery="' + group + '"]'));
    }
    function show(index) {
      if (!groupItems.length) { return; }
      lightIndex = ((index % groupItems.length) + groupItems.length) % groupItems.length;
      var item = groupItems[lightIndex];
      lightImage.src = item.href;
      lightImage.width = +(item.getAttribute('data-gallery-width') || 1600);
      lightImage.height = +(item.getAttribute('data-gallery-height') || 1000);
      lightImage.alt = item.getAttribute('data-gallery-caption') || '';
      lightTitle.textContent = item.getAttribute('data-gallery-title') || '';
      lightCaption.textContent = item.getAttribute('data-gallery-caption') || '';
      lightCount.textContent = ('0' + (lightIndex + 1)).slice(-2) + ' / ' + ('0' + groupItems.length).slice(-2);
      prev.hidden = next.hidden = groupItems.length < 2;
    }
    function open(trigger) {
      var group = trigger.getAttribute('data-gallery');
      groupItems = galleryItems(group);
      if (!groupItems.length) { return; }
      opener = trigger;
      show(+(trigger.getAttribute('data-gallery-index') || 0));
      dialog.showModal();
    }

    Array.prototype.forEach.call(openers, function (trigger) {
      trigger.addEventListener('click', function (e) { e.preventDefault(); open(trigger); });
    });
    prev.addEventListener('click', function () { show(lightIndex - 1); });
    next.addEventListener('click', function () { show(lightIndex + 1); });
    close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) { dialog.close(); } });
    dialog.addEventListener('close', function () { lightImage.removeAttribute('src'); if (opener) { opener.focus(); } });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(lightIndex - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(lightIndex + 1); }
    });

    var touchX = null;
    dialog.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) { touchX = e.touches[0].clientX; }
    }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
      if (touchX === null || !e.changedTouches.length) { return; }
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 48) { show(lightIndex + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
  }

  /* ---------- akan sinyal: kurulum ----------
     Bağlantı yolları çizimde zaten var; bu dosya geometriyi yazmıyor, okuyor.
     Her yol alt yollarına ayrılır, üstüne ince bir kopya serilir ve kopyada tek
     bir kısa çizgi baştan uca kayar. Ok uçları ve merdiven basamakları eşiğin
     altında kalıp elenir; sınır çizgileri (.bd) ve reddedilen yol (.rf) zaten
     bağlantı değildir. Çizim yeniden üretildiğinde burada değişecek sayı yok. */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var NOT_EDGE = '.bd, .rf-g';   /* sınır ve reddedilen yol: üstünden sinyal geçmez */
  var FLOW_MIN = 26;             /* çizim birimi: bundan kısa alt yol bağlantı değil */
  var FLOW_DASH = 15;            /* sinyalin boyu; yolun uzunluğundan bağımsız sabit */
  var FLOW_SPEED = 78;           /* birim/saniye — bütün çizimlerde aynı tempo */
  var FLOW_DUTY = .62;           /* döngünün yolculuğa ayrılan kısmı; gerisi dinlenme */
  var FLOW_PAD = 10;             /* birimin kenarına bu kadar yakın uç "değiyor" sayılır */

  function buildFlows(root, out) {
    var svg = root.ownerSVGElement;
    if (!svg || !svg.viewBox) { return; }
    var vbH = svg.viewBox.baseVal.height || 700;
    var layer = doc.createElementNS(SVG_NS, 'g');
    layer.setAttribute('class', 'flows');
    root.appendChild(layer);
    Array.prototype.forEach.call(root.querySelectorAll('path.k'), function (p) {
      if (p.classList.contains('rf')) { return; }
      if (p.closest && p.closest(NOT_EDGE)) { return; }
      (p.getAttribute('d') || '').split(/(?=[Mm])/).forEach(function (sub) {
        sub = sub.trim();
        if (!sub) { return; }
        var f = doc.createElementNS(SVG_NS, 'path');
        f.setAttribute('class', 'flow');
        f.setAttribute('d', sub);
        f.setAttribute('pathLength', '1');
        layer.appendChild(f);
        var len = f.getTotalLength();
        if (!len || len < FLOW_MIN) { layer.removeChild(f); return; }
        /* Desenin periyodu yoldan uzun: sinyal ucu geçince kaybolur, başa sarmaz. */
        f.setAttribute('stroke-dasharray', (FLOW_DASH / len).toFixed(4) + ' 2');
        f.style.animationDuration = (len / FLOW_SPEED / FLOW_DUTY).toFixed(2) + 's';
        var a = f.getPointAtLength(0), b = f.getPointAtLength(len);
        /* Aşağıdaki sinyal biraz geç başlar: akış yukarıdan aşağı okunuyor. */
        f.style.animationDelay = (Math.min(a.y, b.y) / vbH * .6).toFixed(2) + 's';
        out.push({ el: f, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } });
      });
    });
  }

  /* ---------- sahneler: hangi adımda hangi birimler aydınlanır ----------
     lit   : tam parlaklık, sinyal rengi
     faint : neredeyse görünmez (sessiz sahnelerde bağlam)
     open  : çözülmemiş parça; kesikli çizgi
     Seçiciler çizimdeki data-n (düğüm numarası) ve mevcut sınıflara gider. */
  var SCENES = {
    'ai-digest': {
      intro:     { lit: '', focus: '[data-n="08"]' },
      problem:   { lit: '[data-n="01"]', focus: '[data-n="01"]' },
      pipeline:  { lit: '[data-n="01"], [data-n="02"], [data-n="03"], [data-n="04"], [data-n="05"], [data-n="06"], [data-n="07"], [data-n="08"], [data-n="09"]', focus: '[data-n="03"], [data-n="04"]' },
      button:    { lit: '[data-n="09"], [data-n="10"], .bd, .s5.s2', faint: '[data-n="03"], [data-n="04"], [data-n="08"]', focus: '[data-n="09"], [data-n="10"]' },
      evidence:  { lit: '.s5, [data-n="01"], [data-n="07"], [data-n="11"]', focus: '[data-n="11"]' }
    },
    'second-brain-os': {
      readers:   { lit: '[data-n="01"], [data-n="02"]', focus: '[data-n="01"], [data-n="02"]' },
      files:     { lit: '.bd.s2, [data-n="03"], [data-n="04"], [data-n="05"], [data-n="06"], [data-n="08"], [data-n="09"], [data-n="10"], .cap-g, .s5.s2, .s4.s6', focus: '[data-n="03"], [data-n="04"]' },
      split:     { lit: '.bd.s5, [data-n="14"], [data-n="15"], [data-n="11"], [data-n="12"], [data-n="13"], .node.s4:not([data-n])', focus: '[data-n="14"], [data-n="15"]' },
      evidence:  { lit: '[data-n="16"], [data-n="18"], .s5.s2, [data-n="08"], [data-n="14"], [data-n="15"]', focus: '[data-n="16"]' }
    },
    'techinves': {
      idea:      { lit: '.bd.s2, [data-n="07"], .rf-g', focus: '[data-n="07"]' },
      score:     { lit: '[data-n="01"], [data-n="02"], [data-n="03"], [data-n="04"], [data-n="05"], [data-n="06"], .s3.s5, .s6:not(.s5):not(.node)', focus: '[data-n="03"], [data-n="05"]' },
      report:    { lit: '[data-n="08"], [data-n="09"], [data-n="10"], .s4:not(.node)', focus: '[data-n="08"], [data-n="09"]' },
      verify:    { lit: '[data-n="11"], [data-n="12"], .s4:not(.node)', faint: '[data-n="01"], [data-n="03"], [data-n="04"], [data-n="05"], [data-n="06"]', focus: '[data-n="11"], [data-n="12"]' },
      evidence:  { lit: '[data-n="01"], [data-n="02"], [data-n="06"], .s5.s6', faint: '[data-n="03"], [data-n="04"], [data-n="05"]', focus: '[data-n="01"], [data-n="02"]' }
    },
    'terminal-organizer': {
      promise:   { lit: '[data-n="02"], .rf-g', focus: '[data-n="02"]' },
      why:       { lit: '[data-n="01"], [data-n="02"], [data-n="03"], .rf-g, .bd, [data-n="05"], [data-n="06"], [data-n="04"], [data-n="07"]', focus: '[data-n="05"], [data-n="06"]' },
      evidence:  { lit: '[data-n="07"], [data-n="08"], [data-n="09"], .rf-g', faint: '[data-n="01"], [data-n="03"], [data-n="04"]', focus: '[data-n="08"], [data-n="09"]' }
    }
  };
  /* ---------- derin bağlantı: #bolum:adim bir adımın ortasına götürür ----------
     Kaydırma iki kez yapılıyor ve bu bilerek. İlki hemen: sayfa doğru yerde
     açılsın. İkincisi yazı tipleri ve görseller yerleştikten sonra (load),
     çünkü o sırada üstteki bölümlerin yüksekliği değişiyor ve ilk kaydırma
     hedefin yanına düşüyor — ölçüldüğünde `#second-brain-os:files` bir önceki
     adımda açılıyordu. Etkin adımı seçen mantık görüş alanının ortasına baktığı
     için yanlış konum yanlış sahne demek. */
  var deepLink = /^#([a-z0-9-]+):([a-z]+)$/.exec(location.hash || '');
  var deepTarget = deepLink
    ? doc.querySelector('#' + deepLink[1] + ' .step[data-step="' + deepLink[2] + '"]')
    : null;

  function goDeep() {
    if (!deepTarget) { return; }
    deepTarget.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  if (deepTarget) {
    /* Tarayıcı geri dönüldüğünde eski kaydırma konumunu geri yüklüyor ve bunu
       yükleme bittikten sonra yapıyor: derin bağlantının kendi kaydırması
       üzerine yazılıyordu. Hedef belliyken geri yükleme kapatılıyor. */
    try { history.scrollRestoration = 'manual'; } catch (err) { /* desteklemeyen tarayıcı */ }
  }
  goDeep();

  /* ---------- bölüm kurulumu ---------- */
  var chapters = doc.querySelectorAll('.chapter');
  if (!chapters.length || !('IntersectionObserver' in window)) { return; }

  Array.prototype.forEach.call(chapters, function (ch) {
    var scenes = SCENES[ch.id] || {};
    var svg = ch.querySelector('.drawing svg');
    var root = svg && svg.querySelector('g[id]');
    var units = [];
    if (root) {
      Array.prototype.forEach.call(root.children, function (el) {
        if (el.tagName.toLowerCase() !== 'g') { return; }
        el.classList.add('g-unit');
        var num = el.querySelector('.num');
        if (num && !el.hasAttribute('data-n')) { el.setAttribute('data-n', num.textContent.trim()); }
        units.push(el);
      });
    }

    /* Sinyal katmanı birimler toplandıktan sonra kuruluyor: kendisi bir birim
       değil, bu yüzden sahnelerin karartmasına da girmiyor. */
    var flows = [];
    if (root) { buildFlows(root, flows); }

    /* Bir birimin mürekkebi: yalnızca şekilleri. Etiket metni sağa doğru uzuyor;
       kutuya katılsaydı alakasız bağlantılar da "değmiş" sayılırdı. */
    function shapeBox(u) {
      if (u.flowBox !== undefined) { return u.flowBox; }
      var box = null;
      Array.prototype.forEach.call(u.querySelectorAll('circle, rect, path, line, polyline'), function (sh) {
        var b;
        try { b = sh.getBBox(); } catch (err) { return; }
        if (!b || (!b.width && !b.height)) { return; }
        if (!box) { box = { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height }; return; }
        box.x1 = Math.min(box.x1, b.x); box.y1 = Math.min(box.y1, b.y);
        box.x2 = Math.max(box.x2, b.x + b.width); box.y2 = Math.max(box.y2, b.y + b.height);
      });
      u.flowBox = box;
      return box;
    }
    function touches(box, p) {
      return p.x >= box.x1 - FLOW_PAD && p.x <= box.x2 + FLOW_PAD &&
             p.y >= box.y1 - FLOW_PAD && p.y <= box.y2 + FLOW_PAD;
    }
    /* Bir bağlantı, ucu aydınlanan bir birime değiyorsa akar. Sahne tablosunda
       ayrıca yol listesi tutulmuyor: hangi düğümün yandığı zaten yazılı. */
    function paintFlows() {
      if (!flows.length) { return; }
      var boxes = [];
      units.forEach(function (u) {
        if (!u.classList.contains('lit') || (u.matches && u.matches(NOT_EDGE))) { return; }
        var b = shapeBox(u);
        if (b) { boxes.push(b); }
      });
      var running = 0;
      flows.forEach(function (f) {
        var on = boxes.some(function (b) { return touches(b, f.a) || touches(b, f.b); });
        f.el.classList.toggle('is-on', on);
        if (on) { running += 1; }
      });
      /* Bütün makinenin birden aktığı sahneler var (summarize, why). Orada sinyal
         sayısı değil, ağırlığı düşüyor: aynı anlatı, daha sakin bir çizim. */
      ch.classList.toggle('flows-busy', running > 6);
    }

    var steps = ch.querySelectorAll('.step');
    var current = null;

    function paint(id) {
      if (!root) { return; }
      var sc = scenes[id] || {};
      /* Dar ekranda kadraj adımın odağına kırpılıyor; aydınlanan kümenin de
         o odak olması gerekiyor, yoksa kırpımın dışında kalan birimler
         yanıyor gibi görünürdü. */
      var tight = narrow.matches && !reduce.matches && sc.focus;
      units.forEach(function (u) { u.classList.remove('lit', 'faint', 'open'); });
      ['lit', 'faint', 'open'].forEach(function (kind) {
        var sel = (kind === 'lit' && tight) ? sc.focus : sc[kind];
        if (!sel) { return; }
        var found = root.querySelectorAll(sel);
        Array.prototype.forEach.call(found, function (el) {
          /* seçici bir birimin çocuğunu bulduysa birime çık */
          var unit = el.closest('.g-unit');
          if (unit) { unit.classList.add(kind); }
        });
      });
      paintFlows();
    }

    /* ---------- dar ekran: çizim adımın bölgesine kırpılır ----------
       Geniş ekranda çizim bütün olarak duruyor ve aydınlanma odağı kuruyor.
       390px'de aynı çizim ya okunmaz kadar küçük ya da yatay kaydırmalı bir
       kutu oluyor; ikisi de sahneyi öldürüyor. Bu yüzden telefonda kadraj
       değişiyor: her adımda o adımın yaktığı birimlerin çevrelediği dikdörtgen
       hesaplanıp viewBox oraya çekiliyor. Dikdörtgen elle yazılmıyor, çizimden
       okunuyor — çizim değişince kırpım kendiliğinden doğru kalıyor. */
    var baseBox = null;
    if (svg) {
      var vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
      if (vb.length === 4 && vb.every(function (n) { return !isNaN(n); })) { baseBox = vb; }
    }

    function setBox(box) {
      if (!svg || !baseBox) { return; }
      svg.setAttribute('viewBox', box.map(function (n) { return Math.round(n * 10) / 10; }).join(' '));
    }

    /* Yanan birimlerin kapladığı alan. Tek düğüm yanıyorsa kadraj aşırı
       yakınlaşmasın diye bir taban genişlik var; kadraj çizimin dışına da
       taşmıyor, yoksa kenarda boş alan kalırdı. */
    function cropFor(id) {
      if (!root || !baseBox) { return null; }
      var lit = root.querySelectorAll('.g-unit.lit');
      if (!lit.length) { return baseBox.slice(); }
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      Array.prototype.forEach.call(lit, function (u) {
        var b;
        try { b = u.getBBox(); } catch (err) { return; }
        if (!b || (!b.width && !b.height)) { return; }
        x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
      });
      if (!isFinite(x1)) { return baseBox.slice(); }

      var pad = 18;
      x1 -= pad; y1 -= pad; x2 += pad; y2 += pad;

      /* En küçük kadraj: etiketler 13px ve tuval ~200-300px yüksekliğinde;
         bundan dar bir kadrajda yazı devleşip kutuyu taşırıyor. */
      var minW = 300, minH = 150;
      var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      var w = Math.max(x2 - x1, minW), h = Math.max(y2 - y1, minH);
      x1 = cx - w / 2; y1 = cy - h / 2;

      /* Çizimin sınırlarına sığdır. */
      w = Math.min(w, baseBox[2]); h = Math.min(h, baseBox[3]);
      x1 = Math.max(baseBox[0], Math.min(x1, baseBox[0] + baseBox[2] - w));
      y1 = Math.max(baseBox[1], Math.min(y1, baseBox[1] + baseBox[3] - h));
      return [x1, y1, w, h];
    }

    /* Kadrajın kenarına denk gelen etiketler yarım kelime olarak kalıyordu —
       "kurtulur" yerine "rtulur". Ölçüldüğünde kesilenlerin tamamı sönük
       bağlam yazısı; on dokuz sahnenin hiçbirinde yanan bir etiket kadrajı
       aşmıyor. O yüzden yarısı dışarıda kalan yazıyı göstermek yerine
       gizliyoruz: anlatılan şey eksiksiz duruyor, bağlam ise ya tam görünüyor
       ya da hiç. */
    function hideCut(box) {
      if (!root) { return; }
      var texts = root.querySelectorAll('text');
      Array.prototype.forEach.call(texts, function (t) {
        if (!box) { t.classList.remove('is-cut'); return; }
        var b;
        try { b = t.getBBox(); } catch (err) { return; }
        if (!b || !b.width) { return; }
        var out = b.x < box[0] - 0.5 ||
                  b.x + b.width > box[0] + box[2] + 0.5 ||
                  b.y < box[1] - 0.5 ||
                  b.y + b.height > box[1] + box[3] + 0.5;
        t.classList.toggle('is-cut', out);
      });
    }

    function frame(id) {
      if (!svg || !baseBox) { return; }
      if (!narrow.matches || reduce.matches) { setBox(baseBox); hideCut(null); return; }
      var box = cropFor(id);
      if (box) { setBox(box); hideCut(box); }
    }

    function activate(step) {
      if (step === current) { return; }
      current = step;
      var id = step.getAttribute('data-step');
      ch.setAttribute('data-step', id);
      Array.prototype.forEach.call(steps, function (s) { s.classList.toggle('is-active', s === step); });
      paint(id);
      frame(id);
      if (ch.classList.contains('chapter--digest')) { gather(ch, id); }
    }

    /* Ekran genişliği eşiği aşarsa kadraj yeniden kurulur: dar ekrandan geniş
       ekrana geçildiğinde çizim kırpık kalmasın. */
    narrow.addEventListener && narrow.addEventListener('change', function () {
      if (current) { frame(current.getAttribute('data-step')); }
    });

    ch.classList.add('is-js');

    /* Görüş alanının ortasından geçen adım etkin sayılır. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { activate(e.target); } });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    Array.prototype.forEach.call(steps, function (s) { io.observe(s); });

    /* Sayfa bir adımın ortasında yüklendiyse (geri tuşu, hash) bekleme: ilk adımı boya. */
    if (steps.length) {
      var mid = window.innerHeight / 2, pick = steps[0];
      Array.prototype.forEach.call(steps, function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) { pick = s; }
      });
      activate(pick);
    }

    /* Derin bağlantı bu bölümü hedefliyorsa, düzen oturduktan sonra konumu ve
       etkin adımı bir kez tazele. */
    if (deepTarget && ch.contains(deepTarget)) {
      var settle = function () {
        goDeep();
        activate(deepTarget);
      };
      window.addEventListener('load', settle);
      window.setTimeout(settle, 400);
    }
  });

  /* ---------- AI Digest: dağınık kaynak noktaları çizimin tepesine toplanır ---------- */
  function gather(ch, id) {
    if (narrow.matches || reduce.matches) { return; }
    var field = ch.querySelector('.field');
    var target = ch.querySelector('.drawing [data-n="01"] circle');
    if (!field || !target) { return; }
    if (id !== 'pipeline' && id !== 'problem') { return; }
    var fr = field.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    var tx = tr.left + tr.width / 2 - fr.left;
    var ty = tr.top + tr.height / 2 - fr.top;
    Array.prototype.forEach.call(field.querySelectorAll('i'), function (dot) {
      var x = dot.offsetLeft, y = dot.offsetTop;
      dot.style.setProperty('--dx', (tx - x) + 'px');
      dot.style.setProperty('--dy', (ty - y) + 'px');
    });
  }
})();
