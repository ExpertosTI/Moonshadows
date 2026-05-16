/* ============================================================
   MOONSHADOWS — Cinematic, interaction-first v3
   ============================================================ */

(() => {
  const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  const root = document.documentElement;
  const body = document.body;

  /* ── Cursor / torch tracking ──────────────────────────── */
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
    document.addEventListener('pointerleave', () => body.classList.add('cursor-out'));
    document.addEventListener('pointerenter', () => body.classList.remove('cursor-out'));
  }

  /* ── Stage tracking ───────────────────────────────────── */
  const scenes = [...document.querySelectorAll('.scene')];
  const dots = [...document.querySelectorAll('.progress__dot')];

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.4) {
          const s = e.target.dataset.scene;
          body.dataset.stage = s;
          dots.forEach((d) => d.classList.toggle('is-active', d.dataset.go === s));
        }
      });
    }, { threshold: [0.4, 0.6] });
    scenes.forEach((s) => io.observe(s));
  }

  /* ── Light toggle (works from anywhere) ──────────────── */
  const toggleLight = () => { body.classList.toggle('is-lit'); };

  /* Lamp / ignite area */
  const igniteArea = document.querySelector('.ignite');
  if (igniteArea) {
    igniteArea.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLight();
    });
  }
  const lampSvg = document.getElementById('lamp-switch');
  if (lampSvg) {
    lampSvg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLight(); }
    });
  }

  /* Dedicated nav toggle button — works from any scene */
  const lightToggle = document.getElementById('light-toggle');
  if (lightToggle) {
    lightToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLight();
      // Update label
      lightToggle.setAttribute('aria-label',
        body.classList.contains('is-lit') ? 'Apagar luz' : 'Encender luz');
    });
  }

  /* Progress dots */
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

  /* ── Node accordion + cursor spotlight ────────────────── */
  const nodes = [...document.querySelectorAll('.node')];

  const openNode = (node, focus = false) => {
    if (!node) return;
    const wasOpen = node.classList.contains('is-open');
    // Close siblings
    nodes.forEach((n) => {
      n.classList.remove('is-open');
      n.querySelector('.node__head')?.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      node.classList.add('is-open');
      node.querySelector('.node__head')?.setAttribute('aria-expanded', 'true');
      if (focus) {
        setTimeout(() => {
          /* Always scroll to bring the node into a comfortable reading position */
          node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
      }
    }
  };

  nodes.forEach((node) => {
    const head = node.querySelector('.node__head');
    if (head) {
      head.addEventListener('click', () => openNode(node, true));
    }

    /* Cursor-tracking spotlight (desktop only) */
    if (!isTouch) {
      node.addEventListener('pointermove', (e) => {
        const r = node.getBoundingClientRect();
        node.style.setProperty('--nx', (e.clientX - r.left) + 'px');
        node.style.setProperty('--ny', (e.clientY - r.top) + 'px');
      });
      node.addEventListener('pointerleave', () => {
        node.style.removeProperty('--nx');
        node.style.removeProperty('--ny');
      });
    }
  });

  /* Shards no longer exist as separate elements — they're the node head labels now */

  /* ── Magnetic CTA ─────────────────────────────────────── */
  if (!isTouch && !prefersReduce) {
    document.querySelectorAll('.magnet').forEach((el) => {
      const inner = el.querySelector('.magnet__inner') || el;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        inner.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { inner.style.transform = ''; });
    });
  }

  /* ── Floating dust ────────────────────────────────────── */
  if (!prefersReduce) {
    const dust = document.getElementById('dust');
    const n = matchMedia('(max-width: 700px)').matches ? 12 : 26;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.setProperty('--dur', (16 + Math.random() * 16) + 's');
      s.style.setProperty('--del', (-Math.random() * 20) + 's');
      s.style.transform = `scale(${0.6 + Math.random() * 1.2})`;
      dust?.appendChild(s);
    }
  }

  /* ── Keyboard nav ─────────────────────────────────────── */
  let busy = false;
  const goToScene = (n) => {
    if (busy || n < 0 || n > 2) return;
    busy = true;
    document.getElementById('scene-' + n)?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => busy = false, 600);
  };
  addEventListener('keydown', (e) => {
    // Don't hijack typing
    if (e.target.matches('input, textarea')) return;
    const cur = parseInt(body.dataset.stage || '0', 10);
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goToScene(cur + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); goToScene(cur - 1); }
    if (e.key === 'Home') { e.preventDefault(); goToScene(0); }
    if (e.key === 'End')  { e.preventDefault(); goToScene(2); }
    /* L key toggles light */
    if (e.key === 'l' || e.key === 'L') {
      if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); toggleLight(); }
    }
  });
})();
