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

  /* ── Sentinel Telemetry Engine ────────────────────────── */
  const Sentinel = {
    getStats() {
      const defaultStats = {
        session_id: '',
        clicks: { whatsapp: 0, cta: 0, services: 0, email: 0, themeToggle: 0 },
        time: { scene_0: 0, scene_1: 0, scene_2: 0, scene_3: 0, total: 0 },
        maxScroll: 0,
        nodeOpenDuration: { node_0: 0, node_1: 0, node_2: 0, node_3: 0 },
        heatpoints: [],
        device: {
          screen: `${innerWidth}x${innerHeight}`,
          ua: navigator.userAgent.substring(0, 80),
          lang: navigator.language
        },
        activeTime: 0,
        idleTime: 0
      };
      try {
        const stats = JSON.parse(localStorage.getItem('ms_sentinel_stats')) || defaultStats;
        return {
          ...defaultStats,
          ...stats,
          clicks: { ...defaultStats.clicks, ...(stats.clicks || {}) },
          time: { ...defaultStats.time, ...(stats.time || {}) },
          nodeOpenDuration: { ...defaultStats.nodeOpenDuration, ...(stats.nodeOpenDuration || {}) }
        };
      } catch {
        return defaultStats;
      }
    },
    saveStats(stats) {
      localStorage.setItem('ms_sentinel_stats', JSON.stringify(stats));
    },
    trackClick(category) {
      const stats = this.getStats();
      if (stats.clicks[category] !== undefined) {
        stats.clicks[category]++;
      } else {
        stats.clicks[category] = 1;
      }
      this.saveStats(stats);
      this.sync();
    },
    trackTime(scene, seconds, isIdle) {
      const stats = this.getStats();
      const key = `scene_${scene}`;
      if (stats.time[key] !== undefined) {
        stats.time[key] += seconds;
        stats.time.total += seconds;
      }
      if (isIdle) {
        stats.idleTime = (stats.idleTime || 0) + seconds;
      } else {
        stats.activeTime = (stats.activeTime || 0) + seconds;
      }
      
      const openNodeEl = document.querySelector('.node.is-open');
      if (openNodeEl) {
        const nodeId = openNodeEl.dataset.node || '0';
        const nodeKey = `node_${nodeId}`;
        if (!stats.nodeOpenDuration) stats.nodeOpenDuration = {};
        stats.nodeOpenDuration[nodeKey] = (stats.nodeOpenDuration[nodeKey] || 0) + seconds;
      }
      
      this.saveStats(stats);
    },
    trackScroll(sceneNum) {
      const stats = this.getStats();
      if (sceneNum > stats.maxScroll) {
        stats.maxScroll = sceneNum;
        this.saveStats(stats);
        this.sync();
      }
    },
    trackHeatpoint(x, y, tag) {
      const stats = this.getStats();
      if (!stats.heatpoints) stats.heatpoints = [];
      stats.heatpoints.push({ x, y, tag, time: Date.now() });
      if (stats.heatpoints.length > 15) stats.heatpoints.shift();
      this.saveStats(stats);
      this.sync();
    },
    async init() {
      const stats = this.getStats();
      let isNewSession = false;
      if (!stats.session_id) {
        stats.session_id = 'ms_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        this.saveStats(stats);
        isNewSession = true;
      }
      if (isNewSession) {
        try {
          await fetch('/api/insforge/leads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              project_id: 'moonshadows',
              channel: 'telemetry',
              contact_value: `Session:${stats.session_id}`,
              metadata: stats,
              created_at: new Date().toISOString()
            })
          });
        } catch (err) {
          console.warn('Insforge lead init warning:', err);
        }
      } else {
        this.sync();
      }
      
      setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.sync();
        }
      }, 10000);
    },
    async sync() {
      const stats = this.getStats();
      try {
        await fetch(`/api/insforge/leads?contact_value=eq.Session:${stats.session_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            metadata: stats
          })
        });
      } catch (err) {
        console.warn('Insforge sync error:', err);
      }
    }
  };

  Sentinel.init();

  let lastActivityTime = Date.now();
  const recordActivity = () => { lastActivityTime = Date.now(); };
  addEventListener('pointermove', recordActivity, { passive: true });
  addEventListener('keydown', recordActivity, { passive: true });
  addEventListener('scroll', recordActivity, { passive: true });
  addEventListener('click', recordActivity, { passive: true });

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
        Sentinel.trackScroll(parseInt(s, 10));
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
  /* ── Sentinel Dwell Time Clock (Passive every second) ──── */
  setInterval(() => {
    const activeStage = body.dataset.stage || '0';
    const isIdle = (Date.now() - lastActivityTime) > 5000;
    Sentinel.trackTime(activeStage, 1, isIdle);
  }, 1000);

  /* ── Sentinel Click Event Capture ───────────────────────── */
  addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    
    // Capture heatpoints
    Sentinel.trackHeatpoint(e.clientX, e.clientY, target.tagName.toLowerCase());
    
    if (target.closest('a[href*="wa.me"]')) {
      Sentinel.trackClick('whatsapp');
    } else if (target.closest('.nav__brand, .nav__cta, .magnet, .chip')) {
      Sentinel.trackClick('cta');
    } else if (target.closest('.node__head')) {
      Sentinel.trackClick('services');
    } else if (target.closest('a[href^="mailto:"]')) {
      Sentinel.trackClick('email');
    } else if (target.closest('#light-toggle')) {
      Sentinel.trackClick('themeToggle');
    }
  }, { passive: true });

  /* ── Sentinel Dashboard UI Controller ────────────────────── */
  const sentinelDash = document.getElementById('sentinel-dashboard');
  const sentinelClose = document.getElementById('sentinel-close');
  const sentinelReset = document.getElementById('sentinel-reset');

  let activeTab = 'session'; // 'session' or 'global'

      const res = await fetch('/api/insforge/leads?project_id=eq.moonshadows&limit=200', {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Insforge HTTP error');
      const leads = await res.json();
      
      if (!leads || leads.length === 0) {
        const coordsEl = document.getElementById('sentinel-heat-coords');
        if (coordsEl) coordsEl.textContent = 'sin datos registrados';
        return;
      }
      
      const global = {
        clicks: { whatsapp: 0, cta: 0, services: 0 },
        time: { scene_0: 0, scene_1: 0, scene_2: 0, scene_3: 0, total: 0 },
        maxScroll: 0,
        activeTime: 0,
        idleTime: 0,
        totalSessions: leads.length,
        heatpointsCount: 0
      };
      
      leads.forEach(lead => {
        const meta = lead.metadata || {};
        if (meta.clicks) {
          global.clicks.whatsapp += (meta.clicks.whatsapp || 0);
          global.clicks.cta += (meta.clicks.cta || 0);
          global.clicks.services += (meta.clicks.services || 0);
        }
        if (meta.time) {
          global.time.scene_0 += (meta.time.scene_0 || 0);
          global.time.scene_1 += (meta.time.scene_1 || 0);
          global.time.scene_2 += (meta.time.scene_2 || 0);
          global.time.scene_3 += (meta.time.scene_3 || 0);
          global.time.total += (meta.time.total || 0);
        }
        if (meta.maxScroll > global.maxScroll) {
          global.maxScroll = meta.maxScroll;
        }
        global.activeTime += (meta.activeTime || 0);
        global.idleTime += (meta.idleTime || 0);
        if (meta.heatpoints) {
          global.heatpointsCount += meta.heatpoints.length;
        }
      });
      
      document.getElementById('sentinel-stat-wa').textContent = global.clicks.whatsapp;
      document.getElementById('sentinel-stat-cta').textContent = global.clicks.cta;
      document.getElementById('sentinel-stat-services').textContent = global.clicks.services;
      document.getElementById('sentinel-stat-total').textContent = `${global.time.total}s`;
      document.getElementById('sentinel-stat-scroll').textContent = `Scene ${global.maxScroll}`;
      
      const maxTime = Math.max(global.time.scene_0, global.time.scene_1, global.time.scene_2, global.time.scene_3, 1);
      for (let i = 0; i <= 3; i++) {
        const sec = global.time[`scene_${i}`];
        const pct = (sec / maxTime) * 100;
        const fillEl = document.getElementById(`sentinel-bar-s${i}`);
        const valEl = document.getElementById(`sentinel-val-s${i}`);
        if (fillEl) fillEl.style.width = `${pct}%`;
        if (valEl) valEl.textContent = `${sec}s`;
      }
      
      const depthPct = (global.maxScroll / 3) * 100;
      const depthEl = document.getElementById('sentinel-radial-depth');
      const lblEl = document.getElementById('sentinel-radial-lbl');
      if (depthEl) depthEl.setAttribute('stroke-dasharray', `${depthPct}, 100`);
      if (lblEl) lblEl.textContent = `${Math.round(depthPct)}%`;
      
      document.getElementById('sentinel-stat-device').textContent = `${global.totalSessions} Visitas`;
      document.getElementById('sentinel-stat-active').textContent = `${global.activeTime}s`;
      document.getElementById('sentinel-stat-last-click').textContent = 'Global';
      
      const coordsEl = document.getElementById('sentinel-heat-coords');
      if (coordsEl) coordsEl.textContent = `${global.heatpointsCount} clicks registrados globalmente`;
      
    } catch (err) {
      console.error(err);
      const coordsEl = document.getElementById('sentinel-heat-coords');
      if (coordsEl) coordsEl.textContent = 'error cargando datos';
    }
  };

  const renderSentinel = () => {
    if (activeTab === 'global') {
      fetchAndRenderGlobal();
      return;
    }

    const stats = Sentinel.getStats();

    // 1. Text values
    document.getElementById('sentinel-stat-wa').textContent = stats.clicks.whatsapp;
    document.getElementById('sentinel-stat-cta').textContent = stats.clicks.cta;
    document.getElementById('sentinel-stat-services').textContent = stats.clicks.services;
    document.getElementById('sentinel-stat-total').textContent = `${stats.time.total}s`;
    document.getElementById('sentinel-stat-scroll').textContent = `Scene ${stats.maxScroll}`;

    // 2. Click Conversion SVG Bar Chart
    const maxClick = Math.max(stats.clicks.whatsapp, stats.clicks.cta, stats.clicks.services, 1);
    const hWa = (stats.clicks.whatsapp / maxClick) * 30;
    const hCta = (stats.clicks.cta / maxClick) * 30;
    const hSrv = (stats.clicks.services / maxClick) * 30;

    const rWa = document.getElementById('sentinel-chart-bar-wa');
    const rCta = document.getElementById('sentinel-chart-bar-cta');
    const rSrv = document.getElementById('sentinel-chart-bar-srv');

    if (rWa && rCta && rSrv) {
      rWa.setAttribute('height', hWa);
      rWa.setAttribute('y', 35 - hWa);
      rCta.setAttribute('height', hCta);
      rCta.setAttribute('y', 35 - hCta);
      rSrv.setAttribute('height', hSrv);
      rSrv.setAttribute('y', 35 - hSrv);
    }

    // 3. Dwell Time proportional bars
    const maxTime = Math.max(stats.time.scene_0, stats.time.scene_1, stats.time.scene_2, stats.time.scene_3, 1);
    for (let i = 0; i <= 3; i++) {
      const sec = stats.time[`scene_${i}`];
      const pct = (sec / maxTime) * 100;
      const fillEl = document.getElementById(`sentinel-bar-s${i}`);
      const valEl = document.getElementById(`sentinel-val-s${i}`);
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (valEl) valEl.textContent = `${sec}s`;
    }

    // 4. Scroll depth circle dasharray
    const depthPct = (stats.maxScroll / 3) * 100;
    const depthEl = document.getElementById('sentinel-radial-depth');
    const lblEl = document.getElementById('sentinel-radial-lbl');
    if (depthEl) depthEl.setAttribute('stroke-dasharray', `${depthPct}, 100`);
    if (lblEl) lblEl.textContent = `${Math.round(depthPct)}%`;

    // 5. Card 4: Devices & Heatmap
    const deviceValEl = document.getElementById('sentinel-stat-device');
    const activeValEl = document.getElementById('sentinel-stat-active');
    const lastClickValEl = document.getElementById('sentinel-stat-last-click');
    const heatCoordsEl = document.getElementById('sentinel-heat-coords');

    if (deviceValEl) {
      const isMobile = matchMedia('(hover: none), (pointer: coarse)').matches;
      deviceValEl.textContent = isMobile ? 'Móvil (Touch)' : 'Escritorio';
    }
    if (activeValEl) {
      activeValEl.textContent = `${stats.activeTime || 0}s`;
    }
    if (lastClickValEl) {
      if (stats.heatpoints && stats.heatpoints.length > 0) {
        const last = stats.heatpoints[stats.heatpoints.length - 1];
        lastClickValEl.textContent = `<${last.tag}> (${last.x}, ${last.y})`;
      } else {
        lastClickValEl.textContent = 'Ninguno';
      }
    }
    if (heatCoordsEl) {
      if (stats.heatpoints && stats.heatpoints.length > 0) {
        heatCoordsEl.innerHTML = stats.heatpoints
          .map(hp => `<span style="background: rgba(212,175,55,0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(212,175,55,0.3);">${hp.x},${hp.y}</span>`)
          .join(' ');
      } else {
        heatCoordsEl.textContent = 'esperando interacción...';
      }
    }
  };

  const tabSessionBtn = document.getElementById('sentinel-tab-session');
  const tabGlobalBtn = document.getElementById('sentinel-tab-global');

  if (tabSessionBtn && tabGlobalBtn) {
    tabSessionBtn.addEventListener('click', () => {
      activeTab = 'session';
      tabSessionBtn.classList.add('is-active');
      tabGlobalBtn.classList.remove('is-active');
      renderSentinel();
    });
    tabGlobalBtn.addEventListener('click', () => {
      activeTab = 'global';
      tabGlobalBtn.classList.add('is-active');
      tabSessionBtn.classList.remove('is-active');
      renderSentinel();
    });
  }

  /* ── Sentinel PIN Verification & Dashboard Toggle ───────── */
  const pinPadEl = document.getElementById('sentinel-pinpad');
  const pinCancelBtn = document.getElementById('sentinel-pinpad-cancel');
  const pinDots = [...document.querySelectorAll('.pin-dot')];
  let enteredPin = '';

  const resetPinPad = () => {
    enteredPin = '';
    if (pinPadEl) pinPadEl.classList.remove('is-error');
    pinDots.forEach(dot => dot.classList.remove('is-active'));
  };

  const processPinDigit = (digit) => {
    if (enteredPin.length < 6) {
      enteredPin += digit;
      pinDots.forEach((dot, idx) => dot.classList.toggle('is-active', idx < enteredPin.length));

      if (enteredPin.length === 6) {
        if (enteredPin === '101284') {
          // Success authentication transition
          sentinelDash.classList.add('is-authenticated');
          renderSentinel();
        } else {
          // Error shake and reset
          if (pinPadEl) pinPadEl.classList.add('is-error');
          setTimeout(() => {
            resetPinPad();
          }, 600);
        }
      }
    }
  };

  const removePinDigit = () => {
    if (enteredPin.length > 0) {
      enteredPin = enteredPin.slice(0, -1);
      pinDots.forEach((dot, idx) => dot.classList.toggle('is-active', idx < enteredPin.length));
    }
  };

  // Click handler for PIN pad buttons
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.num;
      if (num !== undefined) {
        processPinDigit(num);
      } else if (btn.classList.contains('pin-btn--clear')) {
        resetPinPad();
      } else if (btn.classList.contains('pin-btn--back')) {
        removePinDigit();
      }
    });
  });

  const toggleSentinel = () => {
    if (!sentinelDash) return;
    const active = sentinelDash.classList.toggle('is-active');
    sentinelDash.setAttribute('aria-hidden', active ? 'false' : 'true');
    
    // Always clear authentication state and reset PIN entry upon toggle
    sentinelDash.classList.remove('is-authenticated');
    resetPinPad();

    if (active) {
      renderSentinel(); // Perform background rendering
    }
  };

  // Close console hooks
  sentinelClose?.addEventListener('click', () => toggleSentinel());
  pinCancelBtn?.addEventListener('click', () => toggleSentinel());

  // Click reset stats
  sentinelReset?.addEventListener('click', () => {
    if (confirm('¿Restablecer todas las métricas de telemetría local?')) {
      localStorage.removeItem('ms_sentinel_stats');
      renderSentinel();
    }
  });

  // Passcode Keyboard Trigger & General Keydown Handlers
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return;

    // 1. PIN Keyboard Entry if Sentinel is open but not authenticated
    if (sentinelDash && sentinelDash.classList.contains('is-active') && !sentinelDash.classList.contains('is-authenticated')) {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        processPinDigit(e.key);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        removePinDigit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleSentinel();
        return;
      }
    }

    // 2. Secret passcode 'admin' key tracking
    typed += e.key.toLowerCase();
    if (typed.length > 20) typed = typed.slice(-20);
    if (typed.endsWith('admin')) {
      typed = '';
      toggleSentinel();
      return;
    }

    // Existing keyboard navigation triggers
    const cur = parseInt(body.dataset.stage || '0', 10);
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goToScene(cur + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); goToScene(cur - 1); }
    if (e.key === 'Home') { e.preventDefault(); goToScene(0); }
    if (e.key === 'End')  { e.preventDefault(); goToScene(3); }
    if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); toggleLight();
    }
  });

  // Mobile long press trigger (5 seconds on brand logo)
  const navBrand = document.querySelector('.nav__brand');
  if (navBrand) {
    let pressTimer;
    const startPress = () => {
      pressTimer = setTimeout(() => {
        toggleSentinel();
      }, 5000);
    };
    const endPress = () => {
      clearTimeout(pressTimer);
    };
    navBrand.addEventListener('touchstart', startPress, { passive: true });
    navBrand.addEventListener('touchend', endPress, { passive: true });
    navBrand.addEventListener('touchcancel', endPress, { passive: true });
  }
})();
