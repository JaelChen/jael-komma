/* Jael Chen — Komma-reference redesign.
   Motion ported from kommakomma.is (GSAP + ScrollTrigger + SplitText + Lenis).
   Home + work/ sub pages; a small fetch-and-swap router replaces Barba so the
   reference's page transitions (strawberry sheet, side-by-side) can be ported. */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.parseEase('osmo') || CustomEaseFallback();
  function CustomEaseFallback() {
    // CustomEase is not bundled; register the same cubic-bezier as a named ease.
    const bez = cubicBezier(0.625, 0.05, 0, 1);
    gsap.registerEase('osmo', bez);
  }
  function cubicBezier(x1, y1, x2, y2) {
    const A = (a1, a2) => 1 - 3 * a2 + 3 * a1, B = (a1, a2) => 3 * a2 - 6 * a1, C = a1 => 3 * a1;
    const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
    const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const s = slope(t, x1, x2); if (!s) break; t -= (calc(t, x1, x2) - x) / s; }
      return calc(t, y1, y2);
    };
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;
  const header = document.querySelector('[data-site-header]');
  const main = document.querySelector('[data-main]');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.2, ...opts });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ---------- Line reveal helper (SplitText lines mask) ---------- */
  function lineReveal(targets, { stagger = 0.075, duration = 1.05 } = {}) {
    const nodes = targets.filter(Boolean);
    if (!nodes.length) return null;
    if (reduced) { gsap.set(nodes, { autoAlpha: 1 }); return { addTo() {}, play() {} }; }
    const splits = nodes.map(n => SplitText.create(n, { type: 'lines', mask: 'lines' })).filter(s => s.lines.length);
    const lines = splits.flatMap(s => s.lines);
    gsap.set(nodes, { autoAlpha: 1 });
    gsap.set(lines, { autoAlpha: 0, yPercent: 115, force3D: true });
    const tween = pos => ({ autoAlpha: 1, yPercent: 0, duration, ease: 'osmo', stagger, onComplete: () => gsap.set(lines, { clearProps: 'willChange' }) });
    return {
      addTo: (tl, at) => tl.to(lines, tween(), at),
      play: () => gsap.to(lines, tween()),
    };
  }

  /* ---------- Loader ---------- */
  function initLoader(entry) {
    const wrap = $('[data-load-wrap]'), panel = $('[data-load-panel]'), panelBottom = $('[data-load-panel-bottom]');
    const container = $('[data-load-container]');

    const finish = () => {
      body.removeAttribute('data-initial-loader');
      lenis?.start();
      ScrollTrigger.refresh();
    };

    if (reduced || !wrap) {
      entry.play();
      finish();
      return;
    }

    // Four alphabet reels spelling "Jael". Each reel holds a run of letters that
    // ends on its target; they all spin together and settle one after another.
    const tracks = $$('[data-load-track]', wrap);
    const REEL = 12;
    tracks.forEach(track => {
      const target = track.dataset.letter, upper = target === target.toUpperCase();
      const alpha = upper ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz';
      const idx = alpha.indexOf(target);
      for (let i = REEL - 1; i >= 0; i--) {
        const cell = document.createElement('div'); cell.className = 'loader__logo-cell';
        cell.textContent = alpha[(idx - i + 26) % 26]; track.appendChild(cell);
      }
    });
    gsap.set(wrap, { display: 'block' });

    const measure = track => {
      const first = track.firstElementChild, second = track.children[1];
      const cell = first.getBoundingClientRect().height;
      const step = second ? second.offsetTop - first.offsetTop : cell;
      return { step, cell, finalIndex: track.children.length - 1 };
    };

    document.fonts.ready.then(() => requestAnimationFrame(() => {
      // Each column is as wide as the letter it lands on (full glyph box, so nothing gets clipped),
      // then the whole word is shifted so "ae" sits on the screen's centre line.
      tracks.forEach(track => {
        const probe = track.lastElementChild.cloneNode(true);
        probe.style.cssText = 'position:absolute;visibility:hidden;width:auto;flex:none;padding:0 .02em';
        track.parentElement.appendChild(probe);
        track.parentElement.style.width = `${Math.ceil(probe.getBoundingClientRect().width)}px`;
        probe.remove();
      });
      const logo = $('[data-load-logo]', wrap), cols = tracks.map(t => t.parentElement);
      const a = cols[1].getBoundingClientRect(), e = cols[2].getBoundingClientRect();
      gsap.set(logo, { x: innerWidth / 2 - (a.left + e.right) / 2 });
      const panelH = panel.getBoundingClientRect().height;
      const tl = gsap.timeline();
      const SPIN = 1.6, STEP = 0.45, SETTLE = 0.6;
      tracks.forEach((track, i) => {
        const m = measure(track), end = -(m.step * m.finalIndex), over = end + m.cell * 0.25;
        gsap.set(track, { y: m.step });
        const spin = SPIN + i * STEP;
        tl.to(track, { y: over, duration: spin, ease: 'osmo', force3D: true }, i * 0.06)
          .to(track, { y: end, duration: SETTLE, ease: 'osmo', force3D: true }, i * 0.06 + spin);
      });
      wrap.dataset.loadState = 'ready';
      gsap.set(container, { autoAlpha: 1 });
      const reveal = SPIN + (tracks.length - 1) * (STEP + 0.06) + SETTLE + 0.35;
      tl.add('revealPage', reveal);
      entry.addTo(tl, 'revealPage+=0.05');
      // The settled name lifts with the panel, then the curtain goes up.
      tl.to(container, { y: -panelH * 0.18, autoAlpha: 0, duration: 0.55, ease: 'osmo' }, 'revealPage')
        .to(panel, { y: -panelH, duration: 1, ease: 'osmo' }, 'revealPage')
        .to(panelBottom, { scaleY: 0, duration: 1, ease: 'osmo' }, 'revealPage')
        .set(wrap, { display: 'none' })
        .call(finish);
    }));
  }

  /* ---------- Hero slideshow ---------- */
  function initHeroSlideshow(root) {
    const slides = $$('[data-hero-slide]', root);
    const inners = slides.map(s => $('[data-hero-slide-inner]', s));
    const names = $$('[data-hero-work-name]', root), years = $$('[data-hero-work-year]', root);
    const dots = $$('[data-hero-dot]', root), progress = $('[data-hero-progress]', root), trigger = $('[data-hero-work-trigger]', root);
    const n = slides.length;
    if (n < 2 || !progress) return;
    const DUR = 6, SLIDE = 1.5, STAG = 0.08, YP = 125, PAR = 75;
    let cur = 0, busy = false, hovering = false, started = false, prog = null;
    const words = el => { const w = $$('[data-hero-word]', el); return w.length ? w : [el]; };
    const prime = arr => arr.forEach((el, i) => { if (i !== cur) { gsap.set(el, { autoAlpha: 1 }); gsap.set(words(el), { yPercent: YP }); } });
    prime(names); prime(years);

    const img = (i, k) => $(`[data-hero-work-image="${k}"]`, slides[i]);
    const setHover = (i, on, instant = false) => {
      const p = img(i, 'primary'), h = img(i, 'hover');
      if (!p || !h) return;
      gsap.killTweensOf([p, h]);
      if (reduced || instant) { gsap.set(p, { autoAlpha: on ? 0 : 1, scale: on ? 0.93 : 1 }); gsap.set(h, { autoAlpha: on ? 1 : 0, scale: on ? 1 : 1.085 }); return; }
      gsap.to(p, { scale: on ? 0.93 : 1, autoAlpha: on ? 0 : 1, duration: 0.68, ease: 'osmo' });
      gsap.to(h, { scale: on ? 1 : 1.085, autoAlpha: on ? 1 : 0, duration: 0.7, ease: 'osmo' });
    };
    const restartProgress = () => {
      prog?.kill(); prog = null; gsap.set(progress, { scaleX: 0 });
      if (reduced || !started || !root.isConnected) return;
      prog = gsap.to(progress, { scaleX: 1, duration: DUR, ease: 'none', onComplete: () => go(cur + 1, 1) });
      if (hovering) prog.timeScale(0);
    };
    const swapStack = (arr, from, to, delay = 0) => {
      const a = arr[from], b = arr[to]; if (!a || !b) return;
      const wa = words(a), wb = words(b);
      gsap.killTweensOf([...wa, ...wb]);
      a.setAttribute('aria-hidden', 'true'); b.removeAttribute('aria-hidden');
      if (reduced) { gsap.set(wa, { yPercent: -YP }); gsap.set(wb, { yPercent: 0 }); return; }
      gsap.to(wa, { yPercent: -YP, duration: 0.7, delay, stagger: STAG, ease: 'osmo' });
      gsap.fromTo(wb, { yPercent: YP }, { yPercent: 0, duration: 0.9, delay: 0.12 + delay, stagger: STAG, ease: 'osmo' });
    };
    let yearIdx = 0;
    const yearText = i => years[i]?.textContent.trim() ?? '';
    const go = (idx, dir) => {
      if (busy) return;
      const next = ((idx % n) + n) % n; if (next === cur) return;
      const prev = cur; dir = dir ?? (next > prev ? 1 : -1);
      busy = true; cur = next;
      dots.forEach((d, i) => d.classList.toggle('is--current', i === next));
      if (trigger) { trigger.href = slides[next].dataset.href; trigger.setAttribute('aria-label', `View project: ${slides[next].dataset.name}`); }
      setHover(prev, false, true); setHover(next, hovering, true);
      swapStack(names, prev, next);
      if (yearText(yearIdx) !== yearText(next)) { swapStack(years, yearIdx, next, 0.12); yearIdx = next; }
      const S0 = slides[prev], S1 = slides[next], I0 = inners[prev], I1 = inners[next];
      if (reduced) { S1.classList.add('is--current'); S0.classList.remove('is--current'); busy = false; restartProgress(); return; }
      gsap.timeline({ defaults: { duration: SLIDE, ease: 'osmo' }, onStart: () => S1.classList.add('is--current'),
        onComplete: () => { S0.classList.remove('is--current'); gsap.set([S0, I0], { clearProps: 'transform' }); busy = false; } })
        .to(S0, { xPercent: -dir * 100 }, 0).to(I0, { xPercent: dir * PAR }, 0)
        .fromTo(S1, { xPercent: dir * 100 }, { xPercent: 0 }, 0).fromTo(I1, { xPercent: -dir * PAR }, { xPercent: 0 }, 0);
      restartProgress();
    };
    dots.forEach(d => d.addEventListener('click', () => { const i = +d.dataset.index; if (i !== cur && !busy) go(i, i > cur ? 1 : -1); }));

    // Hover on VIEW PROJECT swaps the image + pauses the timer
    const setHovering = on => {
      if (on === hovering) return; hovering = on; setHover(cur, on);
      if (prog && !reduced) gsap.to(prog, { timeScale: on ? 0 : 1, duration: on ? 0.75 : 0.55, ease: on ? 'power2.out' : 'power2.inOut' });
    };
    if (finePointer && trigger) {
      trigger.addEventListener('mouseenter', () => setHovering(true));
      trigger.addEventListener('mouseleave', () => setHovering(false));
      window.addEventListener('blur', () => setHovering(false));
    }
    const start = () => { if (!started) { started = true; restartProgress(); } };
    if (+getComputedStyle(root).opacity > 0.9) start();
    else new MutationObserver((_, o) => { if (+getComputedStyle(root).opacity > 0.9) { o.disconnect(); start(); } }).observe(root, { attributes: true, attributeFilter: ['style'] });
  }

  /* ---------- Home scroll: hero parallax, hero paint, header theme, intro quote ---------- */
  function initHomeScroll(root) {
    const hero = $('.home-hero', root), spacer = $('[data-home-hero-end]', root), stack = $('[data-hero-parallax-image]', root);
    const surfaces = $$('[data-header-light-surface]', root);
    if (stack && spacer && !reduced && !window.matchMedia('(max-width: 767px)').matches) {
      gsap.to(stack, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: spacer, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    }
    if (hero && spacer) {
      const paint = () => { const off = spacer.getBoundingClientRect().bottom <= -1; if (off) hero.dataset.heroPaint = 'alabaster'; else delete hero.dataset.heroPaint; };
      ScrollTrigger.create({ trigger: spacer, start: 'bottom top-=1', end: 'max', onEnter: paint, onEnterBack: paint, onLeaveBack: paint, onRefresh: paint });
      const onScroll = () => hero.isConnected ? paint() : window.removeEventListener('scroll', onScroll);
      window.addEventListener('scroll', onScroll, { passive: true });
      paint();
    }
    const triggers = [];
    function sync() { const v = triggers.some(t => t.isActive) ? 'active' : 'inactive'; header.dataset.sectionTheme = v; body.dataset.sectionTheme = v; }
    surfaces.forEach(el => triggers.push(ScrollTrigger.create({ trigger: el, start: 'top top+=96', end: 'bottom top+=96', onToggle: sync, onRefresh: sync })));
    sync();

    const col = $('[data-intro-trigger]', root), scroll = $('[data-intro-scroll]', root);
    mm.add('(min-width: 640px)', () => {
      if (!col || !scroll) return;
      gsap.to(scroll, {
        y: () => { const p = col.offsetHeight || col.parentElement.offsetHeight, s = scroll.offsetHeight || 100; return Math.min(p * 0.32, Math.max(0, p - s - 64)); },
        ease: 'power1.inOut', scrollTrigger: { trigger: col, start: 'top 50%', end: 'bottom 30%', scrub: true, invalidateOnRefresh: true },
      });
      $$('.word-swap', root).forEach(ws => {
        const o = $('.old-word', ws), nw = $('.new-word', ws);
        gsap.timeline({ scrollTrigger: { trigger: col, start: 'top 50%', end: 'bottom 50%', scrub: true, invalidateOnRefresh: true } })
          .fromTo(o, { yPercent: 0 }, { yPercent: -100 }).to(o, { color: '#2f2f2f', opacity: 0.5, ease: 'none' }, 0);
        gsap.timeline({ scrollTrigger: { trigger: col, start: 'top 50%', end: 'bottom 50%', scrub: true, invalidateOnRefresh: true } }).to(nw, { yPercent: -100 });
      });
    });
  }

  /* ---------- Underlay nav ---------- */
  function initNav() {
    const toggle = $('[data-underlay-nav-toggle]'), bars = $$('.underlay-nav__toggle-bar'), menu = $('[data-underlay-nav-menu]');
    const revealL = $$('[data-reveal-l]'), revealS = $$('[data-reveal-s]'), border = $('.underlay-nav__bottom-border');
    const overlay = $('[data-underlay-nav-overlay]'), dark = $('.underlay-nav__dark'), corners = $$('.underlay-nav__corner'), rows = $$('.underlay-nav__border-row');
    const blur = $('[data-header-blur]');
    let open = false, tl, openEnd = 0;
    const menuX = () => -menu.offsetWidth;
    gsap.set(overlay, { visibility: 'hidden', pointerEvents: 'none' }); gsap.set(dark, { autoAlpha: 0 });
    gsap.set(border, { scaleX: 0 }); gsap.set(rows[0], { yPercent: -100 }); gsap.set(rows[1], { yPercent: 100 }); gsap.set(corners, { scale: 0 });

    // Text roll hover links (menu + footer share the same recipe)
    const hoverLinks = (sel, cur, nxt) => $$(sel).forEach(link => {
      const a = $(cur, link), b = $(nxt, link); if (!a || !b) return;
      if (reduced) { link.addEventListener('mouseenter', () => gsap.set([a, b], { yPercent: -100 })); link.addEventListener('mouseleave', () => gsap.set([a, b], { yPercent: 0 })); return; }
      const t = gsap.timeline({ paused: true }).to([a, b], { yPercent: -100, duration: 0.7, ease: 'osmo' }, 0);
      link.addEventListener('mouseenter', () => t.play()); link.addEventListener('mouseleave', () => t.reverse());
    });
    if (finePointer) { hoverLinks('[data-underlay-hover-link]', '[data-underlay-hover-current]', '[data-underlay-hover-next]'); hoverLinks('[data-footer-hover-link]', '[data-footer-hover-current]', '[data-footer-hover-next]'); }

    const build = () => {
      tl = gsap.timeline({ paused: true, defaults: { ease: 'osmo' }, onReverseComplete: () => { gsap.set(main, { clearProps: 'transform' }); blur && gsap.to(blur, { '--blur-reveal': 1, duration: 0.45, ease: 'power2.out' }); closed(); } });
      tl.set(overlay, { visibility: 'visible', pointerEvents: 'auto' }, 0)
        .to([main, overlay], { x: menuX, duration: 0.7 }, 0).to(dark, { autoAlpha: 1, duration: 0.5 }, 0)
        .to(corners, { scale: 1, duration: 0.5 }, 0).to(rows, { yPercent: 0, duration: 0.5 }, 0)
        .to(bars[0], { y: '0.25em', rotation: 45, duration: 0.35, ease: 'back.out(1.4)' }, 0.05)
        .to(bars[1], { y: '-0.25em', rotation: -45, duration: 0.35, ease: 'back.out(1.4)' }, 0.05)
        .fromTo(revealL, { autoAlpha: 0, xPercent: 25 }, { autoAlpha: 1, xPercent: 0, duration: 0.7, stagger: 0.05 }, 0)
        .fromTo(revealS, { autoAlpha: 0, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.03, ease: 'power3.out' }, 0.3)
        .to(border, { scaleX: 1, duration: 0.5 }, '<');
      openEnd = tl.duration();
      tl.addPause().addLabel('closeStart')
        .to([...revealL, ...revealS], { autoAlpha: 0, duration: 0.3 }, 'closeStart')
        .to([main, overlay], { x: 0, duration: 0.6 }, 'closeStart').to(dark, { autoAlpha: 0, duration: 0.35, ease: 'power2.inOut' }, '<')
        .to(corners, { scale: 0, duration: 0.5 }, '<').to(rows[0], { yPercent: -100, duration: 0.5 }, '<').to(rows[1], { yPercent: 100, duration: 0.5 }, '<')
        .to(bars, { y: 0, rotation: 0, duration: 0.25, ease: 'power3.in' }, '<')
        .set(overlay, { visibility: 'hidden', pointerEvents: 'none' }).set(main, { clearProps: 'transform' }).call(closed)
        .call(() => blur && gsap.to(blur, { '--blur-reveal': 1, duration: 0.45, ease: 'power2.out' }));
    };
    const closed = () => { if (!open) { body.setAttribute('data-menu-status', ''); window.dispatchEvent(new CustomEvent('underlay-nav:closed')); } };
    const flip = () => {
      open = !open;
      toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'close menu' : 'open menu');
      body.setAttribute('data-menu-status', open ? 'open' : 'closing');
      if (open) { blur && gsap.to(blur, { '--blur-reveal': 0, duration: 0.2 }); tl.invalidate(); tl.time() >= openEnd ? tl.restart() : tl.play(); }
      else tl.time() < openEnd ? tl.reverse() : tl.play();
    };
    build();
    toggle.addEventListener('click', flip);
    overlay.addEventListener('click', () => open && flip());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { flip(); toggle.focus(); } });
    menu.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      e.preventDefault();
      const href = a.getAttribute('href');
      if (!onHome()) { go(homeURL(href), { trigger: a }); return; }   // go() closes the menu first
      const target = href === '#top' ? 0 : $(href);
      $$('[data-menu-link]').forEach(l => l.classList.toggle('w--current', l === a));
      const goNow = () => requestAnimationFrame(() => scrollTo(target));
      if (open) { window.addEventListener('underlay-nav:closed', goNow, { once: true }); flip(); } else goNow();
    });
    let rs; window.addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(() => open ? gsap.set([main, overlay], { x: menuX() }) : tl.invalidate(), 150); });
  }

  /* ---------- Links: in-page anchors scroll, page links go through the router ---------- */
  function initLinks() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a || a.closest('[data-underlay-nav-menu]') || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const href = a.getAttribute('href'); if (href === '#') return;
      if (href.startsWith('#')) {
        if (!onHome()) { e.preventDefault(); go(homeURL(href), { trigger: a }); return; }
        const target = href === '#top' ? 0 : $(href); if (target === null) return;
        e.preventDefault(); scrollTo(target); return;
      }
      const url = pageURL(a.href); if (!url || url.pathname === location.pathname) return;
      e.preventDefault(); go(url.href, { trigger: a });
    });
    // Prefetch on hover so the swap is instant.
    document.addEventListener('pointerenter', e => { const a = e.target.closest?.('a[href]'); const u = a && !a.target && pageURL(a.href); if (u && u.pathname !== location.pathname) fetchPage(u.href).catch(() => {}); }, true);
    window.addEventListener('popstate', () => go(location.href, { push: false }));
  }

  /* ---------- Directional hover tiles ---------- */
  function initDirectionalHover(root) {
    if (!finePointer) return;
    const dirOf = (e, el, type) => {
      const { left, top, width, height } = el.getBoundingClientRect(), x = e.clientX - left, y = e.clientY - top;
      if (type === 'y') return y < height / 2 ? 'top' : 'bottom';
      if (type === 'x') return x < width / 2 ? 'left' : 'right';
      const d = { top: y, right: width - x, bottom: height - y, left: x };
      return Object.entries(d).reduce((a, b) => a[1] < b[1] ? a : b)[0];
    };
    const IN = { top: 'translateY(-100%)', bottom: 'translateY(100%)', left: 'translateX(-100%)', right: 'translateX(100%)' };
    const OUT = { top: 'translateY(-110%)', bottom: 'translateY(110%)', left: 'translateX(-110%)', right: 'translateX(110%)' };
    $$('[data-directional-hover]', root).forEach(group => {
      const type = group.dataset.type || 'all';
      $$('[data-directional-hover-item]', group).forEach(item => {
        const tile = $('[data-directional-hover-tile]', item); if (!tile) return;
        item.addEventListener('mouseenter', e => { const d = dirOf(e, item, type); tile.style.transition = 'none'; tile.style.transform = IN[d]; void tile.offsetHeight; tile.style.transition = ''; tile.style.transform = 'translate(0,0)'; });
        item.addEventListener('mouseleave', e => { tile.style.transform = OUT[dirOf(e, item, type)]; });
      });
    });
  }

  /* ---------- Orbit tiles ---------- */
  function initOrbitTiles(section) {
    const list = $('[data-orbit-tiles-list]', section), items = $$('[data-orbit-tiles-item]', section);
    const links = $$('[data-orbit-list-item]', section), desc = $('[data-orbit-info-desc]', section), left = $('[data-orbit-left]', section);
    const n = items.length; if (n < 2) return;
    const RX = 1, RY = 0, BLUR = 0.04, SCALE_MIN = 0.2, BRIGHT_MIN = 0.3, DEG_PER_S = 360 / 24;
    const pos = { value: 0 };
    let rot = 0, inView = false, activeIdx = -1, cardW = items[0].offsetWidth, selected = null, busy = false, descSplit = null;
    const tilt = finePointer && !reduced, MAX_ROT = 14, TILT_DUR = 0.65, TILT_EASE = 'power3.out';
    let mx = innerWidth / 2, my = innerHeight / 2, raf = 0, tiltState = null, labelTl = null, titleSplit = null, labelGen = 0;
    const RADIUS = '0.65em', CLIP_FRAC = 0.25, CLIP_REST = `inset(25% 0% 25% 0% round ${RADIUS})`;

    items.forEach(it => {
      const card = $('.orbit-card', it), media = $('[data-orbit-card-media]', it);
      gsap.set(card, { '--orbit-card-reveal': 0 }); gsap.set(media, { clipPath: CLIP_REST });
      gsap.set([$('[data-orbit-card-title-label]', it), $('[data-orbit-card-cta-label]', it)], { autoAlpha: 0, yPercent: 115 });
    });
    gsap.set(desc, { opacity: 0 });

    const syncActive = () => { const i = ((Math.round(pos.value) % n) + n) % n; if (i !== activeIdx) { activeIdx = i; items.forEach((it, k) => it.dataset.orbitTilesItemStatus = k === i ? 'active' : 'not-active'); } };
    const layout = () => {
      const rx = cardW * RX, ry = cardW * RY, blur = cardW * BLUR;
      syncActive(); gsap.set(list, { rotation: rot });
      items.forEach((it, i) => {
        const a = (i - pos.value) / n * Math.PI * 2, p = (Math.cos(a) + 1) / 2, m = Math.pow(p, 1.3);
        gsap.set(it, { x: Math.sin(a) * rx, y: Math.cos(a) * ry, scale: gsap.utils.interpolate(SCALE_MIN, 1, m), opacity: 1,
          filter: `blur(${gsap.utils.interpolate(blur, 0, m)}px) brightness(${gsap.utils.interpolate(BRIGHT_MIN, 1, m)})`, zIndex: Math.round(m * 1000), rotation: -rot });
      });
    };
    const spin = (_, dt) => { if (!section.isConnected) return gsap.ticker.remove(spin); if (inView) { rot = (rot + DEG_PER_S * dt / 1000) % 360; layout(); } };
    const targetW = () => {
      const r = left.getBoundingClientRect(), w = r.width || 400, h = r.height || innerHeight;
      return Math.min(w * 0.48, Math.max(160, (h - 192) * 2 / 3));
    };
    const revealOf = card => gsap.utils.clamp(0, 1, parseFloat(gsap.getProperty(card, '--orbit-card-reveal')) || 0);
    const applyClip = card => { const m = $('[data-orbit-card-media]', card); const inset = card.offsetHeight * CLIP_FRAC * (1 - revealOf(card)); gsap.set(m, { clipPath: `inset(${inset <= 0.5 ? 0 : inset}px 0px ${inset <= 0.5 ? 0 : inset}px 0px round ${RADIUS})` }); };
    const expand = (card, done) => {
      gsap.killTweensOf(card); card.dataset.naturalWidth = card.offsetWidth; const to = targetW();
      if (reduced) { cardW = to; gsap.set(card, { '--orbit-card-reveal': 1, width: to }); applyClip(card); done?.(); return; }
      gsap.set(card, { '--orbit-card-reveal': 0 }); applyClip(card);
      const proxy = { w: card.offsetWidth };
      gsap.to(proxy, { w: to, duration: 0.75, ease: 'osmo', onUpdate: () => cardW = proxy.w, onComplete: () => cardW = to });
      gsap.to(card, { '--orbit-card-reveal': 1, width: to, duration: 0.75, ease: 'osmo', onUpdate: () => applyClip(card), onComplete: () => { applyClip(card); done?.(); } });
    };
    const collapse = card => {
      gsap.killTweensOf(card); const nat = parseFloat(card.dataset.naturalWidth) || null, media = $('[data-orbit-card-media]', card);
      const reset = () => { gsap.set(card, { '--orbit-card-reveal': 0, clearProps: 'width,--orbit-card-reveal' }); gsap.set(media, { clipPath: CLIP_REST }); cardW = nat ?? cardW; };
      if (reduced) { reset(); return; }
      const proxy = { w: cardW };
      gsap.to(proxy, { w: nat ?? cardW, duration: 0.55, ease: 'osmo', onUpdate: () => cardW = proxy.w });
      gsap.to(card, { '--orbit-card-reveal': 0, ...(nat ? { width: nat } : {}), duration: 0.55, ease: 'osmo', onUpdate: () => applyClip(card), onComplete: reset });
    };
    const hideLabels = instant => {
      labelGen++; labelTl?.kill(); labelTl = null; titleSplit?.revert(); titleSplit = null;
      const all = $$('[data-orbit-card-title-label], [data-orbit-card-cta-label]', section);
      instant ? gsap.set(all, { autoAlpha: 0, yPercent: 115 }) : gsap.to(all, { autoAlpha: 0, yPercent: 115, duration: 0.28, ease: 'power2.in', overwrite: true });
    };
    const showLabels = (i, done) => {
      const gen = ++labelGen, lab = $('[data-orbit-card-title-label]', items[i]), title = $('[data-orbit-card-title]', items[i]), cta = $('[data-orbit-card-cta-label]', items[i]);
      if (reduced) { gsap.set([lab, cta], { autoAlpha: 1, yPercent: 0 }); done?.(); return; }
      if (gen !== labelGen || selected !== i) return;
      titleSplit = SplitText.create(title, { type: 'chars', mask: 'chars', charsClass: 'orbit-card__title-char', tag: 'span' });
      const chars = titleSplit.chars.length ? titleSplit.chars : [title];
      gsap.set([lab, cta], { autoAlpha: 0, yPercent: 115 }); gsap.set(chars, { autoAlpha: 0, yPercent: 120, force3D: true });
      labelTl = gsap.timeline({ defaults: { ease: 'osmo' }, onComplete: () => done?.() })
        .to(lab, { autoAlpha: 1, yPercent: 0, duration: 0.72, overwrite: true }, 0)
        .to(chars, { autoAlpha: 1, yPercent: 0, duration: 0.68, stagger: 0.018, overwrite: true }, 0.12)
        .to(cta, { autoAlpha: 1, yPercent: 0, duration: 0.58, overwrite: true }, 0.7);
    };
    // Tilt
    const stopTilt = animate => {
      const s = tiltState; if (!s) return; tiltState = null; gsap.killTweensOf(s.proxy);
      const clear = () => gsap.set(s.el, { clearProps: 'rotationX,rotationY,transformPerspective,transformStyle' });
      if (!animate) { s.setX(0); s.setY(0); clear(); return; }
      gsap.to(s.proxy, { rx: 0, ry: 0, duration: 0.35, ease: TILT_EASE, overwrite: true, onUpdate: () => { s.setX(s.proxy.rx); s.setY(s.proxy.ry); }, onComplete: clear });
    };
    const startTilt = i => {
      if (!tilt) return; const el = $('[data-orbit-card-tilt]', items[i]); if (!el) return;
      stopTilt(false);
      gsap.set(el, { rotationX: 0, rotationY: 0, transformPerspective: innerWidth * 0.5, transformStyle: 'preserve-3d' });
      tiltState = { el, rect: el.getBoundingClientRect(), proxy: { rx: 0, ry: 0 }, setX: gsap.quickSetter(el, 'rotationX', 'deg'), setY: gsap.quickSetter(el, 'rotationY', 'deg') };
      updateTilt();
    };
    const updateTilt = () => {
      raf = 0; const s = tiltState; if (!s) return;
      const cx = s.rect.left + s.rect.width / 2, cy = s.rect.top + s.rect.height / 2;
      const px = gsap.utils.clamp(-1, 1, (mx - cx) / (s.rect.width / 2 || 1)), py = gsap.utils.clamp(-1, 1, (my - cy) / (s.rect.height / 2 || 1));
      gsap.to(s.proxy, { rx: -py * MAX_ROT, ry: px * MAX_ROT, duration: TILT_DUR, ease: TILT_EASE, overwrite: true, onUpdate: () => { s.setX(s.proxy.rx); s.setY(s.proxy.ry); } });
    };
    const queueTilt = () => { if (tiltState && !raf) raf = requestAnimationFrame(updateTilt); };
    const refreshRect = () => { if (tiltState) { tiltState.rect = tiltState.el.getBoundingClientRect(); queueTilt(); } };
    // Description
    const hideDesc = done => {
      if (!desc) return done?.();
      descSplit?.lines && gsap.killTweensOf(descSplit.lines); gsap.killTweensOf(desc);
      if (reduced) { descSplit?.revert(); descSplit = null; gsap.set(desc, { opacity: 0 }); return done?.(); }
      gsap.to(desc, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: () => { descSplit?.revert(); descSplit = null; done?.(); } });
    };
    const showDesc = text => {
      if (!desc) return; desc.textContent = text;
      if (reduced) { gsap.set(desc, { opacity: 1, clearProps: 'transform' }); return; }
      descSplit = SplitText.create(desc, { type: 'lines', mask: 'lines' });
      const lines = descSplit.lines.length ? descSplit.lines : [desc];
      const hs = lines.map(l => Math.ceil(l.getBoundingClientRect().height) + 2);
      gsap.set(lines, { y: i => hs[i] }); gsap.set(desc, { opacity: 1 });
      requestAnimationFrame(() => gsap.to(lines, { y: 0, duration: 0.7, ease: 'osmo', stagger: 0.08, onComplete: () => gsap.set(lines, { clearProps: 'transform' }) }));
    };
    const nearest = t => { const c = pos.value, d = (((t - c) % n) + n) % n; return d < n / 2 ? c + d : c - (n - d); };
    const select = i => {
      if (busy || selected === i) return;
      busy = true; stopTilt(true); hideLabels(false);
      if (selected !== null && selected !== i) { const c = $('.orbit-card', items[selected]); collapse(c); links[selected]?.setAttribute('data-active', 'false'); hideDesc(() => showDesc(items[i].dataset.workDesc)); }
      else showDesc(items[i].dataset.workDesc);
      selected = i; links.forEach((l, k) => l.setAttribute('data-active', k === i ? 'true' : 'false'));
      const after = () => { const c = $('.orbit-card', items[i]); expand(c, () => { if (selected === i) { startTilt(i); showLabels(i, () => selected === i && (busy = false)); } }); };
      if (reduced) { pos.value = i; layout(); after(); return; }
      gsap.to(pos, { value: nearest(i), duration: 0.7, ease: 'osmo', onUpdate: layout, onComplete: after });
    };
    const first = () => {
      if (selected !== null) return; busy = true; selected = 0;
      links.forEach((l, k) => l.setAttribute('data-active', k === 0 ? 'true' : 'false')); layout();
      const c = $('.orbit-card', items[0]); expand(c, () => { if (selected === 0) { startTilt(0); showLabels(0, () => selected === 0 && (busy = false)); } });
      showDesc(items[0].dataset.workDesc);
    };
    const openSelected = () => { const i = selected ?? activeIdx; const href = items[i]?.dataset.workHref; if (href) go(href, { trigger: items[i] }); };

    links.forEach((l, i) => l.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); select(i); }));
    left.addEventListener('click', e => { e.preventDefault(); openSelected(); });
    $$('[data-orbit-card-btn]', section).forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openSelected(); }));
    if (tilt) { document.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; queueTilt(); }, { passive: true }); window.addEventListener('resize', refreshRect, { passive: true }); window.addEventListener('scroll', refreshRect, { passive: true }); }
    new ResizeObserver(() => { cardW = Math.max(...items.map(i => i.offsetWidth)); layout(); if (selected !== null) { const c = $('.orbit-card', items[selected]); gsap.set(c, { width: targetW() }); applyClip(c); } refreshRect(); }).observe(section);
    layout();
    if (!reduced) gsap.ticker.add(spin);
    ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: t => { inView = t.isActive; if (inView && selected === null) first(); } });
  }

  /* ---------- Mobile works gallery ---------- */
  function initMobileGallery(root) {
    const slides = $$('[data-mobile-works-slide]', root), title = $('[data-mobile-works-active-title]', root), link = $('[data-mobile-works-active-link]', root), descEl = $('[data-mobile-works-description]', root);
    if (!slides.length) return;
    const io = new IntersectionObserver(entries => {
      const best = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (!best) return;
      const s = best.target; title.textContent = s.dataset.workName; link.href = s.dataset.workHref || s.getAttribute('href'); descEl.textContent = s.dataset.workDesc;
    }, { root: $('[data-mobile-works-track]', root), threshold: [0.6] });
    slides.forEach(s => io.observe(s));
  }

  /* ---------- Services accordion ---------- */
  function initServices(section) {
    const items = $$('[data-services-item]', section), images = $$('[data-services-image]', section), panels = $$('[data-services-panel]', section), copies = $$('[data-services-copy]', section);
    const preview = $('[data-services-preview]', section), visual = $('.services-section__visual', section);
    if (!items.length) return;
    let hovered = 0, expanded = -1, targetY = 0, curY = 0, raf = 0, moving = false;
    const tls = [];
    gsap.set(panels, { height: 0, autoAlpha: 0 }); gsap.set(copies, { autoAlpha: 0 });
    const splits = reduced ? [] : copies.map(c => SplitText.create(c, { type: 'lines', mask: 'lines' }));
    const linesOf = i => splits[i]?.lines.length ? splits[i].lines : [copies[i]];
    const setY = () => preview.style.setProperty('--services-preview-y', `${Math.round(curY)}px`);
    const ease = () => { const d = targetY - curY; if (Math.abs(d) < 0.35) { curY = targetY; setY(); raf = 0; return; } curY += d * 0.055; setY(); raf = requestAnimationFrame(ease); };
    const measure = () => {
      if (window.matchMedia('(max-width: 767px)').matches) { preview.style.removeProperty('--services-preview-y'); moving = false; return; }
      const it = items[hovered].getBoundingClientRect(), vr = visual.getBoundingClientRect(), pr = preview.getBoundingClientRect();
      targetY = it.top - vr.top + it.height / 2 - pr.height / 2;
      if (!moving || reduced) { curY = targetY; moving = true; setY(); return; }
      if (!raf) raf = requestAnimationFrame(ease);
    };
    const focusItem = i => { items.forEach((it, k) => it.dataset.active = k === i ? 'true' : 'false'); hovered = i; images.forEach((im, k) => k === i ? im.dataset.active = 'true' : delete im.dataset.active); measure(); };
    const close = (i, dur = 0.45) => {
      tls[i]?.kill(); gsap.killTweensOf([panels[i], copies[i], ...linesOf(i)]);
      items[i].dataset.expanded = 'false'; items[i].setAttribute('aria-expanded', 'false');
      if (reduced) { gsap.set(panels[i], { height: 0, autoAlpha: 0 }); gsap.set([copies[i], ...linesOf(i)], { autoAlpha: 0 }); return; }
      tls[i] = gsap.timeline({ onComplete: () => { gsap.set(panels[i], { height: 0, autoAlpha: 0 }); gsap.set(copies[i], { autoAlpha: 0 }); } })
        .to(linesOf(i), { autoAlpha: 0, yPercent: -30, duration: 0.18, ease: 'power2.in' }, 0).to(panels[i], { height: 0, autoAlpha: 0, duration: dur, ease: 'osmo' }, 0);
    };
    const openPanel = i => {
      tls[i]?.kill(); gsap.killTweensOf([panels[i], copies[i], ...linesOf(i)]);
      items[i].dataset.expanded = 'true'; items[i].setAttribute('aria-expanded', 'true');
      if (reduced) { gsap.set(panels[i], { height: 'auto', autoAlpha: 1 }); gsap.set([copies[i], ...linesOf(i)], { autoAlpha: 1, yPercent: 0 }); measure(); return; }
      gsap.set(copies[i], { autoAlpha: 1 }); gsap.set(linesOf(i), { autoAlpha: 0, yPercent: 110 });
      tls[i] = gsap.timeline({ onUpdate: measure, onComplete: () => { gsap.set(panels[i], { height: 'auto' }); measure(); } })
        .set(panels[i], { height: 0, autoAlpha: 1 }).to(panels[i], { height: 'auto', duration: 0.62, ease: 'osmo' })
        .to(linesOf(i), { autoAlpha: 1, yPercent: 0, duration: 0.48, ease: 'osmo', stagger: 0.045 }, '<0.18');
    };
    const toggle = i => { const next = expanded === i ? -1 : i, prev = expanded; expanded = next; if (prev !== -1 && prev !== next) close(prev, 0.62); next === -1 ? close(i) : openPanel(next); measure(); setTimeout(measure, 650); };
    items.forEach((it, i) => {
      const hover = () => expanded !== -1 ? (items.forEach((x, k) => x.dataset.active = k === i ? 'true' : 'false'), hovered = i, images.forEach((im, k) => k === i ? im.dataset.active = 'true' : delete im.dataset.active), measure()) : focusItem(i);
      if (finePointer) it.addEventListener('pointerenter', hover);
      it.addEventListener('focus', hover); it.addEventListener('click', () => { focusItem(i); toggle(i); });
    });
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, { passive: true });
    focusItem(0); expanded = 0; items[0].dataset.expanded = 'true'; items[0].setAttribute('aria-expanded', 'true');
    gsap.set(panels[0], { height: 'auto', autoAlpha: 1 }); gsap.set(copies[0], { autoAlpha: 1 }); gsap.set(linesOf(0), { autoAlpha: 1, yPercent: 0 });
    measure();
  }

  /* ---------- Testimonials / milestones slider ---------- */
  function initTestimonials(section) {
    const quotes = $$('[data-testimonial-quote]', section), people = $$('[data-testimonial-person]', section);
    const counter = $('[data-testimonials-counter]', section), bar = $('[data-testimonials-progress]', section), prev = $('[data-testimonials-prev]', section), next = $('[data-testimonials-next]', section);
    const n = quotes.length; if (n < 2 || !bar) return;
    const AUTO = 10, LOCK = 2000;
    let cur = 0, visible = false, locked = false, timer = null, autoTween = null;
    [...quotes, ...people].forEach((el, i) => gsap.set(el, { autoAlpha: i % n === 0 ? 1 : 0 }));
    const splits = reduced ? quotes.map(() => null) : quotes.map(q => { const s = SplitText.create($('p', q), { type: 'lines', mask: 'lines' }); return s.lines.length ? s : null; });
    const stopAuto = () => { autoTween?.kill(); autoTween = null; };
    const startAuto = () => { stopAuto(); gsap.set(bar, { scaleX: 0 }); if (reduced || !visible) return; autoTween = gsap.to(bar, { scaleX: 1, duration: AUTO, ease: 'none', onComplete: () => go(cur + 1) }); };
    const lock = () => { locked = true; prev.disabled = next.disabled = true; clearTimeout(timer); timer = setTimeout(() => { locked = false; prev.disabled = next.disabled = false; }, LOCK); };
    const go = idx => {
      const t = ((idx % n) + n) % n; if (t === cur) return; const f = cur; cur = t;
      counter.textContent = String(t + 1).padStart(2, '0');
      quotes[f].removeAttribute('data-active'); people[f].removeAttribute('data-active'); quotes[t].dataset.active = 'true'; people[t].dataset.active = 'true';
      quotes.forEach((q, i) => i !== f && i !== t && gsap.set(q, { autoAlpha: 0 })); people.forEach((p, i) => i !== f && i !== t && gsap.set(p, { autoAlpha: 0 }));
      const q0 = quotes[f], q1 = quotes[t], p0 = people[f], p1 = people[t], l0 = splits[f]?.lines, l1 = splits[t]?.lines;
      if (reduced) { gsap.set([q0, p0], { autoAlpha: 0 }); gsap.set([q1, p1], { autoAlpha: 1, y: 0 }); startAuto(); return; }
      gsap.killTweensOf([q0, q1, p0, p1]);
      if (l0 && l1) {
        gsap.killTweensOf([...l0, ...l1]); gsap.set([q0, q1], { autoAlpha: 1, y: 0 }); gsap.set(l1, { yPercent: 115 });
        gsap.to(l0, { yPercent: -115, duration: 0.7, ease: 'osmo', stagger: 0.06, onComplete: () => gsap.set(q0, { autoAlpha: 0 }) });
        gsap.to(l1, { yPercent: 0, duration: 0.9, ease: 'osmo', stagger: 0.06, delay: 0.3 });
      } else { gsap.to(q0, { autoAlpha: 0, y: -8, duration: 0.35, ease: 'osmo' }); gsap.fromTo(q1, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.3, ease: 'osmo' }); }
      gsap.to(p0, { y: -40, duration: 0.7, ease: 'osmo' }); gsap.to(p0, { autoAlpha: 0, duration: 0.3, ease: 'osmo' });
      gsap.fromTo(p1, { y: 48 }, { y: 0, duration: 0.7, delay: 0.3, ease: 'osmo' }); gsap.fromTo(p1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, delay: 0.55, ease: 'osmo' });
      startAuto();
    };
    prev.addEventListener('click', () => { if (!locked) { lock(); go(cur - 1); } });
    next.addEventListener('click', () => { if (!locked) { lock(); go(cur + 1); } });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? startAuto() : (stopAuto(), gsap.set(bar, { scaleX: 0 })); }, { threshold: 0.25 }).observe(section);
  }

  /* ---------- ASCII "J.": extruded 3D type rendered to text, turns toward the pointer ---------- */
  function initAscii(box) {
    const pre = $('[data-ascii]', box); if (!pre) return;
    const COLS = +box.dataset.asciiColumns || 146, ROWS = +box.dataset.asciiRows || 68;
    const CW = 3, CH = 5;                       // canvas px per character cell (6px mono glyph is ~0.6 wide)
    const W = COLS * CW, H = ROWS * CH;
    // Flat faces land on "c" like the reference; edges and sides pick up the other glyphs.
    const RAMP = ' .,:;i)(1t|uJXvYcccccccccCU[]';
    const MARK = 'J.';
    const DEPTH = Math.round(H * 0.09), LAYERS = 22, MAX_RY = 0.8, MAX_RX = 0.6;
    const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    let tx = 0, ty = 0, cx = 0, cy = 0, pointerSeen = false, running = false, raf = 0;
    const t0 = performance.now();
    const shade = v => `rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})`;
    // Pointer anywhere on the page: aim from the centre of the box toward it.
    const aim = e => {
      const r = box.getBoundingClientRect();
      tx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (innerWidth * 0.5));
      ty = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (innerHeight * 0.5));
      pointerSeen = true;
    };
    const draw = now => {
      const t = (now - t0) / 1000;
      const gx = pointerSeen ? tx : Math.sin(t * 0.5) * 0.5, gy = pointerSeen ? ty : Math.cos(t * 0.38) * 0.35;
      cx += (gx - cx) * 0.08; cy += (gy - cy) * 0.08;
      // Orthographic 3D: rotate the slab about X then Y and drop z.
      const ry = cx * MAX_RY, rx = -cy * MAX_RX;
      const cX = Math.cos(rx), sX = Math.sin(rx), cY = Math.cos(ry), sY = Math.sin(ry);
      const R = [                                // rows = rotated basis vectors (x, y, z)
        [cY, 0, sY],
        [sX * sY, cX, -sX * cY],
        [-cX * sY, sX, cX * cY],
      ];
      const ux = R[0][0], uy = R[1][0], vx = R[0][1], vy = R[1][1];          // face axes projected
      const nx = R[0][2], ny = R[1][2], nz = R[2][2];                        // face normal
      const L = [0.35, -0.45, 0.82];                                          // light from top-left-front
      const lambert = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const front = nz > 0;                                                    // back face shows if turned past 90°
      ctx.clearRect(0, 0, W, H);
      // "J." at the largest size that still leaves room for the slab to turn without clipping.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      let fs = H * 0.92;
      ctx.font = `700 ${fs}px "BDO Grotesk", Helvetica, Arial, sans-serif`;
      const tw = ctx.measureText(MARK).width;
      if (tw > W * 0.6) { fs *= (W * 0.6) / tw; ctx.font = `700 ${fs}px "BDO Grotesk", Helvetica, Arial, sans-serif`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const layer = (z, color) => {
        // Point on the slab at depth z (0 = front face, -DEPTH = back face)
        ctx.setTransform(ux, uy, vx, vy, W / 2 + nx * z, H / 2 + ny * z + H * 0.02);
        ctx.fillStyle = color; ctx.fillText(MARK, 0, 0);
      };
      const sideLum = 0.3 + 0.12 * Math.abs(sY) + 0.08 * Math.abs(sX);
      // Paint the slab far to near: side layers first, then whichever face is toward the viewer.
      for (let i = LAYERS; i > 0; i--) {
        layer(front ? -(i / LAYERS) * DEPTH : (i / LAYERS) * DEPTH - DEPTH, shade(sideLum - (i / LAYERS) * 0.06));
      }
      layer(front ? 0 : -DEPTH, shade(0.5 + 0.22 * lambert));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      let out = '';
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          let sum = 0;
          for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
            const p = ((y * CH + j) * W + x * CW + i) * 4; sum += d[p] * (d[p + 3] / 255);
          }
          const l = sum / (CW * CH * 255);
          out += RAMP[Math.min(RAMP.length - 1, Math.round(l * (RAMP.length - 1)))];
        }
        out += '\n';
      }
      pre.textContent = out;
      if (running) raf = requestAnimationFrame(draw);
    };
    const fit = () => { const r = box.getBoundingClientRect(); pre.style.transform = `scale(${gsap.utils.clamp(0.6, 2.2, Math.min(r.width / (COLS * 3.6), r.height / (ROWS * 6)))})`; };
    window.addEventListener('pointermove', aim, { passive: true });
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running && !raf) raf = requestAnimationFrame(draw); if (!running) { cancelAnimationFrame(raf); raf = 0; } }).observe(box);
    window.addEventListener('resize', fit); fit();
    if (reduced) { running = false; draw(performance.now()); }
  }

  /* ---------- Footer ---------- */
  function initFooter(block) {
    const inner = $('[data-footer-parallax-inner]', block), dark = $('[data-footer-parallax-dark]', block), bottom = $('[data-site-footer-bottom]', block), mark = $('[data-site-footer-wordmark]', block);
    gsap.timeline({ scrollTrigger: { trigger: block, start: 'clamp(top bottom)', end: 'clamp(top top)', scrub: true, invalidateOnRefresh: true } })
      .from(inner, { yPercent: -25, ease: 'none' }).from(dark, { opacity: 0.5, ease: 'none' }, '<');
    ScrollTrigger.create({ trigger: block, start: 'top top+=96', end: 'bottom top+=96', onToggle: t => { header.dataset.footerTheme = t.isActive ? 'active' : 'inactive'; body.dataset.footerTheme = t.isActive ? 'active' : 'inactive'; } });
    // Reveal lines once in view
    const rev = lineReveal($$('[data-footer-reveal-line]', block), { stagger: 0.045 });
    ScrollTrigger.create({ trigger: block, start: 'top 78%', once: true, onEnter: () => rev?.play() });
    // Live Shanghai time with blinking colon
    const timeEls = $$('[data-footer-live-time]', block);
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => { const [h, m] = fmt.format(new Date()).split(':'); timeEls.forEach(el => { el.innerHTML = `${h}<span class="site-footer__time-colon">:</span>${m} GMT+8`; }); };
    tick(); const iv = setInterval(() => block.isConnected ? tick() : clearInterval(iv), 1000);
    // Wordmark: binary-search the largest font-size that fits the width
    const spans = $$(':scope > span', mark);
    const fit = () => {
      const w = bottom.clientWidth; let lo = 16, hi = 2000, best = lo;
      while (lo <= hi) { const mid = (lo + hi) >> 1; mark.style.setProperty('--site-footer-wordmark-size', `${mid}px`); const gap = parseFloat(getComputedStyle(mark).columnGap) || 0; const tw = spans.reduce((a, s) => a + s.getBoundingClientRect().width, 0) + gap; if (tw <= w + 0.5) { best = mid; lo = mid + 1; } else hi = mid - 1; }
      mark.style.setProperty('--site-footer-wordmark-size', `${best}px`);
    };
    new ResizeObserver(fit).observe(bottom); document.fonts.ready.then(fit); fit();
  }

  /* ---------- Work detail page ---------- */
  function initWorkDetail(container) {
    header.dataset.sectionTheme = body.dataset.sectionTheme = 'active';
    header.dataset.footerTheme = body.dataset.footerTheme = 'inactive';
    const title = $('[data-work-detail-title]', container), visit = $('.wd-visit-fixed', container);
    const meta = $$('[data-wd-meta] .wd-meta__item', container), reveals = $$('[data-wd-reveal]', container), gallery = $$('[data-wd-gallery-item]', container);
    const lines = lineReveal([title]);
    if (!reduced) {
      gsap.set(meta, { autoAlpha: 0, yPercent: 30 }); gsap.set(reveals, { autoAlpha: 0, y: 32 }); gsap.set(gallery, { autoAlpha: 0, y: 24 });
      meta.length && ScrollTrigger.create({ trigger: meta[0].closest('[data-wd-meta]'), start: 'top 88%', once: true, onEnter: () => gsap.to(meta, { autoAlpha: 1, yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07 }) });
      reveals.forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out' }) }));
      gallery.forEach((el, i) => ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: (i % 2) * 0.08 }) }));
    }
    const hideVisit = on => visit?.classList.toggle('is--hidden', on);

    // "Next work": pinned for two screens, progress fills, then the page turns itself.
    const wrap = $('[data-scroll-next-wrap]', container);
    if (wrap && window.matchMedia('(min-width: 761px)').matches) {
      const link = $('[data-scroll-next-link]', wrap), fill = $('[data-scroll-next-path]', wrap), bg = $('[data-scroll-next-bg]', wrap), ov = $('[data-scroll-next-overlay]', wrap);
      const A = 0.82; let fired = false;
      fetchPage(link.href).catch(() => {});
      gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' });
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: wrap, start: 'top top', end: () => '+=' + innerHeight * 2, scrub: 0.1, pin: true } });
      tl.to(fill, { scaleX: 1, duration: A }).call(() => {
        if (fired || transitioning) return; fired = true;
        const st = tl.scrollTrigger;
        jump(st.start + (st.end - st.start) * A);
        gsap.set(fill, { scaleX: 1 }); bg && gsap.set(bg, { scale: 1.12 }); ov && gsap.set(ov, { opacity: 0.54 });
        gsap.set(link, { position: 'fixed', inset: 0, width: '100%', height: '100svh', zIndex: 50, overflow: 'hidden', pointerEvents: 'none', transform: 'none' });
        go(link.href, { trigger: link, before: () => {
          const k = st.start; st.kill();
          gsap.set(link, { clearProps: 'position,inset,top,left,right,bottom,width,height,zIndex,overflow,pointerEvents,transform' });
          gsap.set(wrap, { clearProps: 'position,top,left,width' });
          jump(k);
        } });
      }, null, '>').to({}, { duration: 1 - A });
      bg && tl.to(bg, { scale: 1.12, duration: A }, 0); ov && tl.to(ov, { opacity: 0.54, duration: A }, 0);
      new IntersectionObserver(([e]) => hideVisit(e.isIntersecting), { threshold: 0.01 }).observe(wrap);
      // Header steps aside while the next-work screen fills the viewport.
      const chrome = [$('.underlay-nav__logo'), $('[data-underlay-nav-toggle]')];
      const io = new IntersectionObserver(([e]) => {
        const on = e.isIntersecting;
        blurEl && gsap.to(blurEl, { '--blur-reveal': on ? 0 : 1, duration: on ? 0.3 : 0.45, ease: on ? 'power2.in' : 'power2.out', overwrite: 'auto' });
        gsap.to(chrome, { opacity: on ? 0 : 1, duration: 0.3, ease: 'power2.inOut', overwrite: 'auto' });
      }, { threshold: 0.99 });
      io.observe(wrap);
      pageCleanup = () => { io.disconnect(); gsap.set(chrome, { clearProps: 'opacity' }); blurEl && gsap.set(blurEl, { clearProps: '--blur-reveal' }); };
    }
    const mobileNext = $('[data-scroll-next-mobile]', container);
    if (mobileNext && !wrap?.offsetParent) new IntersectionObserver(es => hideVisit(es.some(e => e.isIntersecting)), { threshold: 0.05 }).observe(mobileNext);
    return { addTo: (tl, at) => lines?.addTo(tl, at), play: () => lines?.play() };
  }

  /* ---------- Page init dispatch ---------- */
  let mm = gsap.matchMedia(), staleMM = null, pageCleanup = () => {};
  const pageOf = () => $('main.page', main);
  const onHome = () => pageOf()?.dataset.page === 'home';
  // Returns { addTo(tl, at), play() } for the first reveal (loader or transition decides when).
  function initPage(container) {
    pageCleanup(); pageCleanup = () => {};
    ScrollTrigger.getAll().forEach(t => t.kill());
    // Reverting the old matchMedia context here would snap the leaving page back (orbit card shrinks,
    // labels vanish) while it is still on screen; go() reverts it once the old page is gone.
    staleMM = mm; mm = gsap.matchMedia();
    if (container.dataset.page !== 'home') return initWorkDetail(container);
    const hero = $('[data-hero-slideshow]', container); hero && initHeroSlideshow(hero);
    initHomeScroll(container);
    mm.add('(min-width: 901px)', () => { $$('[data-orbit-tiles-init]', container).forEach(s => { initOrbitTiles(s); initDirectionalHover(s); }); });
    $$('[data-mobile-works-gallery]', container).forEach(initMobileGallery);
    $$('[data-services-section]', container).forEach(initServices);
    $$('[data-testimonials]', container).forEach(initTestimonials);
    $$('[data-ascii-box]', container).forEach(initAscii);
    $$('[data-footer-parallax-block]', container).forEach(initFooter);
    const lines = lineReveal($$('[data-hero-reveal-line]', hero));
    return {
      addTo: (tl, at) => { tl.set(hero, { opacity: 1 }, at); lines?.addTo(tl, at); },
      play: () => { gsap.set(hero, { opacity: 1 }); lines?.play(); },
    };
  }

  /* ---------- Router + page transitions (ported from the reference's Barba setup) ---------- */
  const headerEl = $('.underlay-nav__header'), blurEl = $('[data-header-blur]'), menuEl = $('[data-underlay-nav-menu]');
  const cache = new Map();
  const fetchPage = url => { if (!cache.has(url)) cache.set(url, fetch(url).then(r => r.ok ? r.text() : Promise.reject(r.status))); return cache.get(url); };
  const pageURL = href => { try { const u = new URL(href, location.href); return u.origin === location.origin && /(\.html|\/)$/.test(u.pathname) ? u : null; } catch { return null; } };
  const homeURL = (hash = '') => new URL((location.pathname.includes('/work/') ? '../' : './') + (hash === '#top' ? '' : hash), location.href).href;
  const jump = y => lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
  const vh = () => Math.max(innerHeight, window.visualViewport?.height || 0);
  let transitioning = false;
  const headerFade = (tl, dir, at) => {
    const on = dir === 'in';
    tl.to(headerEl, { opacity: on ? 1 : 0, duration: 0.3, ease: 'power2.inOut', overwrite: 'auto' }, at);
    blurEl && tl.to(blurEl, { '--blur-reveal': on ? 1 : 0, duration: on ? 0.45 : 0.3, ease: on ? 'power2.out' : 'power2.in' }, at);
  };
  const menuClosed = () => new Promise(res => {
    if (body.dataset.menuStatus !== 'open') return res();
    const t = setTimeout(res, 1200);
    window.addEventListener('underlay-nav:closed', () => { clearTimeout(t); res(); }, { once: true });
    $('[data-underlay-nav-toggle]').click();
  });

  async function go(href, { push = true, trigger = null, before = null } = {}) {
    if (transitioning) return;
    const url = pageURL(href); if (!url) { location.assign(href); return; }
    transitioning = true; lenis?.stop();
    let html; try { html = await fetchPage(url.href.split('#')[0]); } catch { location.assign(href); return; }
    await menuClosed();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.querySelector('main.page'), cur = pageOf();
    if (push) history.pushState(null, '', url.href);   // before insert, so the new page's relative asset URLs resolve
    document.title = doc.title;
    body.dataset.pageTransition = 'active';
    before?.();
    menuEl && gsap.set(menuEl, { autoAlpha: 0 });
    const both = cur.dataset.page === 'work-detail' && next.dataset.page === 'work-detail';
    await (both ? sideBySide : sheet)(cur, next, trigger, url.hash);
    staleMM?.revert(); staleMM = null;
    menuEl && gsap.set(menuEl, { clearProps: 'opacity,visibility' });
    $$('[data-menu-link]').forEach(l => l.classList.toggle('w--current', l.getAttribute('href') === (onHome() ? '#top' : '#work')));
    body.dataset.pageTransition = '';
    lenis?.resize(); lenis?.start();
    ScrollTrigger.refresh();
    const visit = $('.wd-visit-fixed', next); visit && gsap.fromTo(visit, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, delay: 0.05, ease: 'power2.out', clearProps: 'opacity,visibility' });
    transitioning = false;
  }

  // Default: the old page and a strawberry sheet slide down as stacked cards while the new page scales up beneath.
  function sheet(cur, next, _trigger, hash) {
    const sy = window.scrollY, h = Math.max(cur.getBoundingClientRect().height, sy + vh());
    ScrollTrigger.getAll().forEach(t => t.kill());
    const d = document.createElement('div'); body.appendChild(d); d.appendChild(cur);
    const mid = $('[data-transition-middle]');
    const oldHero = $('.home-hero', cur); oldHero && gsap.set(oldHero, { top: sy });   // fixed hero becomes container-relative once wrapped
    gsap.set(main, { zIndex: 0, overflow: 'clip', minHeight: h });
    gsap.set(d, { position: 'fixed', top: 0, left: 0, right: 0, width: '100%', height: vh(), overflow: 'clip', backgroundColor: 'var(--color-alabaster-grey)', zIndex: 3, willChange: 'transform', clipPath: 'rect(0% 100% 100% 0% round 0em)' });
    gsap.set(cur, { position: 'absolute', top: -sy, left: 0, width: '100%', height: h, willChange: 'transform, opacity', backfaceVisibility: 'hidden' });
    gsap.set(mid, { willChange: 'transform, opacity', autoAlpha: 0, yPercent: 0, scale: 1, clipPath: 'rect(0% 100% 100% 0% round 0em)' });
    main.appendChild(next);
    const anchor = hash && hash !== '#top' ? $(hash, next) : null;
    const top = anchor ? Math.round(anchor.getBoundingClientRect().top - next.getBoundingClientRect().top) : 0;
    gsap.set(next, { position: 'fixed', top: 0, left: 0, right: 0, width: '100%', height: '100vh', overflow: top ? 'hidden' : 'clip', zIndex: 1, willChange: 'transform, opacity', backfaceVisibility: 'hidden', autoAlpha: 1, yPercent: 0, scale: 1, clipPath: 'rect(0% 100% 100% 0% round 0em)' });
    const entry = initPage(next);
    if (top) next.scrollTop = top;
    const tl = gsap.timeline();
    headerFade(tl, 'out', 0);
    tl.set(mid, { autoAlpha: 1 }, 0)
      .to([d, mid, next], { clipPath: 'rect(0% 100% 100% 0% round 1em)', duration: 0.8 }, 0)
      .call(() => { const hero = $('.home-hero', next); hero && gsap.set(hero, { opacity: 1 }); }, null, 0)
      .to(d, { scale: 0.95, yPercent: 20, duration: 1.2, ease: 'expo.inOut', overwrite: 'auto' }, '<')
      .to(mid, { scale: 0.875, yPercent: 10, duration: 1.2, ease: 'expo.inOut', overwrite: 'auto' }, '<')
      .to(next, { scale: 0.8, yPercent: 0, duration: 1.2, ease: 'expo.inOut', overwrite: 'auto' }, '<')
      .to(d, { yPercent: 130, duration: 1.2, ease: 'osmo' }, '< 0.9')
      .to(mid, { yPercent: 120, duration: 1.2, ease: 'osmo' }, '< 0.15')
      .to(next, { scale: 1, yPercent: 0, duration: 1.2, ease: 'expo.inOut', overwrite: 'auto' }, '< 0.15')
      .call(() => entry.play(), null, 1.65)
      .to([d, mid, next], { clipPath: 'rect(0% 100% 100% 0% round 0em)', duration: 0.8, ease: 'osmo' }, '> -0.8');
    headerFade(tl, 'in', '>');
    return new Promise(res => tl.eventCallback('onComplete', () => requestAnimationFrame(() => {
      d.remove();
      gsap.set(main, { clearProps: 'overflow,zIndex,minHeight' });
      if (top) next.scrollTop = 0;
      gsap.set(next, { clearProps: 'all' });
      gsap.set(mid, { autoAlpha: 0, yPercent: 0, scale: 1, clearProps: 'willChange,clipPath' });
      jump(top);
      res();
    })));
  }

  // Work → work: the current page recedes and slides out, the next one slides in from the side.
  function sideBySide(cur, next, trigger) {
    const dir = trigger?.closest?.('[data-work-detail-direction="previous"]') ? -1 : 1;
    const sy = window.scrollY, h = Math.max(cur.getBoundingClientRect().height, sy + vh());
    ScrollTrigger.getAll().forEach(t => t.kill());
    const u = document.createElement('div'); main.insertBefore(u, cur); u.appendChild(cur);
    gsap.set(main, { perspective: '100vw', transformStyle: 'preserve-3d', overflow: 'clip', minHeight: h, perspectiveOrigin: `50% ${sy + vh() / 2}px` });
    gsap.set(u, { position: 'fixed', top: sy, left: 0, right: 0, width: '100%', height: vh(), overflow: 'clip', zIndex: 2, backgroundColor: 'var(--color-alabaster-grey)', transformStyle: 'preserve-3d', willChange: 'transform', clipPath: 'rect(0% 100% 100% 0% round 0em)' });
    gsap.set(cur, { position: 'absolute', top: -sy, left: 0, width: '100%', height: h, willChange: 'transform, opacity', backfaceVisibility: 'hidden' });
    main.appendChild(next);
    gsap.set(next, { position: 'fixed', top: sy, left: 0, right: 0, width: '100%', height: vh(), overflow: 'clip', zIndex: 1, transformStyle: 'preserve-3d', willChange: 'transform, opacity', backfaceVisibility: 'hidden', xPercent: 175 * dir, z: '-100vw', autoAlpha: 1, clipPath: 'rect(0% 100% 100% 0% round 1.5em)' });
    $$('.wd-visit-fixed').forEach(v => gsap.set(v, { autoAlpha: 0 }));
    const entry = initPage(next);
    const tl = gsap.timeline({ defaults: { ease: 'osmo' } });
    tl.to(u, { z: '-100vw', duration: 0.9, clipPath: 'rect(0% 100% 100% 0% round 1.5em)' }, 0)
      .to(u, { xPercent: -175 * dir, duration: 1, overwrite: 'auto' }, 0.25)
      .to(next, { xPercent: 0, duration: 1, overwrite: 'auto' }, '<')
      .to(next, { z: 0, duration: 0.9, overwrite: 'auto', clipPath: 'rect(0% 100% 100% 0% round 0em)' }, '>-=0.4');
    return new Promise(res => tl.eventCallback('onComplete', () => {
      u.remove();
      gsap.set(main, { clearProps: 'perspective,transformStyle,perspectiveOrigin,overflow,minHeight' });
      gsap.set(next, { clearProps: 'all' });
      jump(0);
      entry.play();
      res();
    }));
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initNav(); initLinks();
    history.scrollRestoration = 'manual';
    initLoader(initPage(pageOf()));
  });
})();
