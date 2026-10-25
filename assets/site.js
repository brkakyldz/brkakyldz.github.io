/* Berke Akyıldız — portfolio. Small things that move; nothing here is needed to read the page. */
(() => {
  const root = document.documentElement;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------ language --
     Every page carries both languages (data-l="en" / "tr"); <html data-lang> picks one.
     The choice is kept in localStorage; ?lang=tr in a link opens Turkish. */
  const T = {
    en: {
      play: "Play",
      pause: "Pause",
      prev: "Previous",
      next: "Next",
      prevStep: "Previous step",
      nextStep: "Next step",
      close: "Close",
      scenarios: "Scenarios",
      image: "Image",
      shots: "Screens",
    },
    tr: {
      play: "Oynat",
      pause: "Durdur",
      prev: "Önceki",
      next: "Sonraki",
      prevStep: "Önceki adım",
      nextStep: "Sonraki adım",
      close: "Kapat",
      scenarios: "Senaryolar",
      image: "Görüntü",
      shots: "Görüntüler",
    },
  };
  const lang = () => (root.dataset.lang === "tr" ? "tr" : "en");
  const t = (k) => T[lang()][k];
  const inLang = (el) => (el && (el.querySelector(`[data-l="${lang()}"]`) || el)) || null;
  const words = (s) => (s || "").split(/\s+/).filter(Boolean);
  const titles = { en: document.title, tr: root.dataset.titleTr || document.title };

  const syncAttrs = () => {
    const l = lang();
    root.lang = l;
    document.title = titles[l];
    document.querySelectorAll("[data-en-label]").forEach((el) => el.setAttribute("aria-label", el.dataset[`${l}Label`]));
    document.querySelectorAll("[data-en-alt]").forEach((el) => (el.alt = el.dataset[`${l}Alt`]));
  };
  const setLang = (l) => {
    root.dataset.lang = l;
    try {
      localStorage.setItem("lang", l);
    } catch (e) {}
    syncAttrs();
    document.dispatchEvent(new CustomEvent("langchange"));
  };
  const onLang = (fn) => document.addEventListener("langchange", fn);

  // Each pair shares one box (.lp), as large as the longer of the two, so a switch never
  // moves the page. A pair that is all its parent holds becomes a block and fills the line.
  document.querySelectorAll('[data-l="en"]').forEach((en) => {
    const tr = en.nextElementSibling;
    if (!(en instanceof HTMLElement) || !tr || tr.dataset.l !== "tr") return;
    const parent = en.parentNode;
    const box = document.createElement("span");
    box.className = "lp";
    const alone = [...parent.childNodes].every((n) => n === en || n === tr || (n.nodeType === 3 && !n.textContent.trim()));
    if (alone && getComputedStyle(parent).display !== "inline") box.classList.add("block");
    parent.insertBefore(box, en);
    box.append(en, tr);
    // A trailing arrow rides with each text, so it never floats after the reserved space.
    const go = box.nextElementSibling;
    if (go?.classList.contains("go") && !go.nextSibling) {
      en.append(go.cloneNode(true));
      tr.append(go);
    }
  });
  document.querySelectorAll(".lang").forEach((b) => b.addEventListener("click", () => setLang(lang() === "en" ? "tr" : "en")));
  syncAttrs();

  /* A clock that only runs while its element is on screen and the tab is in front. */
  const ticker = (el, threshold = 0.25, onShow) => {
    let visible = false;
    let paused = false;
    let clock = 0;
    let last = 0;
    let raf = 0;
    const waits = new Set();
    const running = () => visible && !paused && !document.hidden;
    const frame = (now) => {
      raf = 0;
      if (!running() || !waits.size) return void (last = 0);
      clock += last ? Math.min(now - last, 50) : 0;
      last = now;
      for (const w of [...waits]) {
        const p = Math.min(1, (clock - w.t0) / w.ms);
        w.tick?.(p);
        if (p >= 1) {
          waits.delete(w);
          w.done();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && running() && waits.size) raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        onShow?.(visible);
        kick();
      },
      { threshold }
    ).observe(el);
    document.addEventListener("visibilitychange", kick);
    return {
      wait: (ms, tick) =>
        new Promise((done) => {
          waits.add({ t0: clock, ms, tick, done });
          kick();
        }),
      setPaused: (v) => {
        paused = v;
        kick();
      },
      get paused() {
        return paused;
      },
    };
  };

  /* Section rules draw themselves and blocks settle in as they are reached. */
  const reveal = document.querySelectorAll(".sec-head, .reveal");
  if (!still && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add("is-in"));
  }

  /* ------------------------------------------------------------- screens --
     A recording plays muted while on screen and stops off it. Its small button stops it
     for good (and starts it again); under reduced motion nothing starts on its own. */
  const players = [];
  const control = (screen, player) => {
    const btn = screen.querySelector(".screen-ctl");
    const name = btn?.querySelector("span");
    let held = still;
    const show = () => {
      screen.classList.toggle("is-paused", player.paused);
      if (name) name.textContent = player.paused ? t("play") : t("pause");
    };
    btn?.addEventListener("click", () => {
      held = !player.paused;
      held ? player.pause() : player.play();
    });
    player.onchange = show;
    onLang(show);
    show();
    new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) player.pause();
        else if (!held) player.play();
      },
      { threshold: 0.35 }
    ).observe(screen);
    players.push(player);
  };

  document.querySelectorAll(".screen video").forEach((v) => {
    const screen = v.closest(".screen");
    const bar = screen.querySelector(".screen-time");
    let raf = 0;
    const draw = () => {
      if (bar && v.duration) bar.style.setProperty("--t", (v.currentTime / v.duration).toFixed(4));
      raf = v.paused ? 0 : requestAnimationFrame(draw);
    };
    const player = {
      get paused() {
        return v.paused;
      },
      play: () => v.play().catch(() => {}),
      pause: () => v.pause(),
    };
    v.addEventListener("play", () => {
      player.onchange?.();
      if (!raf) raf = requestAnimationFrame(draw);
    });
    v.addEventListener("pause", () => player.onchange?.());
    control(screen, player);
  });

  /* A terminal session typed out line by line; it loops while on screen. */
  document.querySelectorAll(".term").forEach((term) => {
    const lines = [...term.querySelectorAll("li")];
    const screen = term.closest(".screen");
    if (still || !lines.length) {
      screen?.querySelector(".screen-ctl")?.remove();
      return;
    }
    const texts = lines.map((li) => li.textContent);
    const clock = ticker(term, 0.3);
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.setAttribute("aria-hidden", "true");
    const player = {
      get paused() {
        return clock.paused;
      },
      play() {
        clock.setPaused(false);
        player.onchange?.();
      },
      pause() {
        clock.setPaused(true);
        player.onchange?.();
      },
    };
    const run = async () => {
      for (;;) {
        lines.forEach((li) => li.classList.add("is-hidden"));
        await clock.wait(700);
        for (let i = 0; i < lines.length; i++) {
          const li = lines[i];
          const typed = li.classList.contains("t-cmd") || li.classList.contains("t-ask");
          li.classList.remove("is-hidden");
          if (typed) {
            li.textContent = "";
            li.append(caret);
            await clock.wait(380);
            const s = texts[i];
            await clock.wait(s.length * 34, (p) => {
              li.textContent = s.slice(0, Math.round(s.length * p));
              li.append(caret);
            });
            await clock.wait(420);
            caret.remove();
          } else {
            await clock.wait(li.classList.contains("t-say") ? 900 : 420);
          }
        }
        term.querySelector("li:last-child")?.append(caret);
        await clock.wait(5200);
        caret.remove();
      }
    };
    if (screen) control(screen, player);
    run();
  });

  /* ------------------------------------------------------------- galleries --
     One slide large, the rest as a strip of thumbnails; a still opens full size. */
  const viewer = (() => {
    if (!("HTMLDialogElement" in window)) return null;
    const d = document.createElement("dialog");
    d.className = "viewer";
    d.innerHTML = `
      <div class="viewer-bar">
        <span class="viewer-count" aria-live="polite"></span>
        <span class="viewer-nav">
          <button type="button" data-step="-1">←</button>
          <button type="button" data-step="1">→</button>
        </span>
        <button type="button" data-close></button>
      </div>
      <div class="viewer-stage"></div>
      <p class="viewer-caption"></p>`;
    document.body.append(d);
    const stage = d.querySelector(".viewer-stage");
    const count = d.querySelector(".viewer-count");
    const caption = d.querySelector(".viewer-caption");
    const nav = d.querySelector(".viewer-nav");
    const [prev, next] = nav.querySelectorAll("button");
    const close = d.querySelector("[data-close]");
    let items = [];
    let at = 0;
    const labels = () => {
      d.setAttribute("aria-label", t("image"));
      prev.setAttribute("aria-label", t("prev"));
      next.setAttribute("aria-label", t("next"));
      close.textContent = t("close");
    };
    const show = (i) => {
      at = (i + items.length) % items.length;
      const a = items[at];
      const img = document.createElement("img");
      img.src = a.getAttribute("href");
      img.alt = a.querySelector("img")?.alt || "";
      stage.replaceChildren(img);
      caption.innerHTML = a.closest(".slide")?.querySelector("figcaption")?.innerHTML || "";
      count.textContent = items.length > 1 ? `${at + 1} / ${items.length}` : "";
      nav.hidden = items.length < 2;
    };
    d.addEventListener("click", (e) => {
      const step = e.target.closest("[data-step]");
      if (step) return show(at + Number(step.dataset.step));
      if (e.target.closest("[data-close]") || e.target === stage || e.target === d) d.close();
    });
    d.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") show(at + 1);
      if (e.key === "ArrowLeft") show(at - 1);
    });
    let x0 = null;
    stage.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 === null || items.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    d.addEventListener("close", () => stage.replaceChildren());
    labels();
    onLang(labels);
    return {
      open(list, i) {
        items = list;
        show(i);
        d.showModal();
      },
    };
  })();

  document.querySelectorAll(".gallery").forEach((g) => {
    const slides = [...g.querySelectorAll(".slide")];
    const stills = [...g.querySelectorAll(".slide a.frame")];
    stills.forEach((a, i) =>
      a.addEventListener("click", (e) => {
        if (!viewer || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        viewer.open(stills, i);
      })
    );
    if (!slides.length) return;
    slides[0].classList.add("is-on");
    if (slides.length < 2) return;

    const strip = document.createElement("div");
    strip.className = "gallery-thumbs";
    strip.setAttribute("role", "group");
    const buttons = slides.map((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      if (s.querySelector("video")) b.dataset.kind = "video";
      const img = document.createElement("img");
      img.src = s.dataset.thumb;
      img.alt = "";
      img.loading = "lazy";
      b.append(img);
      b.addEventListener("click", () => show(i));
      strip.append(b);
      return b;
    });
    const label = () => {
      strip.setAttribute("aria-label", t("shots"));
      buttons.forEach((b, i) => b.setAttribute("aria-label", inLang(slides[i].querySelector("figcaption"))?.textContent.trim() || String(i + 1)));
    };
    const show = (i) => {
      slides.forEach((s, k) => {
        s.classList.toggle("is-on", k === i);
        if (k !== i) s.querySelector("video")?.pause();
      });
      buttons.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
    };
    g.append(strip);
    label();
    onLang(label);
    show(0);
  });

  /* ---------------------------------------------------------------- arch --
     How a system works: its drawing, with a few real scenarios played over it.
     One clock drives the dot, the lit parts and the caption, so they cannot drift;
     it stops when the drawing leaves the screen, the tab hides or the reader pauses. */
  document.querySelectorAll(".arch").forEach((fig) => {
    const svg = fig.querySelector(".arch-map");
    const panel = fig.querySelector(".arch-panel");
    const layer = svg?.querySelector(".arch-nodes");
    const scenes = [...fig.querySelectorAll(".arch-scene")];
    if (!svg || !panel || !layer || !scenes.length) return;

    const NS = "http://www.w3.org/2000/svg";
    const make = (tag, attrs = {}) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };

    // Parts of the system; each gets a halo for the moment something reaches it.
    const parts = new Map();
    svg.querySelectorAll("[data-node]").forEach((n) => {
      parts.set(n.dataset.node, n);
      const sub = n.querySelector(".sub");
      if (sub) sub.dataset.plain = sub.innerHTML;
      const dot = n.querySelector(".person");
      const boxes = [...n.querySelectorAll(".box")].map((b) => b.getBBox());
      let halo;
      if (dot) {
        halo = make("circle", { cx: dot.getAttribute("cx"), cy: dot.getAttribute("cy"), r: dot.getAttribute("r") });
        halo.dataset.grow = 2.6;
      } else if (boxes.length) {
        const x = Math.min(...boxes.map((b) => b.x));
        const y = Math.min(...boxes.map((b) => b.y));
        const w = Math.max(...boxes.map((b) => b.x + b.width)) - x;
        const h = Math.max(...boxes.map((b) => b.y + b.height)) - y;
        halo = make("rect", { x, y, width: w, height: h, rx: 4 });
        halo.dataset.grow = 1 + 16 / Math.max(w, h);
      }
      if (!halo) return;
      halo.setAttribute("class", "halo");
      n.prepend(halo);
    });

    // Connections, found by the two parts they join and walkable either way.
    const edges = [...svg.querySelectorAll("[data-edge]")].map((p) => {
      const [a, b] = words(p.dataset.edge);
      return { p, a, b, len: p.getTotalLength() };
    });
    const leg = (a, b) => {
      for (const e of edges) {
        if (e.a === a && e.b === b) return { ...e, to: b, rev: false };
        if (e.a === b && e.b === a) return { ...e, to: b, rev: true };
      }
      return null;
    };

    // Trails and dots run under the parts, so a request passes through what handles it.
    // A step can send several dots at once, one per branch of a fan-out.
    const trails = make("g", { class: "arch-trails" });
    const dots = make("g", { class: "arch-dots" });
    layer.before(trails, dots);
    const pks = [];
    const dot = (i) => {
      while (pks.length <= i) {
        const pk = make("g", { class: "pk" });
        pk.append(make("circle", { r: 10 }), make("circle", { r: 4.5 }));
        dots.append(pk);
        pks.push(pk);
      }
      return pks[i];
    };
    const marks = make("g", { class: "arch-marks" });
    svg.append(marks);

    // The panel: steps become buttons, scenario names become a row of choices, then controls.
    const lists = scenes.map((s) => [...s.querySelectorAll(".arch-steps > li")]);
    lists.forEach((lis) => lis.forEach((li, i) => (li.dataset.n = String(i + 1).padStart(2, "0"))));
    lists.flat().forEach((li) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "arch-step";
      b.append(...li.childNodes);
      li.append(b);
    });
    let tabs = [];
    let row = null;
    if (scenes.length > 1) {
      row = document.createElement("div");
      row.className = "arch-tabs";
      row.setAttribute("role", "group");
      tabs = scenes.map((s, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.innerHTML = s.querySelector(".arch-scene-name")?.innerHTML || String(i + 1);
        row.append(b);
        return b;
      });
      panel.prepend(row);
    }
    const bar = document.createElement("p");
    bar.className = "arch-controls";
    bar.innerHTML =
      '<button type="button" data-act="toggle"></button>' +
      '<button type="button" data-act="-1">←</button>' +
      '<span class="arch-count"></span>' +
      '<button type="button" data-act="1">→</button>';
    panel.append(bar);
    const toggle = bar.querySelector('[data-act="toggle"]');
    const prev = bar.querySelector('[data-act="-1"]');
    const next = bar.querySelector('[data-act="1"]');
    const count = bar.querySelector(".arch-count");
    toggle.hidden = still;

    let sc = 0; // scenario
    let at = 0; // its step
    let gen = 0; // bumped to cancel whatever is playing
    let hold = still; // play the current step, then wait for the reader
    let paused = false;
    let idle = true;
    let begun = false;
    let visible = false;

    // The clock: advances only while it may run; waits resolve against it, not wall time.
    let clock = 0;
    let last = 0;
    let raf = 0;
    const waits = new Set();
    const running = () => visible && !paused && !document.hidden;
    const frame = (now) => {
      raf = 0;
      if (!running() || !waits.size) return void (last = 0);
      clock += last ? Math.min(now - last, 50) : 0;
      last = now;
      for (const w of [...waits]) {
        const p = Math.min(1, (clock - w.t0) / w.ms);
        w.tick?.(p);
        if (p >= 1) {
          waits.delete(w);
          w.done();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && running() && waits.size) raf = requestAnimationFrame(frame);
    };
    const wait = (ms, tick) =>
      new Promise((done) => {
        waits.add({ t0: clock, ms, tick, done });
        kick();
      });
    const cancel = () => {
      gen++;
      waits.forEach((w) => w.done());
      waits.clear();
    };

    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
    const reach = (id, quiet) => {
      const n = parts.get(id);
      if (!n) return;
      n.classList.add("is-seen");
      const halo = n.querySelector(".halo");
      if (quiet || still || !halo?.animate) return;
      halo.animate(
        [
          { opacity: 0.7, transform: "scale(1)" },
          { opacity: 0, transform: `scale(${halo.dataset.grow})` },
        ],
        { duration: 900, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
      );
    };
    const dash = (tr, l, d) => {
      tr.style.strokeDasharray = l.rev ? `0 ${l.len - d} ${d} ${l.len}` : `${d} ${l.len}`;
    };
    const cross = (pt) => {
      const s = 4.5;
      marks.append(make("path", { class: "no", d: `M${pt.x - s} ${pt.y - s}l${2 * s} ${2 * s}m0 ${-2 * s}l${-2 * s} ${2 * s}` }));
    };
    const fade = () => trails.querySelectorAll(".trail:not(.old)").forEach((tr) => tr.classList.add("old"));

    // A step: data-route names the parts in order ("a b c", or "a b | a c" for branches that run
    // at once), data-tone="reply" for an answer, data-stop stops short on the last connection
    // (a way that does not exist), data-state / data-state-tr ="part: what it now says | …"
    // rewrites a small line.
    const plan = (li) => {
      const stop = Math.min(1, parseFloat(li.dataset.stop) || 1);
      const reply = li.dataset.tone === "reply";
      const paths = (li.dataset.route || "")
        .split("|")
        .map(words)
        .filter((route) => route.length)
        .map((route) => {
          const legs = [];
          for (let i = 1; i < route.length; i++) {
            const l = leg(route[i - 1], route[i]);
            if (l) legs.push(l);
          }
          const total = legs.reduce((sum, l) => sum + l.len, 0) - (legs.length ? legs[legs.length - 1].len * (1 - stop) : 0);
          return { route, legs, stop, total, reply };
        });
      return { paths, stop };
    };
    // Lays a step's trail, lights what it passes and returns where the dot is, for any distance along it.
    const walker = ({ route, legs, stop, reply }, quiet) => {
      legs.forEach((l) => l.p.classList.contains("ghost") && l.p.classList.add("is-shown"));
      const lines = legs.map((l) => {
        if (stop < 1) return null;
        const tr = l.p.cloneNode(false);
        tr.removeAttribute("data-edge");
        tr.setAttribute("class", reply ? "trail reply" : "trail");
        dash(tr, l, 0);
        trails.append(tr);
        return tr;
      });
      let passed = 0;
      reach(route[0], quiet);
      return (dist) => {
        let k = 0;
        let d = dist;
        while (k < legs.length - 1 && d > legs[k].len) d -= legs[k++].len;
        d = Math.max(0, Math.min(d, legs[k].len));
        lines.forEach((tr, j) => tr && dash(tr, legs[j], j < k ? legs[j].len : j === k ? d : 0));
        while (passed < k) reach(legs[passed++].to, quiet);
        const l = legs[k];
        return l.p.getPointAtLength(l.rev ? l.len - d : d);
      };
    };
    const settle = (li, { paths, stop }) => {
      parts.forEach((n) => n.classList.remove("is-now"));
      if (stop >= 1) paths.forEach(({ route }) => parts.get(route[route.length - 1])?.classList.add("is-now", "is-seen"));
      const state = (lang() === "tr" && li.dataset.stateTr) || li.dataset.state || "";
      for (const part of state.split("|")) {
        const i = part.indexOf(":");
        if (i < 0) continue;
        const n = parts.get(part.slice(0, i).trim());
        const sub = n?.querySelector(".sub");
        if (!sub) continue;
        sub.textContent = part.slice(i + 1).trim();
        sub.classList.add("is-state");
        n.classList.add("is-now", "is-seen");
      }
    };
    // A step already told, drawn at once.
    const apply = (li) => {
      const p = plan(li);
      fade();
      p.paths.forEach((r) => {
        if (!r.legs.length) return;
        const pt = walker(r, true)(r.total);
        if (r.stop < 1) cross(pt);
      });
      settle(li, p);
    };
    // The step being told: the dots travel, then the caption is given time to be read.
    const play = async (li, g, dwell) => {
      const p = plan(li);
      fade();
      li.style.setProperty("--p", 0);
      const moving = p.paths.filter((r) => r.legs.length);
      if (moving.length) {
        const walks = moving.map((r) => walker(r));
        const move = (x) =>
          moving.forEach((r, i) => {
            const pt = walks[i](r.total * ease(x));
            dot(i).setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
          });
        moving.forEach((r, i) => dot(i).classList.toggle("reply", r.reply));
        move(0);
        moving.forEach((r, i) => (dot(i).style.opacity = 1));
        const longest = Math.max(...moving.map((r) => r.total));
        await wait(Math.min(2600, Math.max(750, longest * 7)), move);
        if (g !== gen) return;
        pks.forEach((pk) => (pk.style.opacity = 0));
        moving.forEach((r, i) => {
          const end = walks[i](r.total);
          if (r.stop < 1) cross(end);
          else reach(r.route[r.route.length - 1]);
        });
      }
      settle(li, p);
      if (!dwell) return;
      const n = words(inLang(li.querySelector(".arch-step"))?.textContent).length;
      await wait(1400 + n * 230, (x) => li.style.setProperty("--p", x.toFixed(3)));
    };

    const reset = () => {
      svg.classList.remove("is-clearing");
      trails.replaceChildren();
      marks.replaceChildren();
      pks.forEach((pk) => (pk.style.opacity = 0));
      svg.querySelectorAll(".ghost").forEach((e) => e.classList.remove("is-shown"));
      parts.forEach((n) => {
        n.classList.remove("is-seen", "is-now");
        const sub = n.querySelector(".sub");
        if (!sub) return;
        sub.innerHTML = sub.dataset.plain;
        sub.classList.remove("is-state");
      });
    };
    const label = () => {
      toggle.textContent = paused || hold ? t("play") : t("pause");
      prev.setAttribute("aria-label", t("prevStep"));
      next.setAttribute("aria-label", t("nextStep"));
      row?.setAttribute("aria-label", t("scenarios"));
    };
    const show = () => {
      scenes.forEach((s, k) => (s.hidden = k !== sc));
      tabs.forEach((b, k) => b.setAttribute("aria-pressed", String(k === sc)));
      lists.forEach((lis, s) =>
        lis.forEach((li, i) => {
          const on = s === sc && i === at;
          li.classList.toggle("is-on", on);
          li.classList.toggle("is-done", s === sc && i < at);
          if (!on) li.style.removeProperty("--p");
        })
      );
      count.textContent = `${at + 1} / ${lists[sc].length}`;
      prev.disabled = at === 0;
      next.disabled = at === lists[sc].length - 1;
      label();
    };

    const loop = async (g) => {
      idle = false;
      while (g === gen) {
        show();
        await play(lists[sc][at], g, !hold);
        if (g !== gen) return;
        if (hold) return void (idle = true);
        if (at < lists[sc].length - 1) {
          at++;
          continue;
        }
        // End of a scenario: a pause, the trails fade, the next one begins.
        await wait(2000);
        if (g !== gen) return;
        svg.classList.add("is-clearing");
        await wait(500);
        if (g !== gen) return;
        sc = (sc + 1) % scenes.length;
        at = 0;
        reset();
      }
    };
    const go = (s, i, auto) => {
      cancel();
      const g = gen;
      begun = true;
      sc = (s + scenes.length) % scenes.length;
      at = Math.max(0, Math.min(i, lists[sc].length - 1));
      hold = still || !auto;
      paused = false;
      reset();
      lists[sc].slice(0, at).forEach(apply);
      show();
      if (still) return apply(lists[sc][at]);
      loop(g);
    };

    tabs.forEach((b, i) => b.addEventListener("click", () => go(i, 0, true)));
    lists.forEach((lis, s) => lis.forEach((li, i) => li.firstElementChild.addEventListener("click", () => go(s, i, false))));
    prev.addEventListener("click", () => go(sc, at - 1, false));
    next.addEventListener("click", () => go(sc, at + 1, false));
    toggle.addEventListener("click", () => {
      if (!hold) {
        paused = !paused;
        label();
        return kick();
      }
      hold = false;
      paused = false;
      label();
      if (!idle) return;
      if (at < lists[sc].length - 1) go(sc, at + 1, true);
      else go(sc + 1, 0, true);
    });
    // A new language redraws the step in view, so its small lines speak it too.
    onLang(() => (begun ? go(sc, at, !hold && !paused) : label()));

    show();
    if (still) return go(0, 0, false);
    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !begun) go(0, 0, true);
        kick();
      },
      { threshold: 0.4 }
    ).observe(svg);
    document.addEventListener("visibilitychange", kick);
  });

  /* Light on the water: a caustic pattern over the sea, drawn only while it is on screen. */
  const canvas = document.querySelector(".caustics");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision mediump float;
    uniform vec2 res;
    uniform float t;
    uniform float cell;
    const float TAU = 6.28318530718;
    void main() {
      vec2 uv = gl_FragCoord.xy / cell;
      vec2 p = mod(uv * TAU, TAU) - 250.0;
      vec2 i = p;
      float c = 1.0;
      float inten = 0.005;
      for (int n = 0; n < 4; n++) {
        float tt = t * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
      }
      c /= 4.0;
      c = 1.17 - pow(c, 1.4);
      float light = clamp(pow(abs(c), 8.0), 0.0, 1.0);
      // strongest near the surface (the top edge of the sea), fading into depth
      float depth = gl_FragCoord.y / res.y;
      float a = light * mix(0.05, 0.17, smoothstep(0.0, 1.0, depth));
      gl_FragColor = vec4(vec3(0.86, 0.94, 0.96) * a, a);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = compile(gl.VERTEX_SHADER, vs);
  const f = compile(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "res");
  const uT = gl.getUniformLocation(prog, "t");
  const uCell = gl.getUniformLocation(prog, "cell");

  // Rendered at half resolution: the pattern is soft, the GPU stays idle.
  const scale = 0.5;
  const size = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uCell, 300 * scale);
  };

  let visible = false;
  let raf = 0;
  const start = performance.now();
  const draw = (now) => {
    size();
    gl.uniform1f(uT, 23 + ((now - start) / 1000) * 0.16);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !still && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) {
      canvas.classList.add("on");
      run();
    }
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => visible && run());
  window.addEventListener("resize", () => visible && run());
})();
