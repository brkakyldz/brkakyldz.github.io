/* =========================================================
   Portföy — arayüz davranışları
   Bağımlılık yok, tek dosya.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- sticky başlıkta kaydırma çizgisi ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- görünüme girince yumuşak beliriş ---------- */
  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length) {
    if (!('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry, i) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          window.setTimeout(function () { el.classList.add('is-visible'); }, i * 60);
          revealObserver.unobserve(el);
        });
      }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });

      revealables.forEach(function (el) { revealObserver.observe(el); });

      // güvenlik ağı: gözlemci herhangi bir nedenle tetiklenmezse içerik gizli kalmasın
      window.setTimeout(function () {
        revealables.forEach(function (el) { el.classList.add('is-visible'); });
      }, 2500);
    }
  }

  /* ---------- aktif bölüm takibi (scrollspy) ---------- */
  var spyLinks = document.querySelectorAll('[data-spy] a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var linkFor = {};
    var targets = [];

    spyLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      linkFor[id] = link;
      targets.push(section);
    });

    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = linkFor[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(linkFor).forEach(function (key) {
            linkFor[key].removeAttribute('aria-current');
          });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    targets.forEach(function (section) { spyObserver.observe(section); });
  }

  /* ---------- ekran görüntüsü büyüteci (lightbox) ---------- */
  var gallery = document.querySelector('[data-gallery]');
  var dialog = document.getElementById('lightbox');
  if (!gallery || !dialog || typeof dialog.showModal !== 'function') return;

  var shots = Array.prototype.slice.call(gallery.querySelectorAll('[data-shot]'));
  if (!shots.length) return;

  var imgEl = dialog.querySelector('[data-lightbox-img]');
  var capEl = dialog.querySelector('[data-lightbox-caption]');
  var counterEl = dialog.querySelector('[data-lightbox-counter]');
  var prevBtn = dialog.querySelector('[data-lightbox-prev]');
  var nextBtn = dialog.querySelector('[data-lightbox-next]');
  var closeBtn = dialog.querySelector('[data-lightbox-close]');
  var index = 0;
  var lastTrigger = null;

  function render(i) {
    index = (i + shots.length) % shots.length;
    var source = shots[index].querySelector('img');
    imgEl.src = source.getAttribute('src');
    imgEl.alt = source.getAttribute('alt') || '';
    capEl.textContent = shots[index].getAttribute('data-caption') || '';
    counterEl.textContent = (index + 1) + ' / ' + shots.length;
    var single = shots.length < 2;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
  }

  shots.forEach(function (shot, i) {
    var trigger = shot.querySelector('button');
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      lastTrigger = trigger;
      render(i);
      dialog.showModal();
    });
  });

  prevBtn.addEventListener('click', function () { render(index - 1); });
  nextBtn.addEventListener('click', function () { render(index + 1); });
  closeBtn.addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); render(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); render(index + 1); }
  });

  // arka plana tıklayınca kapat
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', function () {
    imgEl.removeAttribute('src');
    if (lastTrigger) lastTrigger.focus();
  });
})();
