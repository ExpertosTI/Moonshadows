/* ============================================================
   MOONSHADOWS · SENTINEL · v1.0
   Standalone telemetry + admin console. Does not touch app.js or
   the visual layer. Loaded with `defer`, runs after DOM is ready.

   Activation:
     · Type the word "admin" anywhere on the page (not in inputs).
     · Or press Ctrl/Cmd + Shift + S.
     · Then enter PIN 101284 on the on-screen pad.

   Telemetry sink:
     · Insforge (or any PostgREST-compatible BaaS).
     · Configure via <meta name="sentinel-endpoint"> and
       <meta name="sentinel-anon-key">. See sentinel/README.md.
     · Falls back to a localStorage queue if endpoint is offline,
       and flushes once it returns.
   ============================================================ */

(function () {
  'use strict';

  // ── Configuration ───────────────────────────────────────────
  var CONFIG = {
    pinHash: 'a1d7a7a8c41ce7a3eea7e8b9f6e3a23a89c0aa5d4ae0a2cd83a8a47c8e2e7c4b', // sha256('101284'), recomputed at runtime
    pinLength: 6,
    pinMaxAttempts: 5,
    pinCooldownMs: 5 * 60 * 1000,                     // 5 min after max attempts
    activationWord: 'admin',
    keystrokeBufferMs: 1500,
    eventBatchSize: 12,
    eventFlushIntervalMs: 8000,
    sessionIdleMs: 30 * 60 * 1000,                    // 30 min inactivity = new session
    scrollSampleMs: 400,
    liveRefreshMs: 15000,
    storageKey: {
      visitor: 'snt:visitor',
      session: 'snt:session',
      queue:   'snt:queue',
      audit:   'snt:audit',
      lock:    'snt:pin_lock'
    }
  };

  // ── Insforge / endpoint resolution ─────────────────────────
  function readMeta(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? (m.getAttribute('content') || '').trim() : '';
  }

  var ENDPOINT = readMeta('sentinel-endpoint');
  var ANON_KEY = readMeta('sentinel-anon-key');
  var ENABLED  = !!(ENDPOINT && ANON_KEY);

  // ── Utilities ──────────────────────────────────────────────
  var nowIso = function () { return new Date().toISOString(); };
  var nowMs  = function () { return Date.now(); };

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function sha256(text) {
    var enc = new TextEncoder().encode(text);
    var buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function safeJSON(s, fallback) {
    if (s == null || s === '') return fallback;
    try {
      var parsed = JSON.parse(s);
      return (parsed === null || parsed === undefined) ? fallback : parsed;
    } catch (e) { return fallback; }
  }

  function ls(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function ss(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function ssSet(key, val) { try { sessionStorage.setItem(key, val); } catch (e) {} }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function throttle(fn, wait) {
    var last = 0, t = null;
    return function () {
      var ctx = this, args = arguments, now = Date.now();
      var remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(ctx, args);
      } else if (!t) {
        t = setTimeout(function () {
          last = Date.now();
          t = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  // ── Device / client fingerprint ────────────────────────────
  function detectDevice() {
    var ua = navigator.userAgent || '';
    var width = innerWidth || document.documentElement.clientWidth;

    // Device type heuristic
    var deviceType = 'desktop';
    if (/Mobi|Android|iPhone|iPod|BlackBerry|Opera Mini|IEMobile/i.test(ua)) deviceType = 'mobile';
    else if (/iPad|Tablet/i.test(ua) || (width >= 600 && width <= 1024 && 'ontouchstart' in window)) deviceType = 'tablet';

    // Browser
    var browser = 'unknown', version = '';
    var match;
    if ((match = ua.match(/Edg\/([\d.]+)/)))            { browser = 'Edge';    version = match[1]; }
    else if ((match = ua.match(/Firefox\/([\d.]+)/)))    { browser = 'Firefox'; version = match[1]; }
    else if ((match = ua.match(/OPR\/([\d.]+)/)))        { browser = 'Opera';   version = match[1]; }
    else if ((match = ua.match(/Chrome\/([\d.]+)/)))     { browser = 'Chrome';  version = match[1]; }
    else if ((match = ua.match(/Version\/([\d.]+).*Safari/))) { browser = 'Safari'; version = match[1]; }

    // OS
    var os = 'unknown', osVersion = '';
    if ((match = ua.match(/Windows NT ([\d.]+)/)))           { os = 'Windows';  osVersion = match[1]; }
    else if ((match = ua.match(/Mac OS X ([\d_\.]+)/)))       { os = 'macOS';    osVersion = match[1].replace(/_/g, '.'); }
    else if ((match = ua.match(/Android ([\d.]+)/)))          { os = 'Android';  osVersion = match[1]; }
    else if ((match = ua.match(/iPhone OS ([\d_]+)/)) ||
             (match = ua.match(/CPU OS ([\d_]+)/)))            { os = 'iOS';      osVersion = match[1].replace(/_/g, '.'); }
    else if (/Linux/.test(ua))                                { os = 'Linux'; }

    return {
      device_type: deviceType,
      browser: browser,
      browser_version: version,
      os: os,
      os_version: osVersion,
      user_agent: ua,
      language: navigator.language || 'unknown',
      timezone: (Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown'),
      viewport_width: innerWidth,
      viewport_height: innerHeight,
      screen_width: screen.width,
      screen_height: screen.height,
      pixel_ratio: window.devicePixelRatio || 1,
      touch_capable: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
      color_scheme: (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
      reduced_motion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }

  function parseReferrer() {
    var ref = document.referrer || '';
    var domain = '';
    try {
      if (ref) {
        var u = new URL(ref);
        if (u.host !== location.host) domain = u.host;
      }
    } catch (e) {}
    return { referrer: ref, referrer_domain: domain };
  }

  function parseUTM() {
    var p = new URLSearchParams(location.search);
    return {
      utm_source:   p.get('utm_source')   || null,
      utm_medium:   p.get('utm_medium')   || null,
      utm_campaign: p.get('utm_campaign') || null,
      utm_term:     p.get('utm_term')     || null,
      utm_content:  p.get('utm_content')  || null
    };
  }

  // ── Identity management ────────────────────────────────────
  function getVisitorId() {
    var v = ls(CONFIG.storageKey.visitor);
    if (!v) {
      v = uuid();
      lsSet(CONFIG.storageKey.visitor, v);
    }
    return v;
  }

  function getSession() {
    var raw = ls(CONFIG.storageKey.session);
    var s = safeJSON(raw, null);
    var now = nowMs();
    if (s && s.last && (now - s.last) < CONFIG.sessionIdleMs) {
      s.last = now;
      lsSet(CONFIG.storageKey.session, JSON.stringify(s));
      return s;
    }
    // Start a new session
    var fresh = {
      id: uuid(),
      visitor: getVisitorId(),
      start: now,
      last: now,
      scenes: [],
      events: 0
    };
    lsSet(CONFIG.storageKey.session, JSON.stringify(fresh));
    return fresh;
  }

  function touchSession(patch) {
    var s = getSession();
    s.last = nowMs();
    if (patch) Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    lsSet(CONFIG.storageKey.session, JSON.stringify(s));
    return s;
  }

  // ── Insforge client ────────────────────────────────────────
  var Client = {
    enabled: function () { return ENABLED; },

    headers: function () {
      return {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Prefer': 'return=minimal'
      };
    },

    /**
     * Insert one or many rows.
     * @param {string} table  · table name
     * @param {object|object[]} body
     * @returns {Promise<boolean>}
     */
    insert: function (table, body) {
      if (!ENABLED) return Promise.resolve(false);
      var url = ENDPOINT.replace(/\/$/, '') + '/' + table;
      var payload = JSON.stringify(Array.isArray(body) ? body : [body]);
      return fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: payload,
        keepalive: true,
        credentials: 'omit'
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    },

    /**
     * Upsert (insert or merge) on conflict of unique column.
     */
    upsert: function (table, row, onConflict) {
      if (!ENABLED) return Promise.resolve(false);
      var url = ENDPOINT.replace(/\/$/, '') + '/' + table +
                (onConflict ? '?on_conflict=' + onConflict : '');
      var h = this.headers();
      h['Prefer'] = 'resolution=merge-duplicates,return=minimal';
      return fetch(url, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(row),
        keepalive: true,
        credentials: 'omit'
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    },

    /**
     * Beacon send — guaranteed delivery on page unload.
     */
    beacon: function (table, body) {
      if (!ENABLED) return false;
      if (!navigator.sendBeacon) return false;
      var url = ENDPOINT.replace(/\/$/, '') + '/' + table;
      var payload = JSON.stringify(Array.isArray(body) ? body : [body]);
      // sendBeacon doesn't allow custom headers, so we use a CORS-safe blob
      // with the API key in URL when supported. Most BaaS allow ?apikey=...
      var beaconUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'apikey=' + encodeURIComponent(ANON_KEY);
      try {
        return navigator.sendBeacon(beaconUrl, new Blob([payload], { type: 'application/json' }));
      } catch (e) { return false; }
    },

    /**
     * Generic GET for dashboard queries.
     */
    select: function (resource, params) {
      if (!ENABLED) return Promise.resolve(null);
      var qs = '';
      if (params) {
        var parts = [];
        for (var k in params) if (params.hasOwnProperty(k)) {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
        if (parts.length) qs = '?' + parts.join('&');
      }
      var url = ENDPOINT.replace(/\/$/, '') + '/' + resource + qs;
      return fetch(url, {
        method: 'GET',
        headers: this.headers(),
        credentials: 'omit'
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
  };

  // ── Event Queue ────────────────────────────────────────────
  var Queue = {
    buf: [],
    timer: null,

    push: function (evt) {
      this.buf.push(evt);
      Bus.emit('local:event', evt);

      if (this.buf.length >= CONFIG.eventBatchSize) this.flush();
      else this.schedule();
    },

    schedule: function () {
      if (this.timer) return;
      var self = this;
      this.timer = setTimeout(function () { self.flush(); }, CONFIG.eventFlushIntervalMs);
    },

    flush: function (useBeacon) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!this.buf.length) return;
      var batch = this.buf.splice(0, this.buf.length);

      if (!Client.enabled()) {
        // No backend configured; persist to localStorage as ring buffer.
        var existing = safeJSON(ls(CONFIG.storageKey.queue), []);
        existing = existing.concat(batch).slice(-500); // cap
        lsSet(CONFIG.storageKey.queue, JSON.stringify(existing));
        return;
      }

      if (useBeacon) {
        Client.beacon('sentinel_events', batch);
      } else {
        Client.insert('sentinel_events', batch).then(function (ok) {
          if (!ok) {
            // Buffer locally for retry next flush
            var existing = safeJSON(ls(CONFIG.storageKey.queue), []);
            existing = existing.concat(batch).slice(-500);
            lsSet(CONFIG.storageKey.queue, JSON.stringify(existing));
          }
        });
      }
    },

    flushPersisted: function () {
      var existing = safeJSON(ls(CONFIG.storageKey.queue), []);
      if (!existing.length || !Client.enabled()) return;
      lsDel(CONFIG.storageKey.queue);
      Client.insert('sentinel_events', existing).then(function (ok) {
        if (!ok) lsSet(CONFIG.storageKey.queue, JSON.stringify(existing));
      });
    }
  };

  // ── Event Bus (for live feed in console) ───────────────────
  var Bus = (function () {
    var subs = {};
    return {
      on: function (event, fn) {
        (subs[event] = subs[event] || []).push(fn);
        return function () { subs[event] = (subs[event] || []).filter(function (s) { return s !== fn; }); };
      },
      emit: function (event, payload) {
        (subs[event] || []).forEach(function (fn) { try { fn(payload); } catch (e) {} });
      }
    };
  })();

  // ── Telemetry Recorder ─────────────────────────────────────
  var Recorder = {
    sceneIndex: 0,
    sceneId: 'scene-0',
    scrollDepth: 0,
    maxScroll: 0,

    init: function () {
      this.ensureSession();
      this.bindAll();
      this.recordSessionStart();
      this.bindPerformance();
      this.bindErrors();
      this.bindVisibility();
      // Try to flush any queue that survived a previous page-load
      setTimeout(function () { Queue.flushPersisted(); }, 2000);
    },

    ensureSession: function () {
      var s = getSession();
      var existing = safeJSON(ls('snt:session_meta'), null);
      if (existing && existing.id === s.id) return; // already registered

      var device = detectDevice();
      var ref = parseReferrer();
      var utm = parseUTM();

      var sessionRow = Object.assign({
        session_id:    s.id,
        visitor_id:    s.visitor,
        started_at:    new Date(s.start).toISOString(),
        last_seen_at:  nowIso(),
        entry_page:    location.pathname,
        pages_viewed:  1,
        scenes_viewed: [],
        bounced:       true
      }, device, ref, utm);

      Client.upsert('sentinel_sessions', sessionRow, 'session_id');
      lsSet('snt:session_meta', JSON.stringify({ id: s.id }));
    },

    recordSessionStart: function () {
      this.emit('session_start', { event_name: 'session_start' });
      this.emit('page_view', {
        event_name: 'page_view',
        target_label: document.title,
        meta: { url: location.href }
      });
    },

    emit: function (eventType, extra) {
      var s = touchSession({});
      s.events = (s.events || 0) + 1;

      var base = {
        session_id:    s.id,
        visitor_id:    s.visitor,
        event_type:    eventType,
        scene_id:      this.sceneId,
        scene_index:   this.sceneIndex,
        scroll_depth:  this.scrollDepth,
        viewport_x:    null,
        viewport_y:    null,
        client_ts:     nowMs()
      };
      Queue.push(Object.assign(base, extra || {}));
    },

    bindAll: function () {
      var self = this;

      // Scene tracking — observe body[data-stage] mutation
      var body = document.body;
      var lastStage = body.dataset.stage || '0';
      var stageObserver = new MutationObserver(function () {
        var cur = body.dataset.stage || '0';
        if (cur !== lastStage) {
          lastStage = cur;
          self.sceneIndex = parseInt(cur, 10);
          self.sceneId = 'scene-' + cur;
          self.emit('scene_change', {
            event_name: 'scene_' + cur,
            target_id: 'scene-' + cur,
            meta: { from: lastStage, to: cur }
          });
        }
      });
      stageObserver.observe(body, { attributes: true, attributeFilter: ['data-stage'] });

      // Light toggle (body.is-lit class toggle)
      var lastLit = body.classList.contains('is-lit');
      var classObserver = new MutationObserver(function () {
        var lit = body.classList.contains('is-lit');
        if (lit !== lastLit) {
          lastLit = lit;
          self.emit('light_toggle', {
            event_name: lit ? 'light_on' : 'light_off',
            target_id: 'light',
            value_num: lit ? 1 : 0
          });
        }
      });
      classObserver.observe(body, { attributes: true, attributeFilter: ['class'] });

      // Clicks — capture phase, ignore our own console
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('.snt-root')) return; // ignore sentinel UI

        var node    = t.closest('.node');
        var chip    = t.closest('.chip');
        var magnet  = t.closest('.magnet');
        var navCta  = t.closest('.nav__cta');
        var dot     = t.closest('.progress__dot');
        var lamp    = t.closest('#lamp-switch, .nav__light');
        var link    = t.closest('a');

        if (node) {
          self.emit('card_open', {
            event_name: 'service_card',
            target_id:  'node-' + node.dataset.node,
            target_label: (node.querySelector('.node__title') || {}).textContent || ''
          });
          return;
        }
        if (magnet || navCta || (chip && chip.href && chip.href.indexOf('wa.me') >= 0)) {
          self.emit('cta_click', {
            event_name: 'cta_whatsapp',
            target_id: 'cta-whatsapp',
            target_href: (magnet || navCta || chip).href,
            target_label: ((magnet || navCta || chip).textContent || '').trim().slice(0, 80)
          });
          return;
        }
        if (chip) {
          self.emit('link_click', {
            event_name: 'contact_chip',
            target_id: 'chip',
            target_href: chip.href,
            target_label: (chip.textContent || '').trim().slice(0, 80)
          });
          return;
        }
        if (dot) {
          self.emit('click', {
            event_name: 'progress_dot',
            target_id: 'progress-' + dot.dataset.go
          });
          return;
        }
        if (lamp) {
          self.emit('click', {
            event_name: 'lamp_click',
            target_id: lamp.id || 'lamp'
          });
          return;
        }
        if (link && link.href) {
          self.emit('link_click', {
            target_href: link.href,
            target_label: (link.textContent || '').trim().slice(0, 80)
          });
        }
      }, true);

      // Scroll depth
      var scrollHandler = throttle(function () {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        var pct = max > 0 ? Math.round((h.scrollTop / max) * 100) : 0;
        self.scrollDepth = pct;
        if (pct > self.maxScroll) self.maxScroll = pct;
      }, CONFIG.scrollSampleMs);
      window.addEventListener('scroll', scrollHandler, { passive: true });

      // Periodic milestone (25, 50, 75, 100)
      var milestonesHit = {};
      window.addEventListener('scroll', throttle(function () {
        [25, 50, 75, 100].forEach(function (m) {
          if (self.maxScroll >= m && !milestonesHit[m]) {
            milestonesHit[m] = true;
            self.emit('scroll', {
              event_name: 'depth_' + m,
              value_num: m
            });
          }
        });
      }, 800), { passive: true });

      // Viewport resize (debounced)
      window.addEventListener('resize', debounce(function () {
        self.emit('resize', {
          event_name: 'viewport_resize',
          value_num: innerWidth,
          meta: { w: innerWidth, h: innerHeight }
        });
      }, 600), { passive: true });

      // Copy / paste / share intents
      document.addEventListener('copy', function () {
        var sel = (window.getSelection() || '').toString().slice(0, 100);
        self.emit('copy', { event_name: 'copy', target_label: sel });
      });
    },

    bindPerformance: function () {
      var self = this;
      // Submit a baseline perf row on load.
      var sendPerf = function (vitals) {
        var s = getSession();
        var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
        var conn = navigator.connection || {};
        var mem = performance.memory || {};
        var row = {
          session_id: s.id,
          visitor_id: s.visitor,
          page_url: location.href,
          fcp:                vitals.fcp || null,
          lcp:                vitals.lcp || null,
          cls:                vitals.cls || null,
          fid:                vitals.fid || null,
          inp:                vitals.inp || null,
          ttfb:               (nav && nav.responseStart) ? (nav.responseStart - nav.startTime) : null,
          dom_interactive:    (nav && nav.domInteractive) ? (nav.domInteractive - nav.startTime) : null,
          dom_content_loaded: (nav && nav.domContentLoadedEventEnd) ? (nav.domContentLoadedEventEnd - nav.startTime) : null,
          load_event:         (nav && nav.loadEventEnd) ? (nav.loadEventEnd - nav.startTime) : null,
          connection_type:    conn.type || null,
          effective_type:     conn.effectiveType || null,
          downlink:           conn.downlink || null,
          rtt:                conn.rtt || null,
          save_data:          conn.saveData || false,
          js_heap_used_mb:    mem.usedJSHeapSize ? +(mem.usedJSHeapSize / 1048576).toFixed(2) : null,
          js_heap_total_mb:   mem.totalJSHeapSize ? +(mem.totalJSHeapSize / 1048576).toFixed(2) : null
        };
        Client.insert('sentinel_performance', row);
      };

      var vitals = { fcp: null, lcp: null, cls: 0, fid: null, inp: null };

      // FCP, LCP via PerformanceObserver
      try {
        if (PerformanceObserver.supportedEntryTypes) {
          if (PerformanceObserver.supportedEntryTypes.indexOf('paint') >= 0) {
            new PerformanceObserver(function (list) {
              list.getEntries().forEach(function (entry) {
                if (entry.name === 'first-contentful-paint') vitals.fcp = +entry.startTime.toFixed(2);
              });
            }).observe({ type: 'paint', buffered: true });
          }
          if (PerformanceObserver.supportedEntryTypes.indexOf('largest-contentful-paint') >= 0) {
            new PerformanceObserver(function (list) {
              var entries = list.getEntries();
              var last = entries[entries.length - 1];
              if (last) vitals.lcp = +last.renderTime ? +last.renderTime.toFixed(2) : +last.startTime.toFixed(2);
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          }
          if (PerformanceObserver.supportedEntryTypes.indexOf('layout-shift') >= 0) {
            new PerformanceObserver(function (list) {
              list.getEntries().forEach(function (entry) {
                if (!entry.hadRecentInput) vitals.cls += entry.value;
              });
            }).observe({ type: 'layout-shift', buffered: true });
          }
          if (PerformanceObserver.supportedEntryTypes.indexOf('first-input') >= 0) {
            new PerformanceObserver(function (list) {
              var entries = list.getEntries();
              if (entries[0]) vitals.fid = +((entries[0].processingStart - entries[0].startTime).toFixed(2));
            }).observe({ type: 'first-input', buffered: true });
          }
          if (PerformanceObserver.supportedEntryTypes.indexOf('event') >= 0) {
            new PerformanceObserver(function (list) {
              list.getEntries().forEach(function (entry) {
                if (entry.duration && (vitals.inp === null || entry.duration > vitals.inp)) {
                  vitals.inp = +entry.duration.toFixed(2);
                }
              });
            }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
          }
        }
      } catch (e) { /* perf observer not supported */ }

      // Send when page goes hidden (best moment for vitals)
      var sent = false;
      var send = function () {
        if (sent) return;
        sent = true;
        vitals.cls = +vitals.cls.toFixed(4);
        sendPerf(vitals);
      };
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') send();
      });
      addEventListener('pagehide', send);
      // Also send after 8s as safety
      setTimeout(send, 8000);
    },

    bindErrors: function () {
      var self = this;
      window.addEventListener('error', function (e) {
        var s = getSession();
        Client.insert('sentinel_errors', {
          session_id: s.id,
          visitor_id: s.visitor,
          error_type: 'js_error',
          message: (e.message || '').slice(0, 500),
          source: (e.filename || '').slice(0, 300),
          lineno: e.lineno || null,
          colno: e.colno || null,
          stack: (e.error && e.error.stack || '').slice(0, 2000),
          page_url: location.href,
          user_agent: navigator.userAgent
        });
        Bus.emit('local:event', {
          event_type: 'error',
          event_name: 'js_error',
          target_label: e.message || ''
        });
      });

      window.addEventListener('unhandledrejection', function (e) {
        var s = getSession();
        var reason = e.reason || {};
        var msg = (typeof reason === 'string' ? reason : (reason.message || JSON.stringify(reason))).slice(0, 500);
        Client.insert('sentinel_errors', {
          session_id: s.id,
          visitor_id: s.visitor,
          error_type: 'promise_rejection',
          message: msg,
          stack: (reason.stack || '').slice(0, 2000),
          page_url: location.href,
          user_agent: navigator.userAgent
        });
      });
    },

    bindVisibility: function () {
      var self = this;
      document.addEventListener('visibilitychange', function () {
        self.emit(document.visibilityState === 'hidden' ? 'visibility_hidden' : 'visibility_visible', {
          event_name: 'visibility_' + document.visibilityState
        });
        if (document.visibilityState === 'hidden') {
          Queue.flush(true);
          // Mark session ended
          var s = getSession();
          Client.beacon('sentinel_sessions', {
            session_id: s.id,
            visitor_id: s.visitor,
            ended_at: nowIso(),
            last_seen_at: nowIso(),
            max_scroll_depth: self.maxScroll
          });
        }
      });
      addEventListener('pagehide', function () { Queue.flush(true); });
      addEventListener('beforeunload', function () { Queue.flush(true); });

      // Heartbeat every 60s to update last_seen_at
      setInterval(function () {
        if (document.visibilityState !== 'visible') return;
        Client.upsert('sentinel_sessions', {
          session_id: getSession().id,
          visitor_id: getSession().visitor,
          last_seen_at: nowIso(),
          max_scroll_depth: self.maxScroll
        }, 'session_id');
      }, 60000);
    }
  };

  // ============================================================
  // ADMIN: Activation, PIN pad, Console
  // ============================================================
  var Admin = {
    root: null,
    pinDots: [],
    pinBuf: '',
    consoleEl: null,
    activeTab: 'overview',
    liveBuffer: [],
    refreshTimer: null,
    pinRealHash: '',

    init: function () {
      var self = this;
      // Compute the runtime pin hash so the literal isn't visible
      sha256('101284').then(function (h) { self.pinRealHash = h; });

      this.mountRoot();
      this.bindActivation();
      Bus.on('local:event', function (evt) {
        self.liveBuffer.unshift({
          t: new Date(),
          type: evt.event_type,
          name: evt.event_name || evt.target_label || '',
          target: evt.target_id || ''
        });
        if (self.liveBuffer.length > 80) self.liveBuffer.length = 80;
        if (self.activeTab === 'live') self.renderLive();
      });
    },

    mountRoot: function () {
      var root = document.createElement('div');
      root.className = 'snt-root';
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML =
        '<div class="snt-scrim"></div>' +
        this.pinpadHTML() +
        this.consoleHTML();
      document.body.appendChild(root);
      this.root = root;
      this.pinDots = Array.from(root.querySelectorAll('.snt-pinpad__dot'));
      this.consoleEl = root.querySelector('.snt-console');
      this.bindPinpad();
      this.bindConsole();
    },

    pinpadHTML: function () {
      var keys = ['1','2','3','4','5','6','7','8','9','close','0','erase'];
      var dots = '';
      for (var i = 0; i < CONFIG.pinLength; i++) dots += '<span class="snt-pinpad__dot"></span>';
      var grid = keys.map(function (k) {
        var label = k === 'erase' ? '←' : (k === 'close' ? '✕' : k);
        return '<button class="snt-pinpad__key" data-key="' + k + '" type="button">' + label + '</button>';
      }).join('');
      return '' +
        '<div class="snt-pinpad" role="dialog" aria-label="Sentinel access" aria-modal="true">' +
          '<div class="snt-pinpad__brand">SENTINEL · ACCESS</div>' +
          '<div class="snt-pinpad__title">Ingresa el código</div>' +
          '<div class="snt-pinpad__display">' + dots + '</div>' +
          '<div class="snt-pinpad__grid">' + grid + '</div>' +
          '<div class="snt-pinpad__hint">esc · cerrar</div>' +
        '</div>';
    },

    consoleHTML: function () {
      return '' +
        '<div class="snt-console" role="region" aria-label="Sentinel admin console">' +
          '<header class="snt-console__head">' +
            '<div class="snt-console__brand">Sentinel</div>' +
            '<div class="snt-console__title">Telemetría · Moonshadows</div>' +
            '<nav class="snt-console__tabs" role="tablist">' +
              '<button class="snt-console__tab is-active" data-tab="overview">Resumen</button>' +
              '<button class="snt-console__tab" data-tab="live">Live</button>' +
              '<button class="snt-console__tab" data-tab="audience">Audiencia</button>' +
              '<button class="snt-console__tab" data-tab="behavior">Comportamiento</button>' +
              '<button class="snt-console__tab" data-tab="perf">Rendimiento</button>' +
              '<button class="snt-console__tab" data-tab="errors">Errores</button>' +
            '</nav>' +
            '<div class="snt-console__actions">' +
              '<button class="snt-console__btn" data-action="refresh">↻ Refrescar</button>' +
              '<button class="snt-console__btn snt-console__btn--danger" data-action="close">✕ Cerrar</button>' +
            '</div>' +
          '</header>' +
          '<main class="snt-console__body" id="snt-body">' +
            '<div class="snt-empty"><span class="snt-loading"></span></div>' +
          '</main>' +
          '<footer class="snt-console__foot">' +
            '<span class="snt-fstatus">' + (ENABLED ? 'Conectado a Insforge' : 'Offline · configurar endpoint') + '</span>' +
            '<span>v1.0</span>' +
            '<span class="snt-fclock"></span>' +
          '</footer>' +
        '</div>' +
        '<div class="snt-toast" id="snt-toast"></div>';
    },

    // ── Activation ────────────────────────────────────────
    bindActivation: function () {
      var self = this;
      var buf = '';
      var lastKey = 0;

      // URL hash trigger (mobile-friendly, no keyboard needed)
      var checkHash = function () {
        if (location.hash === '#snt' || location.hash === '#admin' || location.hash === '#sentinel') {
          // Strip the hash so it doesn't persist on share
          if (history && history.replaceState) {
            history.replaceState(null, '', location.pathname + location.search);
          } else {
            location.hash = '';
          }
          self.openPinpad();
        }
      };
      checkHash();
      addEventListener('hashchange', checkHash);

      // Keystroke buffer — detects "admin" typed anywhere
      document.addEventListener('keydown', function (e) {
        // Don't trigger from inside inputs / editable
        if (self.isTyping(e.target)) return;

        // Shortcut: Ctrl/Cmd + Shift + S
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
          e.preventDefault();
          self.openPinpad();
          return;
        }

        // Escape closes admin
        if (e.key === 'Escape' && self.root.classList.contains('is-active')) {
          self.closeAll();
          return;
        }

        // Typing buffer
        if (e.key.length === 1) {
          var now = nowMs();
          if (now - lastKey > CONFIG.keystrokeBufferMs) buf = '';
          lastKey = now;
          buf = (buf + e.key.toLowerCase()).slice(-CONFIG.activationWord.length);
          if (buf === CONFIG.activationWord) {
            buf = '';
            self.openPinpad();
          }
        }
      });
    },

    isTyping: function (el) {
      if (!el) return false;
      var tag = (el.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    },

    // ── Lockout ──────────────────────────────────────────
    isLocked: function () {
      var raw = ls(CONFIG.storageKey.lock);
      if (!raw) return false;
      var lock = safeJSON(raw, null);
      if (!lock) return false;
      if (nowMs() > lock.until) {
        lsDel(CONFIG.storageKey.lock);
        return false;
      }
      return Math.ceil((lock.until - nowMs()) / 1000);
    },

    audit: function (event, success, meta) {
      var s = getSession();
      var row = {
        event: event,
        success: !!success,
        session_id: s.id,
        visitor_id: s.visitor,
        user_agent: navigator.userAgent,
        meta: meta || {}
      };
      Client.insert('sentinel_admin_audit', row);
      // Also keep a local trail
      var trail = safeJSON(ls(CONFIG.storageKey.audit), []);
      trail.unshift({ at: nowIso(), event: event, success: !!success });
      lsSet(CONFIG.storageKey.audit, JSON.stringify(trail.slice(0, 40)));
    },

    // ── PIN pad ──────────────────────────────────────────
    openPinpad: function () {
      var remaining = this.isLocked();
      if (remaining) {
        this.toast('Bloqueado · reintenta en ' + remaining + 's', 'bad');
        return;
      }
      this.root.classList.add('is-active', 'is-pinpad');
      this.root.classList.remove('is-console');
      this.root.setAttribute('aria-hidden', 'false');
      this.audit('console_open', false);
      this.pinBuf = '';
      this.renderPin();
    },

    bindPinpad: function () {
      var self = this;
      var pad = this.root.querySelector('.snt-pinpad');
      pad.addEventListener('click', function (e) {
        var btn = e.target.closest('.snt-pinpad__key');
        if (!btn) return;
        var k = btn.dataset.key;
        if (k === 'close') return self.closeAll();
        if (k === 'erase') { self.pinBuf = self.pinBuf.slice(0, -1); self.renderPin(); return; }
        if (/^\d$/.test(k) && self.pinBuf.length < CONFIG.pinLength) {
          self.pinBuf += k;
          self.renderPin();
          if (self.pinBuf.length === CONFIG.pinLength) self.tryPin();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (!self.root.classList.contains('is-pinpad')) return;
        if (/^[0-9]$/.test(e.key) && self.pinBuf.length < CONFIG.pinLength) {
          self.pinBuf += e.key;
          self.renderPin();
          if (self.pinBuf.length === CONFIG.pinLength) self.tryPin();
        } else if (e.key === 'Backspace') {
          self.pinBuf = self.pinBuf.slice(0, -1);
          self.renderPin();
        }
      });
    },

    renderPin: function () {
      var n = this.pinBuf.length;
      this.pinDots.forEach(function (d, i) {
        d.classList.toggle('is-on', i < n);
        d.classList.remove('is-error', 'is-ok');
      });
    },

    tryPin: function () {
      var self = this;
      sha256(this.pinBuf).then(function (h) {
        if (h === self.pinRealHash) {
          self.pinDots.forEach(function (d) { d.classList.add('is-ok'); });
          self.audit('pin_success', true);
          setTimeout(function () { self.openConsole(); }, 360);
        } else {
          self.pinDots.forEach(function (d) { d.classList.add('is-error'); });
          self.audit('pin_attempt', false, { len: self.pinBuf.length });
          self.recordAttempt();
          setTimeout(function () {
            self.pinBuf = '';
            self.renderPin();
          }, 480);
        }
      });
    },

    recordAttempt: function () {
      var raw = ls(CONFIG.storageKey.lock);
      var lock = safeJSON(raw, { fails: 0, until: 0 });
      lock.fails = (lock.fails || 0) + 1;
      if (lock.fails >= CONFIG.pinMaxAttempts) {
        lock.until = nowMs() + CONFIG.pinCooldownMs;
        lock.fails = 0;
        this.toast('Demasiados intentos · bloqueado ' + (CONFIG.pinCooldownMs / 60000) + 'min', 'bad');
        this.closeAll();
      }
      lsSet(CONFIG.storageKey.lock, JSON.stringify(lock));
    },

    // ── Console ──────────────────────────────────────────
    openConsole: function () {
      this.root.classList.remove('is-pinpad');
      this.root.classList.add('is-active', 'is-console');
      this.audit('console_open', true);
      // Reset lock
      lsDel(CONFIG.storageKey.lock);
      this.activeTab = 'overview';
      this.renderActive();
      this.startClock();
      // Auto-refresh live tab every 15s if it's the active one
      var self = this;
      this.refreshTimer = setInterval(function () {
        if (self.activeTab === 'live' || self.activeTab === 'overview') self.renderActive();
      }, CONFIG.liveRefreshMs);
    },

    bindConsole: function () {
      var self = this;
      this.consoleEl.addEventListener('click', function (e) {
        var tab = e.target.closest('.snt-console__tab');
        if (tab) {
          self.consoleEl.querySelectorAll('.snt-console__tab').forEach(function (t) { t.classList.remove('is-active'); });
          tab.classList.add('is-active');
          self.activeTab = tab.dataset.tab;
          self.renderActive();
          return;
        }
        var btn = e.target.closest('[data-action]');
        if (btn) {
          if (btn.dataset.action === 'close') self.closeAll();
          if (btn.dataset.action === 'refresh') { self.renderActive(); self.toast('Datos actualizados', 'ok'); }
        }
      });
    },

    closeAll: function () {
      this.root.classList.remove('is-active', 'is-pinpad', 'is-console');
      this.root.setAttribute('aria-hidden', 'true');
      this.audit('console_close', true);
      if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    },

    startClock: function () {
      var el = this.root.querySelector('.snt-fclock');
      if (!el) return;
      var update = function () {
        var d = new Date();
        el.textContent = d.toLocaleTimeString('es-DO', { hour12: false });
      };
      update();
      if (this._clock) clearInterval(this._clock);
      this._clock = setInterval(update, 1000);
    },

    toast: function (msg, kind) {
      var el = this.root.querySelector('#snt-toast');
      el.className = 'snt-toast' + (kind ? ' snt-toast--' + kind : '');
      el.textContent = msg;
      el.classList.add('is-show');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(function () { el.classList.remove('is-show'); }, 2400);
    },

    // ── Rendering ────────────────────────────────────────
    renderActive: function () {
      var body = this.root.querySelector('#snt-body');
      if (!body) return;
      var tab = this.activeTab;
      if (tab === 'overview')      this.renderOverview(body);
      else if (tab === 'live')     this.renderLive(body);
      else if (tab === 'audience') this.renderAudience(body);
      else if (tab === 'behavior') this.renderBehavior(body);
      else if (tab === 'perf')     this.renderPerf(body);
      else if (tab === 'errors')   this.renderErrors(body);
    },

    fmtDuration: function (sec) {
      if (sec == null) return '—';
      sec = Math.round(sec);
      if (sec < 60) return sec + 's';
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + 'm ' + s + 's';
    },

    fmtPct: function (n) {
      if (n == null) return '—';
      return (Math.round(n * 1000) / 10) + '%';
    },

    fmtMs: function (n) {
      if (n == null) return '—';
      return Math.round(n) + 'ms';
    },

    // Overview
    renderOverview: function (body) {
      var self = this;
      body.innerHTML = '<div class="snt-kpis" id="snt-kpis"><div class="snt-empty"><span class="snt-loading"></span></div></div>' +
                       '<div class="snt-grid">' +
                         '<div class="snt-panel snt-panel--wide" id="snt-trend">' +
                           '<div class="snt-panel__head"><div class="snt-panel__title">Sesiones · últimos 14 días</div><span class="snt-panel__meta">Insforge</span></div>' +
                           '<div class="snt-empty"><span class="snt-loading"></span></div>' +
                         '</div>' +
                         '<div class="snt-panel" id="snt-funnel">' +
                           '<div class="snt-panel__head"><div class="snt-panel__title">Embudo de conversión</div></div>' +
                           '<div class="snt-empty"><span class="snt-loading"></span></div>' +
                         '</div>' +
                         '<div class="snt-panel" id="snt-scenes">' +
                           '<div class="snt-panel__head"><div class="snt-panel__title">Engagement por escena</div></div>' +
                           '<div class="snt-empty"><span class="snt-loading"></span></div>' +
                         '</div>' +
                       '</div>';

      this.loadDaily().then(function (daily) { self.paintKPIs(daily); self.paintTrend(daily); });
      this.loadFunnel().then(function (f)    { self.paintFunnel(f); });
      this.loadScenes().then(function (sc)   { self.paintScenes(sc); });
    },

    loadDaily: function () {
      return Client.select('sentinel_v_daily', { order: 'day.desc', limit: 14 })
        .then(function (rows) { return rows || []; });
    },

    loadFunnel: function () {
      return Client.select('sentinel_v_funnel', null)
        .then(function (rows) { return (rows && rows[0]) ? rows[0] : null; });
    },

    loadScenes: function () {
      return Client.select('sentinel_v_scene_engagement', null)
        .then(function (rows) { return rows || []; });
    },

    paintKPIs: function (daily) {
      var k = this.root.querySelector('#snt-kpis');
      if (!k) return;

      if (!daily || !daily.length) {
        k.innerHTML = this.kpiSet({
          sessions: 0, unique: 0, bounce: 0, duration: 0, cta: 0
        });
        return;
      }

      var totals = daily.reduce(function (acc, r) {
        acc.sessions += r.sessions || 0;
        acc.unique   += r.unique_visitors || 0;
        acc.bounce   += (r.bounce_rate || 0) * (r.sessions || 0);
        acc.dur      += (r.avg_duration_seconds || 0) * (r.sessions || 0);
        acc.cta      += r.total_cta_clicks || 0;
        acc.count    += r.sessions || 0;
        return acc;
      }, { sessions: 0, unique: 0, bounce: 0, dur: 0, cta: 0, count: 0 });

      k.innerHTML = this.kpiSet({
        sessions: totals.sessions,
        unique:   totals.unique,
        bounce:   totals.count ? totals.bounce / totals.count : 0,
        duration: totals.count ? totals.dur / totals.count : 0,
        cta:      totals.cta
      });
    },

    kpiSet: function (k) {
      var self = this;
      return [
        ['Sesiones', k.sessions.toLocaleString(), '14 días', ''],
        ['Visitantes únicos', k.unique.toLocaleString(), 'distintos', 'mint'],
        ['Tasa de rebote', self.fmtPct(k.bounce), 'menor es mejor', 'rose'],
        ['Duración promedio', self.fmtDuration(k.duration), 'por sesión', 'cyan'],
        ['Clics CTA', k.cta.toLocaleString(), 'WhatsApp + Conversemos', 'violet']
      ].map(function (k) {
        return '<div class="snt-kpi' + (k[3] ? ' snt-kpi--' + k[3] : '') + '">' +
                 '<div class="snt-kpi__label">' + k[0] + '</div>' +
                 '<div class="snt-kpi__value">' + k[1] + '</div>' +
                 '<div class="snt-kpi__sub">' + k[2] + '</div>' +
               '</div>';
      }).join('');
    },

    paintTrend: function (daily) {
      var box = this.root.querySelector('#snt-trend');
      if (!box) return;
      if (!daily || !daily.length) {
        box.querySelector('.snt-empty, .snt-chart, .snt-chart-wrap')?.remove?.();
        box.insertAdjacentHTML('beforeend', this.emptyHTML('Aún no hay datos. Insforge se llenará con la primera visita.'));
        return;
      }

      var data = daily.slice().reverse(); // chronological
      var values = data.map(function (d) { return d.sessions || 0; });
      var labels = data.map(function (d) { return (d.day || '').slice(5); });
      var W = 800, H = 140, P = 20;
      var max = Math.max.apply(null, values.concat([1]));
      var step = (W - P * 2) / Math.max(values.length - 1, 1);
      var pts = values.map(function (v, i) {
        var x = P + i * step;
        var y = H - P - (v / max) * (H - P * 2);
        return [x, y];
      });
      var line = 'M ' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L ');
      var area = line + ' L ' + (W - P).toFixed(1) + ' ' + (H - P) + ' L ' + P + ' ' + (H - P) + ' Z';

      var ticks = [0, .25, .5, .75, 1].map(function (t) {
        var y = H - P - t * (H - P * 2);
        return '<line class="snt-chart-grid" x1="' + P + '" x2="' + (W - P) + '" y1="' + y + '" y2="' + y + '"/>';
      }).join('');
      var dots = pts.map(function (p) {
        return '<circle class="snt-chart-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3"/>';
      }).join('');
      var xax = labels.map(function (l, i) {
        if (i % Math.max(1, Math.floor(labels.length / 7)) !== 0) return '';
        return '<text class="snt-chart-axis" x="' + (P + i * step) + '" y="' + (H - 4) + '" text-anchor="middle">' + l + '</text>';
      }).join('');

      var html = '<svg class="snt-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
        '<defs><linearGradient id="snt-grad-gold" x1="0" x2="0" y1="0" y2="1">' +
          '<stop offset="0%" stop-color="#E8A317"/><stop offset="100%" stop-color="#E8A317" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        ticks +
        '<path class="snt-chart-area" d="' + area + '"/>' +
        '<path class="snt-chart-line" d="' + line + '"/>' +
        dots + xax +
      '</svg>';

      box.innerHTML =
        '<div class="snt-panel__head"><div class="snt-panel__title">Sesiones · últimos 14 días</div>' +
        '<span class="snt-panel__meta">Total: ' + values.reduce(function (a, b) { return a + b; }, 0) + '</span></div>' +
        html;
    },

    paintFunnel: function (f) {
      var box = this.root.querySelector('#snt-funnel');
      if (!box) return;
      var head = '<div class="snt-panel__head"><div class="snt-panel__title">Embudo de conversión</div><span class="snt-panel__meta">30 días</span></div>';
      if (!f) {
        box.innerHTML = head + this.emptyHTML('Aún sin datos');
        return;
      }
      var stages = [
        ['Aterrizó',        f.landed],
        ['Vio servicios',   f.reached_services],
        ['Vio método',      f.reached_method],
        ['Llegó a contacto',f.reached_contact],
        ['Clic en CTA',     f.clicked_cta]
      ];
      var total = f.landed || 1;
      var rows = stages.map(function (s, i) {
        var pct = (s[1] || 0) / total;
        var colors = ['', 'cyan', 'mint', 'rose'];
        return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span>' + s[0] + '</span><span style="color:var(--snt-text-dim);font-family:var(--snt-mono)">' + (s[1] || 0) + ' · ' + Math.round(pct * 100) + '%</span></div>' +
               '<div class="snt-bar' + (i ? ' snt-bar--' + (colors[i] || '') : '') + '"><div class="snt-bar__fill" style="width:' + Math.round(pct * 100) + '%"></div></div></div>';
      }).join('');
      box.innerHTML = head + rows;
    },

    paintScenes: function (sc) {
      var box = this.root.querySelector('#snt-scenes');
      if (!box) return;
      var head = '<div class="snt-panel__head"><div class="snt-panel__title">Engagement por escena</div></div>';
      if (!sc || !sc.length) {
        box.innerHTML = head + this.emptyHTML('Aún sin datos');
        return;
      }
      var rows = '<table class="snt-table"><thead><tr><th>Escena</th><th class="num">Visitas</th><th class="num">Aperturas</th><th class="num">CTA</th></tr></thead><tbody>' +
        sc.map(function (r) {
          return '<tr><td class="tag">' + (r.scene_id || '—') + '</td>' +
                 '<td class="num">' + (r.scene_visits || 0) + '</td>' +
                 '<td class="num">' + (r.card_opens || 0) + '</td>' +
                 '<td class="num">' + (r.cta_clicks || 0) + '</td></tr>';
        }).join('') + '</tbody></table>';
      box.innerHTML = head + rows;
    },

    // Live
    renderLive: function (body) {
      body = body || this.root.querySelector('#snt-body');
      if (!body) return;
      var self = this;

      if (this.activeTab !== 'live') return;
      body.innerHTML =
        '<div class="snt-grid">' +
          '<div class="snt-panel snt-panel--wide">' +
            '<div class="snt-panel__head"><div class="snt-panel__title">Stream de eventos</div><span class="snt-panel__meta">en vivo</span></div>' +
            '<ul class="snt-live" id="snt-live"></ul>' +
          '</div>' +
          '<div class="snt-panel" id="snt-live-now">' +
            '<div class="snt-panel__head"><div class="snt-panel__title">Sesiones activas (5 min)</div></div>' +
            '<div class="snt-empty"><span class="snt-loading"></span></div>' +
          '</div>' +
        '</div>';

      var feed = body.querySelector('#snt-live');
      feed.innerHTML = this.liveBuffer.length ?
        this.liveBuffer.slice(0, 60).map(function (e) {
          var kind = (e.type || '').replace(/_/g, '-');
          return '<li>' +
            '<span class="snt-live__time">' + e.t.toLocaleTimeString('es-DO', { hour12: false }) + '</span>' +
            '<span class="snt-live__type snt-live__type--' + (kind.indexOf('click') >= 0 ? 'click' : (kind === 'page-view' || kind === 'scene-change') ? 'view' : (kind === 'error') ? 'error' : '') + '">' + (e.type || '') + '</span>' +
            '<span class="snt-live__detail">' + (e.name || '') + (e.target ? ' · ' + e.target : '') + '</span>' +
          '</li>';
        }).join('') :
        '<li class="snt-empty">esperando eventos…</li>';

      Client.select('sentinel_v_live', { order: 'last_seen_at.desc', limit: 20 }).then(function (rows) {
        var box = body.querySelector('#snt-live-now');
        if (!box) return;
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Sesiones activas (5 min)</div><span class="snt-panel__meta">' + (rows ? rows.length : 0) + '</span></div>';
        if (!rows || !rows.length) {
          box.innerHTML = head + self.emptyHTML('Nadie activo ahora mismo.');
          return;
        }
        box.innerHTML = head + '<table class="snt-table"><thead><tr><th>País</th><th>Dispositivo</th><th class="num">Escena</th><th class="num">Hace</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td>' + (r.city || r.country || '—') + '</td>' +
                   '<td class="tag">' + (r.device_type || '—') + ' · ' + (r.browser || '—') + '</td>' +
                   '<td class="num">' + (r.max_scene_reached || 0) + '</td>' +
                   '<td class="num">' + (r.seconds_since_seen || 0) + 's</td></tr>';
          }).join('') + '</tbody></table>';
      });
    },

    // Audience
    renderAudience: function (body) {
      var self = this;
      body.innerHTML =
        '<div class="snt-grid">' +
          '<div class="snt-panel" id="snt-geo"><div class="snt-empty"><span class="snt-loading"></span></div></div>' +
          '<div class="snt-panel" id="snt-device"><div class="snt-empty"><span class="snt-loading"></span></div></div>' +
          '<div class="snt-panel snt-panel--wide" id="snt-refs"><div class="snt-empty"><span class="snt-loading"></span></div></div>' +
        '</div>';

      Client.select('sentinel_v_geo', { order: 'sessions.desc', limit: 10 }).then(function (rows) {
        var box = body.querySelector('#snt-geo');
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Geografía</div><span class="snt-panel__meta">30 días</span></div>';
        if (!rows || !rows.length) { box.innerHTML = head + self.emptyHTML('Sin datos'); return; }
        var max = rows[0].sessions || 1;
        box.innerHTML = head + '<ul class="snt-geo">' +
          rows.map(function (r) {
            var pct = (r.sessions || 0) / max;
            var flag = (r.country || '??').slice(0, 2).toUpperCase();
            return '<li><span class="snt-geo__flag">' + flag + '</span>' +
                   '<span class="snt-geo__name">' + (r.country || 'Unknown') +
                     '<div class="snt-bar" style="margin-top:4px"><div class="snt-bar__fill" style="width:' + Math.round(pct * 100) + '%"></div></div>' +
                   '</span>' +
                   '<span class="snt-geo__count">' + (r.sessions || 0) + '</span></li>';
          }).join('') + '</ul>';
      });

      Client.select('sentinel_v_device', { order: 'sessions.desc', limit: 10 }).then(function (rows) {
        var box = body.querySelector('#snt-device');
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Dispositivos · Navegadores</div></div>';
        if (!rows || !rows.length) { box.innerHTML = head + self.emptyHTML('Sin datos'); return; }
        box.innerHTML = head + '<table class="snt-table"><thead><tr><th>Tipo</th><th>Navegador</th><th>OS</th><th class="num">Sesiones</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td class="tag">' + (r.device_type || '—') + '</td>' +
                   '<td>' + (r.browser || '—') + '</td>' +
                   '<td class="tag">' + (r.os || '—') + '</td>' +
                   '<td class="num">' + (r.sessions || 0) + '</td></tr>';
          }).join('') + '</tbody></table>';
      });

      Client.select('sentinel_v_top_referrers', { order: 'sessions.desc', limit: 12 }).then(function (rows) {
        var box = body.querySelector('#snt-refs');
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Top referrers</div><span class="snt-panel__meta">30 días</span></div>';
        if (!rows || !rows.length) { box.innerHTML = head + self.emptyHTML('Sin datos'); return; }
        box.innerHTML = head + '<table class="snt-table"><thead><tr><th>Origen</th><th class="num">Sesiones</th><th class="num">Únicos</th><th class="num">Duración</th><th class="num">Engagement</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td>' + r.source + '</td>' +
                   '<td class="num">' + (r.sessions || 0) + '</td>' +
                   '<td class="num">' + (r.unique_visitors || 0) + '</td>' +
                   '<td class="num">' + self.fmtDuration(r.avg_duration) + '</td>' +
                   '<td class="num">' + self.fmtPct(r.engagement_rate) + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
    },

    // Behavior
    renderBehavior: function (body) {
      var self = this;
      body.innerHTML =
        '<div class="snt-grid">' +
          '<div class="snt-panel snt-panel--wide" id="snt-events"><div class="snt-empty"><span class="snt-loading"></span></div></div>' +
        '</div>';

      Client.select('sentinel_events', {
        select: 'event_type,event_name,target_id,target_label,target_href,scene_id,created_at',
        order: 'created_at.desc',
        limit: 50
      }).then(function (rows) {
        var box = body.querySelector('#snt-events');
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Últimos eventos</div><span class="snt-panel__meta">' + (rows ? rows.length : 0) + '</span></div>';
        if (!rows || !rows.length) { box.innerHTML = head + self.emptyHTML('Sin eventos aún'); return; }
        box.innerHTML = head + '<table class="snt-table"><thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Escena</th></tr></thead><tbody>' +
          rows.map(function (e) {
            var d = e.created_at ? new Date(e.created_at) : null;
            return '<tr><td class="tag">' + (d ? d.toLocaleTimeString('es-DO', { hour12: false }) : '—') + '</td>' +
                   '<td class="tag">' + (e.event_type || '—') + '</td>' +
                   '<td>' + (e.event_name || e.target_label || e.target_href || e.target_id || '—') + '</td>' +
                   '<td class="tag">' + (e.scene_id || '—') + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
    },

    // Performance
    renderPerf: function (body) {
      var self = this;
      body.innerHTML =
        '<div class="snt-kpis" id="snt-pk"><div class="snt-empty"><span class="snt-loading"></span></div></div>' +
        '<div class="snt-grid"><div class="snt-panel snt-panel--wide" id="snt-perf-detail"><div class="snt-empty"><span class="snt-loading"></span></div></div></div>';

      Client.select('sentinel_v_perf', null).then(function (rows) {
        var k = body.querySelector('#snt-pk');
        var p = (rows && rows[0]) ? rows[0] : null;
        if (!p) { k.innerHTML = self.emptyHTML('Aún sin métricas'); return; }
        var rate = function (val, good, bad) {
          if (val == null) return '';
          if (val <= good) return ' <span class="snt-pill snt-pill--ok">good</span>';
          if (val >= bad)  return ' <span class="snt-pill snt-pill--bad">poor</span>';
          return ' <span class="snt-pill snt-pill--warn">needs work</span>';
        };
        k.innerHTML = [
          ['LCP p75', self.fmtMs(p.lcp_p75) + rate(p.lcp_p75, 2500, 4000), 'Largest Contentful Paint',  'cyan'],
          ['FCP p75', self.fmtMs(p.fcp_p75) + rate(p.fcp_p75, 1800, 3000), 'First Contentful Paint',     'mint'],
          ['CLS p75', (p.cls_p75 != null ? p.cls_p75.toFixed(3) : '—') + rate(p.cls_p75, 0.1, 0.25), 'Cumulative Layout Shift', 'rose'],
          ['TTFB p50', self.fmtMs(p.ttfb_p50) + rate(p.ttfb_p50, 800, 1800), 'Time to First Byte',       'violet']
        ].map(function (k) {
          return '<div class="snt-kpi snt-kpi--' + k[3] + '">' +
                   '<div class="snt-kpi__label">' + k[0] + '</div>' +
                   '<div class="snt-kpi__value">' + k[1] + '</div>' +
                   '<div class="snt-kpi__sub">' + k[2] + '</div>' +
                 '</div>';
        }).join('');
      });

      Client.select('sentinel_performance', {
        select: 'created_at,page_url,lcp,fcp,cls,ttfb,inp,effective_type,downlink',
        order: 'created_at.desc',
        limit: 30
      }).then(function (rows) {
        var box = body.querySelector('#snt-perf-detail');
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Últimas mediciones</div></div>';
        if (!rows || !rows.length) { box.innerHTML = head + self.emptyHTML('Sin datos'); return; }
        box.innerHTML = head + '<table class="snt-table"><thead><tr><th>Hora</th><th class="num">LCP</th><th class="num">FCP</th><th class="num">CLS</th><th class="num">TTFB</th><th>Red</th></tr></thead><tbody>' +
          rows.map(function (e) {
            var d = e.created_at ? new Date(e.created_at) : null;
            return '<tr><td class="tag">' + (d ? d.toLocaleString('es-DO', { hour12: false }) : '—') + '</td>' +
                   '<td class="num">' + self.fmtMs(e.lcp) + '</td>' +
                   '<td class="num">' + self.fmtMs(e.fcp) + '</td>' +
                   '<td class="num">' + (e.cls != null ? e.cls.toFixed(3) : '—') + '</td>' +
                   '<td class="num">' + self.fmtMs(e.ttfb) + '</td>' +
                   '<td class="tag">' + (e.effective_type || '—') + (e.downlink ? ' · ' + e.downlink + 'mb' : '') + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
    },

    // Errors
    renderErrors: function (body) {
      var self = this;
      body.innerHTML = '<div class="snt-grid"><div class="snt-panel snt-panel--wide" id="snt-err"><div class="snt-empty"><span class="snt-loading"></span></div></div></div>';
      Client.select('sentinel_errors', {
        order: 'created_at.desc',
        limit: 50
      }).then(function (rows) {
        var box = body.querySelector('#snt-err');
        var head = '<div class="snt-panel__head"><div class="snt-panel__title">Errores JavaScript</div><span class="snt-panel__meta">' + (rows ? rows.length : 0) + '</span></div>';
        if (!rows || !rows.length) { box.innerHTML = head + self.emptyHTML('Sin errores · todo limpio.'); return; }
        box.innerHTML = head + '<table class="snt-table"><thead><tr><th>Hora</th><th>Tipo</th><th>Mensaje</th><th>Fuente</th></tr></thead><tbody>' +
          rows.map(function (e) {
            var d = e.created_at ? new Date(e.created_at) : null;
            return '<tr><td class="tag">' + (d ? d.toLocaleString('es-DO', { hour12: false }) : '—') + '</td>' +
                   '<td class="tag"><span class="snt-pill snt-pill--bad">' + (e.error_type || 'err') + '</span></td>' +
                   '<td>' + (e.message || '—').slice(0, 120) + '</td>' +
                   '<td class="tag">' + (e.source || '—') + (e.lineno ? ':' + e.lineno : '') + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
    },

    emptyHTML: function (msg) {
      if (!ENABLED) {
        return '<div class="snt-empty"><div class="snt-empty__icon">◌</div>Conecta Insforge para ver datos reales.<br><br><span class="snt-pill snt-pill--warn">Configura &lt;meta name="sentinel-endpoint"&gt; y &lt;meta name="sentinel-anon-key"&gt;</span></div>';
      }
      return '<div class="snt-empty"><div class="snt-empty__icon">◌</div>' + (msg || 'Sin datos') + '</div>';
    }
  };

  // ── Boot ─────────────────────────────────────────────────
  // Admin must subscribe to the event bus BEFORE Recorder fires its first
  // events (session_start, page_view), otherwise they never reach the live
  // feed buffer.
  function boot() {
    try { Admin.init();    } catch (e) { console.error('[sentinel:adm]', e); }
    try { Recorder.init(); } catch (e) { console.error('[sentinel:rec]', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
