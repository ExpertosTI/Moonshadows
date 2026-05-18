/* ============================================================
   MOONSHADOWS — Cinematic, interaction-first v4.7
   Lighting model (manual, no scroll-triggered toggles):
     Scene 0 — body.is-lit reveals the moon. Click on title/lamp toggles.
     Scene 1 — independent. Cards stay dim; clicked card adds .is-open.
               Body class .cards-active drives a subtle ambient glow.
     Scene 2 — always lit (CSS hardcoded).
     Scene 3 — body.is-lit drives brightness. Entry stagger via [data-stage="3"].
   Scroll is fully user-controlled — no programmatic scrollIntoView on card click.
   ============================================================ */

(() => {
  const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const root = document.documentElement;
  const body = document.body;

  /* ── Cursor / torch tracking (desktop only) ─────────────── */
  if (!isTouch) {
    let raf = 0, mx = innerWidth / 2, my = innerHeight / 2;
    const update = () => {
      root.style.setProperty('--mx', mx + 'px');
      root.style.setProperty('--my', my + 'px');
      raf = 0;
    };
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    addEventListener('blur',  () => body.classList.add('cursor-out'));
    addEventListener('focus', () => body.classList.remove('cursor-out'));
  }

  /* ── Light toggle (Scene 0 + Scene 3 only) ─────────────── */
  const lightToggle = document.getElementById('light-toggle');
  const setLight = (on) => {
    body.classList.toggle('is-lit', !!on);
    if (lightToggle) {
      lightToggle.setAttribute('aria-label', on ? 'Apagar luz' : 'Encender luz');
    }
  };
  const toggleLight = () => setLight(!body.classList.contains('is-lit'));

  /* ── Stage tracking (no auto-light, just dot updates) ───── */
  const scenes = [...document.querySelectorAll('.scene')];
  const dots = [...document.querySelectorAll('.progress__dot')];

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      // Pick the entry with the largest intersection ratio that's intersecting.
      let best = null;
      entries.forEach((e) => {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
      });
      if (best && best.intersectionRatio > 0.25) {
        const s = best.target.dataset.scene;
        body.dataset.stage = s;
        dots.forEach((d) => d.classList.toggle('is-active', d.dataset.go === s));
      }
    }, { threshold: [0.25, 0.5, 0.75] });
    scenes.forEach((s) => io.observe(s));
  }

  /* ── Lamp / ignite click (Scene 0 only) ─────────────────── */
  const igniteScene = document.getElementById('scene-0');
  if (igniteScene) {
    igniteScene.addEventListener('click', (e) => {
      if (e.target.closest('a, button:not(.ignite__title)')) return;
      toggleLight();
    });
  }
  const lampSvg = document.getElementById('lamp-switch');
  if (lampSvg) {
    lampSvg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLight(); }
    });
  }

  /* ── Lamp beckoning — attract user after 4s of dark idle ── */
  let lampBeckonTimer = null;
  const startBeckon = () => {
    clearTimeout(lampBeckonTimer);
    lampBeckonTimer = setTimeout(() => {
      if (!body.classList.contains('is-lit') && body.dataset.stage === '0') {
        body.classList.add('lamp-beckoning');
      }
    }, 4000);
  };
  const stopBeckon = () => {
    clearTimeout(lampBeckonTimer);
    body.classList.remove('lamp-beckoning');
  };
  // Remove once user interacts with lamp
  const originalToggleLight = toggleLight;
  document.addEventListener('DOMContentLoaded', startBeckon);
  if (document.readyState !== 'loading') startBeckon();
  igniteScene && igniteScene.addEventListener('click', stopBeckon);
  lightToggle && lightToggle.addEventListener('click', stopBeckon);

  /* Nav lamp button — works from any scene */
  if (lightToggle) {
    lightToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLight();
    });
  }

  /* Progress dots — explicit user navigation, smooth allowed */
  dots.forEach((d) => {
    d.addEventListener('click', () => {
      const target = document.getElementById('scene-' + d.dataset.go);
      target?.scrollIntoView({ behavior: prefersReduce ? 'auto' : 'smooth' });
    });
  });

  /* Anchors */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduce ? 'auto' : 'smooth' });
      }
    });
  });

  /* ── Service cards (Scene 1) ───────────────────────────── */
  const nodes = [...document.querySelectorAll('.node')];

  const syncCardsActive = () => {
    body.classList.toggle('cards-active', !!document.querySelector('.node.is-open'));
  };

  const openNode = (node) => {
    if (!node) return;
    const wasOpen = node.classList.contains('is-open');
    nodes.forEach((n) => {
      n.classList.remove('is-open');
      n.querySelector('.node__head')?.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      node.classList.add('is-open');
      node.querySelector('.node__head')?.setAttribute('aria-expanded', 'true');
    }
    syncCardsActive();
    // NOTE: no scrollIntoView — user controls scroll. Cards are tall enough
    // that the open one is visible from any reasonable click position.
  };

  nodes.forEach((node) => {
    const head = node.querySelector('.node__head');
    head?.addEventListener('click', () => openNode(node));

    if (!isTouch) {
      node.addEventListener('pointermove', (e) => {
        const r = node.getBoundingClientRect();
        node.style.setProperty('--nx', (e.clientX - r.left) + 'px');
        node.style.setProperty('--ny', (e.clientY - r.top) + 'px');
      }, { passive: true });
      node.addEventListener('pointerleave', () => {
        node.style.removeProperty('--nx');
        node.style.removeProperty('--ny');
      });
    }
  });

  /* ── Magnetic CTA ────────────────────────────────────────── */
  if (!isTouch && !prefersReduce) {
    document.querySelectorAll('.magnet').forEach((el) => {
      const inner = el.querySelector('.magnet__inner') || el;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        inner.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
      }, { passive: true });
      el.addEventListener('pointerleave', () => { inner.style.transform = ''; });
    });
  }

  /* ── Floating dust ───────────────────────────────────────── */
  if (!prefersReduce) {
    const dust = document.getElementById('dust');
    if (dust) {
      const n = matchMedia('(max-width: 700px)').matches ? 10 : 22;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.style.left = (Math.random() * 100) + '%';
        s.style.setProperty('--dur', (16 + Math.random() * 16) + 's');
        s.style.setProperty('--del', (-Math.random() * 20) + 's');
        s.style.transform = `scale(${0.6 + Math.random() * 1.2})`;
        frag.appendChild(s);
      }
      dust.appendChild(frag);
    }
  }

  /* ── Mobile touch flashlight (Scene 0 + Scene 1) ─────────── */
  if (isTouch) {
    const touchLight = document.querySelector('.touch-light');
    if (touchLight) {
      let tRaf = 0, tx = 0, ty = 0;
      const flush = () => {
        root.style.setProperty('--tx', tx + 'px');
        root.style.setProperty('--ty', ty + 'px');
        tRaf = 0;
      };
      const updateGate = () => {
        const stage = body.dataset.stage || '0';
        const dark = (stage === '0' && !body.classList.contains('is-lit')) ||
                     (stage === '1' && !body.classList.contains('cards-active'));
        body.classList.toggle('touch-on-dark', dark);
      };
      addEventListener('touchstart', (e) => {
        const t = e.touches?.[0]; if (!t) return;
        tx = t.clientX; ty = t.clientY;
        if (!tRaf) tRaf = requestAnimationFrame(flush);
        updateGate();
        body.classList.add('is-touching');
        const node = e.target.closest?.('.node');
        if (node && !node.classList.contains('is-open')) {
          node.classList.add('is-touched');
        }
      }, { passive: true });
      addEventListener('touchmove', (e) => {
        const t = e.touches?.[0]; if (!t) return;
        tx = t.clientX; ty = t.clientY;
        if (!tRaf) tRaf = requestAnimationFrame(flush);
      }, { passive: true });
      const onEnd = () => {
        body.classList.remove('is-touching');
        document.querySelectorAll('.node.is-touched').forEach((n) => {
          setTimeout(() => n.classList.remove('is-touched'), 320);
        });
      };
      addEventListener('touchend',   onEnd, { passive: true });
      addEventListener('touchcancel', onEnd, { passive: true });

      const mo = new MutationObserver(updateGate);
      mo.observe(body, { attributes: true, attributeFilter: ['data-stage', 'class'] });
      updateGate();
    }
  }

  /* ── Keyboard nav ────────────────────────────────────────── */
  let busy = false;
  const goToScene = (n) => {
    if (busy || n < 0 || n > 3) return;
    busy = true;
    document.getElementById('scene-' + n)?.scrollIntoView({
      behavior: prefersReduce ? 'auto' : 'smooth'
    });
    setTimeout(() => { busy = false; }, 600);
  };
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return;
    const cur = parseInt(body.dataset.stage || '0', 10);
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goToScene(cur + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); goToScene(cur - 1); }
    if (e.key === 'Home') { e.preventDefault(); goToScene(0); }
    if (e.key === 'End')  { e.preventDefault(); goToScene(3); }
    if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); toggleLight();
    }
  });
})();
