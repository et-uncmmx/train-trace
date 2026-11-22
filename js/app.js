/* Train Trace — app state, tracing engine, rewards, parent settings. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var STORE = 'trainTrace.v1';
  var ORDER = Glyphs.UPPER.concat(Glyphs.LOWER, Glyphs.NUMBERS);

  // Tolerances in glyph units (cap height = 80 units)
  var STRICT = {
    // tol: how close ink must be to the path; cov: share of path covered; prec: share of ink near the path;
    // len: max ink length vs. path length (stops scribbling over everything); each: min coverage of every single stroke
    trace: { easy: { tol: 11, cov: 0.75, prec: 0.7, len: 2.6, each: 0.65 }, medium: { tol: 9, cov: 0.85, prec: 0.78, len: 2.2, each: 0.7 }, hard: { tol: 7, cov: 0.9, prec: 0.85, len: 1.8, each: 0.75 } },
    write: { easy: { tol: 14, cov: 0.68, prec: 0.65, len: 2.6, each: 0.6 }, medium: { tol: 12, cov: 0.78, prec: 0.72, len: 2.2, each: 0.65 }, hard: { tol: 10, cov: 0.85, prec: 0.8, len: 1.9, each: 0.7 } }
  };
  var PRAISE = ['Great job!', 'Awesome!', 'You did it!', 'Super tracing!', 'Wow, nice work!', 'Choo choo! Great job!', 'Fantastic!'];

  // ---------- state ----------
  function defaults() {
    return {
      settings: { threshold: 3, mode: 'trace', order: 'sequence', strict: 'easy', sound: true, voice: true, guides: true, autoDemo: true,
        enabled: Glyphs.UPPER.concat(Glyphs.NUMBERS) },
      progress: { completed: 0, since: 0, pending: 0, prizes: 0, owned: {}, carOrder: [], counts: {}, seq: 0 }
    };
  }
  var S;
  function load() {
    S = defaults();
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw) {
        Object.assign(S.settings, raw.settings || {});
        Object.assign(S.progress, raw.progress || {});
      }
    } catch (e) { /* storage unavailable */ }
    S.settings.threshold = Math.max(1, Math.min(20, S.settings.threshold | 0 || 3));
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function applyAudio() { Sound.enabled = S.settings.sound; Sound.voice = S.settings.voice; }
  function enabledList() {
    var set = {}; S.settings.enabled.forEach(function (c) { set[c] = 1; });
    var l = ORDER.filter(function (c) { return set[c]; });
    return l.length ? l : ['A'];
  }

  // ---------- screens ----------
  var current = 'home';
  function show(name) {
    $$('.screen').forEach(function (el) { el.classList.toggle('active', el.id === name); });
    current = name;
    if (name === 'world') { renderWorld(); World.start(); } else World.stop();
    if (name === 'practice') { requestAnimationFrame(function () { layoutPad(); if (!cur) nextChar(); else startChar(cur.ch, cur.step, true); }); }
    if (name === 'home') renderHome();
    renderMeters();
  }

  // ---------- meter ----------
  function meterHTML() {
    var th = S.settings.threshold, n = S.progress.since, p = S.progress.pending;
    var h = '';
    if (th <= 10) {
      for (var i = 0; i < th; i++) h += '<span class="slot' + (i < n ? ' on' : '') + '" data-slot="' + i + '">' + (i < n ? '⭐' : '') + '</span>';
    } else {
      h += '<span class="count">' + n + ' / ' + th + '</span><span class="bar"><i style="width:' + (100 * n / th) + '%"></i></span>';
    }
    h += '<button class="gift' + (p ? ' ready' : '') + '" data-action="open-prize" aria-label="Prize">🎁' + (p > 1 ? '<sup>' + p + '</sup>' : '') + '</button>';
    return h;
  }
  function renderMeters(pulseSlot) {
    ['#meter', '#worldMeter', '#homeMeter'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.innerHTML = meterHTML();
      if (pulseSlot != null) { var s = el.querySelector('[data-slot="' + pulseSlot + '"]'); if (s) s.classList.add('pulse'); }
    });
  }

  // ---------- home ----------
  function renderHome() {
    var svg = $('#homeTrain');
    var cars = ['engine', 'tender', 'passenger', 'caboose'];
    svg.innerHTML = '<g class="chug">' + cars.map(function (id, i) {
      return '<g transform="translate(' + (-i * 74) + ',0)">' + World.carDrawing(id) + '</g>';
    }).join('') + '</g><rect x="-180" y="0" width="260" height="4" rx="2" fill="#8d6e63"/>';
  }

  // ---------- tracing pad ----------
  var pad, gCtx, fCtx, iCtx, geo = { s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
  var cur = null;          // { ch, step: 'trace'|'write' }
  var guide = [];          // [{x,y,stroke,covered}]
  var strokes = [];        // resampled guide strokes
  var ink = [];            // array of strokes (glyph units)
  var inkTotal = 0, inkOff = 0;
  var activeId = null, penSeen = false, locked = false, writeTimer = null, demoAnim = null;

  function layoutPad() {
    var r = pad.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    geo.w = r.width; geo.h = r.height; geo.dpr = dpr;
    [gCtx, fCtx, iCtx].forEach(function (c) {
      c.canvas.width = Math.round(r.width * dpr); c.canvas.height = Math.round(r.height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.lineCap = 'round'; c.lineJoin = 'round';
    });
    geo.s = Math.min(r.width / 108, r.height / 128);
    geo.ox = (r.width - 100 * geo.s) / 2;
    geo.oy = (r.height - 125 * geo.s) / 2;
    drawGuide(); redrawInk();
  }
  function X(x) { return geo.ox + x * geo.s; }
  function Y(y) { return geo.oy + y * geo.s; }

  function startChar(ch, step, keepInk) {
    cur = { ch: ch, step: step };
    strokes = Glyphs.strokes(ch, 2);
    guide = [];
    strokes.forEach(function (st, si) { st.forEach(function (p) { guide.push({ x: p[0], y: p[1], s: si, c: false }); }); });
    if (!keepInk) clearInk();
    else recomputeCoverage();
    var label = /[0-9]/.test(ch) ? 'number' : 'letter';
    $('#promptText').textContent = (step === 'trace' ? 'Trace the ' : 'Write the ') + label;
    $('#promptChar').textContent = ch;
    var mc = $('#modelCard');
    mc.hidden = step !== 'write';
    if (step === 'write') mc.innerHTML = modelSVG(ch);
    drawGuide();
    if (!keepInk) {
      Sound.say((step === 'trace' ? 'Trace ' : 'Write ') + Glyphs.spoken(ch));
      if (S.settings.autoDemo) setTimeout(function () { if (cur && cur.ch === ch && !ink.length) demo(); }, 900);
    }
  }
  function modelSVG(ch) {
    var paths = Glyphs.strokes(ch, 3).map(function (st) {
      return '<polyline points="' + st.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#1d3557" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
    return '<svg viewBox="0 0 100 125"><path d="M0,10H100M0,90H100" stroke="#cfe0ff" stroke-width="2"/><path d="M0,50H100" stroke="#cfe0ff" stroke-width="2" stroke-dasharray="5 5"/>' + paths + '</svg>';
  }

  function drawGuide() {
    if (!gCtx) return;
    var c = gCtx, s = geo.s;
    c.clearRect(0, 0, geo.w, geo.h);
    // writing lines
    var lines = [[10, '#9fc3ff', [], 2], [50, '#c4d6f5', [12, 10], 2], [90, '#ff8fa3', [], 3], [120, '#e3e9f3', [8, 10], 2]];
    lines.forEach(function (l) {
      c.beginPath(); c.setLineDash(l[2]); c.strokeStyle = l[1]; c.lineWidth = l[3];
      c.moveTo(12, Y(l[0])); c.lineTo(geo.w - 12, Y(l[0])); c.stroke();
    });
    c.setLineDash([]);
    if (!cur || cur.step !== 'trace') return;
    // road
    strokes.forEach(function (st) {
      c.beginPath(); c.strokeStyle = '#e8edf6'; c.lineWidth = 16 * s;
      st.forEach(function (p, i) { if (i) c.lineTo(X(p[0]), Y(p[1])); else c.moveTo(X(p[0]), Y(p[1])); });
      c.stroke();
    });
    // covered (green)
    c.strokeStyle = 'rgba(46,204,113,.55)'; c.lineWidth = 16 * s;
    for (var i = 0; i < guide.length; i++) {
      var g = guide[i];
      if (!g.c) continue;
      var nx = guide[i + 1];
      c.beginPath(); c.moveTo(X(g.x), Y(g.y));
      if (nx && nx.c && nx.s === g.s) c.lineTo(X(nx.x), Y(nx.y)); else c.lineTo(X(g.x) + 0.1, Y(g.y));
      c.stroke();
    }
    // dotted centre line
    c.setLineDash([2.5 * s, 4 * s]); c.strokeStyle = '#8f9bb3'; c.lineWidth = 2.6 * s;
    strokes.forEach(function (st) {
      c.beginPath();
      st.forEach(function (p, i) { if (i) c.lineTo(X(p[0]), Y(p[1])); else c.moveTo(X(p[0]), Y(p[1])); });
      c.stroke();
    });
    c.setLineDash([]);
    if (!S.settings.guides) return;
    // start dots + arrows
    var placed = [];
    strokes.forEach(function (st, si) {
      var j = 0;
      // if another stroke starts at the same spot, slide this dot a little along its own stroke
      while (j < st.length - 6 && placed.some(function (q) { return Math.hypot(q[0] - st[j][0], q[1] - st[j][1]) < 11; })) j++;
      placed.push(st[j]);
      var p0 = st[j], k = Math.min(st.length - 1, j + 6), p1 = st[k];
      var isDot = st.length < 14 && Math.hypot(st[st.length - 1][0] - p0[0], st[st.length - 1][1] - p0[1]) < 3 && boxSize(st) < 10;
      if (!isDot && k > 0) {
        var ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        var ax = X(p1[0]), ay = Y(p1[1]), L = 4 * s;
        c.fillStyle = '#fb8500';
        c.beginPath();
        c.moveTo(ax + Math.cos(ang) * L, ay + Math.sin(ang) * L);
        c.lineTo(ax + Math.cos(ang + 2.5) * L, ay + Math.sin(ang + 2.5) * L);
        c.lineTo(ax + Math.cos(ang - 2.5) * L, ay + Math.sin(ang - 2.5) * L);
        c.closePath(); c.fill();
      }
      c.beginPath(); c.fillStyle = '#2ecc71'; c.arc(X(p0[0]), Y(p0[1]), 5.2 * s, 0, Math.PI * 2); c.fill();
      c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
      c.fillStyle = '#fff'; c.font = '800 ' + Math.round(6 * s) + 'px ' + getComputedStyle(document.body).fontFamily;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(si + 1), X(p0[0]), Y(p0[1]) + 0.5);
    });
  }
  function boxSize(st) {
    var xs = st.map(function (p) { return p[0]; }), ys = st.map(function (p) { return p[1]; });
    return Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
  }

  function clearInk() {
    ink = []; inkTotal = 0; inkOff = 0;
    guide.forEach(function (g) { g.c = false; });
    if (iCtx) iCtx.clearRect(0, 0, geo.w, geo.h);
    drawGuide();
  }
  function redrawInk() {
    if (!iCtx) return;
    iCtx.clearRect(0, 0, geo.w, geo.h);
    ink.forEach(function (st) {
      for (var i = 0; i < st.length; i++) drawInkSeg(st[i - 1] || st[i], st[i]);
    });
  }
  function drawInkSeg(a, b) {
    iCtx.strokeStyle = '#3a56ff'; iCtx.lineWidth = Math.max(6, 6.5 * geo.s);
    iCtx.beginPath(); iCtx.moveTo(X(a[0]), Y(a[1])); iCtx.lineTo(X(b[0]) + 0.01, Y(b[1])); iCtx.stroke();
  }

  function tol() { return STRICT[cur.step][S.settings.strict] || STRICT[cur.step].easy; }
  function markPoint(p) {
    var t = tol().tol, t2 = t * t, off = (t * 1.5) * (t * 1.5), minD = Infinity;
    for (var i = 0; i < guide.length; i++) {
      var g = guide[i], dx = g.x - p[0], dy = g.y - p[1], d = dx * dx + dy * dy;
      if (d < t2) g.c = true;
      if (d < minD) minD = d;
    }
    inkTotal++; if (minD > off) inkOff++;
  }
  function interp(a, b, fn) {
    var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 1.5));
    for (var i = 1; i <= n; i++) fn([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  }
  function recomputeCoverage() {
    inkTotal = 0; inkOff = 0; guide.forEach(function (g) { g.c = false; });
    if (cur.step !== 'trace') return;
    ink.forEach(function (st) { markPoint(st[0]); for (var i = 1; i < st.length; i++) interp(st[i - 1], st[i], markPoint); });
  }
  function polyLen(st) { var L = 0; for (var i = 1; i < st.length; i++) L += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]); return L; }
  function guideLen() { return Math.max(1, strokes.reduce(function (a, st) { return a + polyLen(st); }, 0)); }
  function inkLength() { return ink.reduce(function (a, st) { return a + polyLen(st); }, 0); }
  function minStrokeCov(flags) {
    var tot = [], hit = [];
    guide.forEach(function (g, i) { tot[g.s] = (tot[g.s] || 0) + 1; if (flags[i]) hit[g.s] = (hit[g.s] || 0) + 1; });
    var m = 1; for (var k = 0; k < tot.length; k++) m = Math.min(m, (hit[k] || 0) / tot[k]);
    return m;
  }
  function coverage() { var n = 0; guide.forEach(function (g) { if (g.c) n++; }); return guide.length ? n / guide.length : 0; }

  // Write mode: normalise the child's writing to the model's bounding box, then score.
  function scoreWrite() {
    var pts = [];
    ink.forEach(function (st) { pts.push(st[0]); for (var i = 1; i < st.length; i++) interp(st[i - 1], st[i], function (p) { pts.push(p); }); });
    if (pts.length < 5) return { cov: 0, prec: 0, len: 0 };
    var bb = function (arr) {
      var a = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      arr.forEach(function (p) { var x = p.x != null ? p.x : p[0], y = p.y != null ? p.y : p[1]; a.x0 = Math.min(a.x0, x); a.x1 = Math.max(a.x1, x); a.y0 = Math.min(a.y0, y); a.y1 = Math.max(a.y1, y); });
      a.w = a.x1 - a.x0; a.h = a.y1 - a.y0; return a;
    };
    var gb = bb(guide), ib = bb(pts);
    if (ib.w < 3 && ib.h < 3) return { cov: 0, prec: 0, len: 0 };
    var sy = ib.h > 3 ? gb.h / ib.h : null, sx = ib.w > 3 ? gb.w / ib.w : null;
    if (gb.w < 15 || sx == null) sx = sy;            // thin glyphs (1, l, I): keep aspect
    if (gb.h < 15 || sy == null) sy = sx;
    if (sx == null) return { cov: 0, prec: 0, len: 0 };
    var gcx = gb.x0 + gb.w / 2, gcy = gb.y0 + gb.h / 2, icx = ib.x0 + ib.w / 2, icy = ib.y0 + ib.h / 2;
    var t = tol().tol, t2 = t * t, off2 = (t * 1.5) * (t * 1.5);
    var covered = guide.map(function () { return false; }), offN = 0;
    pts.forEach(function (p) {
      var x = gcx + (p[0] - icx) * sx, y = gcy + (p[1] - icy) * sy, minD = Infinity;
      for (var i = 0; i < guide.length; i++) {
        var dx = guide[i].x - x, dy = guide[i].y - y, d = dx * dx + dy * dy;
        if (d < t2) covered[i] = true;
        if (d < minD) minD = d;
      }
      if (minD > off2) offN++;
    });
    var cov = covered.filter(Boolean).length / guide.length;
    var inkLen = 0;
    for (var k = 1; k < pts.length; k++) inkLen += Math.hypot((pts[k][0] - pts[k - 1][0]) * sx, (pts[k][1] - pts[k - 1][1]) * sy);
    return { cov: cov, prec: 1 - offN / pts.length, len: inkLen / guideLen(), each: minStrokeCov(covered) };
  }

  function evaluate(fromButton) {
    if (!cur || locked) return;
    var need = tol();
    var r = cur.step === 'trace' ? { cov: coverage(), prec: inkTotal ? 1 - inkOff / inkTotal : 0, len: inkLength() / guideLen(), each: minStrokeCov(guide.map(function (g) { return g.c; })) } : scoreWrite();
    var neat = r.prec >= need.prec && r.len <= need.len;
    var full = r.cov >= need.cov && r.each >= need.each;
    if (full && neat) return success();
    if (cur.step === 'trace' && full && !neat) return gentleFail('Stay on the dotted path!');
    if (fromButton) {
      if (!ink.length) return message(cur.step === 'trace' ? 'Follow the dots with your finger!' : 'Write it in the big box!');
      if (cur.step === 'trace') return message('Keep going — make it all green!');
      return gentleFail("Let's try again!");
    }
  }
  function message(t, ms) {
    var m = $('#padMsg'); m.textContent = t; m.hidden = false;
    clearTimeout(message.t); message.t = setTimeout(function () { m.hidden = true; }, ms || 1800);
    Sound.say(t.replace('—', ','));
  }
  function gentleFail(t) {
    Sound.oops(); message(t);
    pad.classList.remove('shake'); void pad.offsetWidth; pad.classList.add('shake');
    locked = true;
    setTimeout(function () { locked = false; clearInk(); }, 900);
  }

  function success() {
    locked = true;
    var p = S.progress, ch = cur.ch;
    p.completed++; p.counts[ch] = (p.counts[ch] || 0) + 1;
    p.since++;
    var earned = false;
    if (p.since >= S.settings.threshold) { p.since = 0; p.pending++; earned = true; }
    save();
    Sound.chime(); setTimeout(function () { Sound.star(); }, 350);
    Sound.say(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    confetti();
    renderMeters(earned ? null : p.since - 1);
    // flash ink green
    iCtx.globalCompositeOperation = 'source-atop'; iCtx.fillStyle = 'rgba(46,204,113,.85)'; iCtx.fillRect(0, 0, geo.w, geo.h); iCtx.globalCompositeOperation = 'source-over';
    setTimeout(function () {
      locked = false;
      if (earned) openReward();
      else advance();
    }, 1700);
  }
  function advance() {
    if (S.settings.mode === 'both' && cur.step === 'trace') return startChar(cur.ch, 'write');
    nextChar();
  }
  function firstStep() { return S.settings.mode === 'write' ? 'write' : 'trace'; }
  function nextChar() {
    var list = enabledList(), ch;
    if (S.settings.order === 'shuffle') {
      do { ch = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && cur && ch === cur.ch);
    } else {
      S.progress.seq = (S.progress.seq || 0) % list.length;
      ch = list[S.progress.seq];
      S.progress.seq = (S.progress.seq + 1) % list.length;
      save();
    }
    startChar(ch, firstStep());
  }

  // ---------- demo ("Show me") ----------
  function stopDemo() { if (demoAnim) { cancelAnimationFrame(demoAnim); demoAnim = null; } fCtx.clearRect(0, 0, geo.w, geo.h); }
  function demo() {
    stopDemo();
    var all = Glyphs.strokes(cur.ch, 1.5), si = 0, idx = 0, t0 = null, s = geo.s;
    var speed = 0.11; // points per ms
    function step(ts) {
      if (t0 == null) t0 = ts;
      var target = Math.floor((ts - t0) * speed);
      fCtx.clearRect(0, 0, geo.w, geo.h);
      fCtx.lineCap = 'round'; fCtx.lineJoin = 'round';
      var done = true, head = null;
      for (var k = 0; k < all.length; k++) {
        var st = all[k], n = k < si ? st.length : (k === si ? Math.min(st.length, idx) : 0);
        if (n > 1) {
          fCtx.strokeStyle = 'rgba(251,133,0,.8)'; fCtx.lineWidth = 6 * s;
          fCtx.beginPath(); fCtx.moveTo(X(st[0][0]), Y(st[0][1]));
          for (var i = 1; i < n; i++) fCtx.lineTo(X(st[i][0]), Y(st[i][1]));
          fCtx.stroke();
        }
        if (k === si) head = st[Math.max(0, Math.min(st.length - 1, idx - 1))];
      }
      idx = target;
      if (si < all.length && idx >= all[si].length) { si++; t0 = ts + 250; idx = 0; }
      if (si < all.length) done = false;
      if (head) {
        fCtx.font = Math.round(13 * s) + 'px sans-serif'; fCtx.textAlign = 'center'; fCtx.textBaseline = 'middle';
        fCtx.fillText('🚂', X(head[0]), Y(head[1]) - 2 * s);
      }
      if (!done) demoAnim = requestAnimationFrame(step);
      else { demoAnim = null; setTimeout(function () { if (!demoAnim) { fCtx.clearRect(0, 0, geo.w, geo.h); } }, 700); }
    }
    demoAnim = requestAnimationFrame(step);
  }

  // ---------- pointer input ----------
  function toGlyph(e) {
    var r = pad.getBoundingClientRect();
    return [(e.clientX - r.left - geo.ox) / geo.s, (e.clientY - r.top - geo.oy) / geo.s];
  }
  function bindPad() {
    var cv = $('#inkCanvas');
    cv.addEventListener('pointerdown', function (e) {
      Sound.unlock();
      if (locked || !cur) return;
      if (e.pointerType === 'pen') penSeen = true;
      if (penSeen && e.pointerType === 'touch') return;       // palm rejection when using Apple Pencil
      if (activeId !== null) return;
      activeId = e.pointerId;
      try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      clearTimeout(writeTimer); stopDemo(); $('#padMsg').hidden = true;
      var p = toGlyph(e);
      ink.push([p]);
      if (cur.step === 'trace') { markPoint(p); drawGuide(); }
      drawInkSeg(p, p);
      e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerId !== activeId) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!evs.length) evs = [e];
      var st = ink[ink.length - 1], changed = false;
      evs.forEach(function (ev) {
        var p = toGlyph(ev), last = st[st.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.6) return;
        st.push(p); drawInkSeg(last, p);
        if (cur.step === 'trace') { interp(last, p, markPoint); changed = true; }
      });
      if (changed) drawGuide();
      e.preventDefault();
    });
    function end(e) {
      if (e.pointerId !== activeId) return;
      activeId = null;
      if (cur.step === 'trace') evaluate(false);
      else { clearTimeout(writeTimer); writeTimer = setTimeout(function () { evaluate(false); }, 1300); }
    }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('lostpointercapture', end);
  }

  // ---------- confetti ----------
  function confetti() {
    var box = $('#confetti'), cols = ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#2ecc71', '#fb5607'];
    var h = '<span class="big-star">⭐</span>';
    for (var i = 0; i < 40; i++) {
      h += '<i style="left:' + (Math.random() * 100) + '%;background:' + cols[i % cols.length] + ';animation-delay:' + (Math.random() * 0.4).toFixed(2) + 's;animation-duration:' + (1.2 + Math.random()).toFixed(2) + 's"></i>';
    }
    box.innerHTML = h;
    clearTimeout(confetti.t); confetti.t = setTimeout(function () { box.innerHTML = ''; }, 2600);
  }

  // ---------- rewards ----------
  function available() {
    var o = S.progress.owned;
    return World.PIECES.filter(function (p) {
      if ((o[p.id] || 0) >= p.max) return false;
      if (p.requires && !o[p.requires]) return false;
      return true;
    });
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickOptions() {
    var av = available();
    if (!S.progress.owned.engine) return [World.byId.engine];
    var cars = shuffle(av.filter(function (p) { return p.type === 'car'; }));
    var scen = shuffle(av.filter(function (p) { return p.type === 'scenery' && !p.filler; }));
    var fill = av.filter(function (p) { return p.filler; });
    var out = [];
    if (cars.length) out.push(cars.shift());
    while (out.length < 3 && scen.length) out.push(scen.shift());
    while (out.length < 3 && cars.length) out.push(cars.shift());
    if (out.length < 3 && fill.length) out.push(fill[0]);
    return shuffle(out);
  }
  function openReward() {
    if (S.progress.pending <= 0) { if (current === 'practice') advance(); return; }
    var opts = pickOptions();
    if (!opts.length) { // everything collected: keep the count but nothing to add
      S.progress.pending = 0; save(); renderMeters(); if (current === 'practice') advance(); return;
    }
    Sound.fanfare();
    Sound.say(opts.length === 1 ? 'You earned a prize! Your very own train engine!' : 'You earned a prize! Pick one!');
    var box = $('#rewardOptions');
    box.innerHTML = opts.map(function (p) {
      return '<button class="reward-opt" data-piece="' + p.id + '">' + World.thumb(p.id) + '<span>' + p.name + '</span></button>';
    }).join('');
    $('#rewardModal').hidden = false;
  }
  function claim(id) {
    var p = S.progress, piece = World.byId[id];
    var idx = p.owned[id] || 0;
    p.owned[id] = idx + 1;
    if (piece.type === 'car') p.carOrder.push(id);
    p.pending = Math.max(0, p.pending - 1);
    p.prizes++;
    save();
    $('#rewardModal').hidden = true;
    var hl = { id: id, index: idx };
    if (piece.type === 'car') hl.car = nthIndex(World.trainCars(p.owned, p.carOrder), id, idx);
    pendingHighlight = hl;
    show('world');
    Sound.pop();
    setTimeout(function () { Sound.say('You got a ' + piece.name + '!'); if (piece.type === 'car') Sound.toot(); }, 400);
  }
  function nthIndex(arr, v, n) { for (var i = 0, k = 0; i < arr.length; i++) if (arr[i] === v && k++ === n) return i; return -1; }

  // ---------- world ----------
  var pendingHighlight = null;
  function renderWorld() {
    World.build($('#worldSvg'), S.progress, pendingHighlight);
    pendingHighlight = null;
    var hint = $('#worldHint'), p = S.progress, left = S.settings.threshold - p.since;
    if (p.pending > 0) { hint.innerHTML = '🎁 You have a prize waiting! Tap the present.'; hint.hidden = false; }
    else if (!p.owned.engine) { hint.innerHTML = 'Trace ' + left + ' more to earn your first train engine! 🚂'; hint.hidden = false; }
    else { hint.hidden = true; }
  }
  function bindWorld() {
    $('#worldSvg').addEventListener('pointerdown', function (e) {
      Sound.unlock();
      var car = e.target.closest('.car');
      if (car) { World.boost(); Sound.toot(); wiggle(car); return; }
      var pc = e.target.closest('.piece');
      if (pc) { Sound.pop(); wiggle(pc); }
    });
  }
  function wiggle(el) {
    var w = el.querySelector('.wig'); if (!w) return;
    w.classList.remove('wiggle'); void w.getBoundingClientRect(); w.classList.add('wiggle');
  }

  // ---------- kid character picker ----------
  function openPick() {
    $('#pickGrid').innerHTML = enabledList().map(function (c) { return '<button data-ch="' + c + '">' + c + '</button>'; }).join('');
    $('#pickModal').hidden = false;
  }

  // ---------- parent gate ----------
  var gate = { a: 0, input: '' };
  function openGate() {
    var x = 3 + Math.floor(Math.random() * 7), y = 3 + Math.floor(Math.random() * 7);
    gate.a = x * y; gate.input = '';
    $('#gateQ').textContent = x + ' × ' + y + ' = ?';
    $('#gateDisplay').innerHTML = '&nbsp;';
    $('#gateKeys').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'OK'].map(function (k) {
      return '<button data-key="' + k + '"' + (k === 'OK' ? ' class="ok"' : '') + '>' + k + '</button>';
    }).join('');
    $('#gateModal').hidden = false;
  }
  function gateKey(k) {
    var d = $('#gateDisplay');
    if (k === '⌫') gate.input = gate.input.slice(0, -1);
    else if (k === 'OK') {
      if (parseInt(gate.input, 10) === gate.a) { $('#gateModal').hidden = true; openSettings(); return; }
      d.classList.remove('bad'); void d.offsetWidth; d.classList.add('bad'); gate.input = '';
    } else if (gate.input.length < 3) gate.input += k;
    d.innerHTML = gate.input || '&nbsp;';
  }

  // ---------- settings ----------
  function openSettings() { renderSettings(); $('#settingsModal').hidden = false; }
  function renderSettings() {
    var st = S.settings, p = S.progress;
    $('#thRange').value = st.threshold; $('#thVal').textContent = st.threshold;
    $$('.seg').forEach(function (seg) {
      var key = seg.getAttribute('data-setting');
      $$('.seg[data-setting="' + key + '"] button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st[key]); });
    });
    $$('[data-bool]').forEach(function (cb) { cb.checked = !!st[cb.getAttribute('data-bool')]; });
    var on = {}; st.enabled.forEach(function (c) { on[c] = 1; });
    $$('.chips button').forEach(function (b) {
      var g = Glyphs[b.getAttribute('data-group')], n = g.filter(function (c) { return on[c]; }).length;
      b.classList.toggle('on', n === g.length); b.classList.toggle('part', n > 0 && n < g.length);
    });
    $('#charToggles').innerHTML = ORDER.map(function (c) {
      var n = p.counts[c] || 0;
      return '<button class="' + (on[c] ? 'on' : '') + '" data-toggle="' + c + '">' + c + (n ? '<i>' + n + '</i>' : '') + '</button>';
    }).join('');
    var ownedN = 0; Object.keys(p.owned).forEach(function (k) { ownedN += p.owned[k]; });
    $('#stats').innerHTML =
      '<div><b>' + p.completed + '</b>completed</div>' +
      '<div><b>' + ownedN + '</b>train pieces</div>' +
      '<div><b>' + p.since + ' / ' + st.threshold + '</b>to next prize</div>' +
      '<div><b>' + p.pending + '</b>prizes waiting</div>';
    $('#offlineStatus').textContent = offlineMsg;
  }
  function setThreshold(v) {
    S.settings.threshold = Math.max(1, Math.min(20, v));
    if (S.progress.since >= S.settings.threshold) { S.progress.since = 0; S.progress.pending++; }
    save(); renderSettings(); renderMeters();
  }
  function bindSettings() {
    $('#thRange').addEventListener('input', function (e) { setThreshold(parseInt(e.target.value, 10)); });
    $$('[data-th]').forEach(function (b) { b.addEventListener('click', function () { setThreshold(S.settings.threshold + parseInt(b.getAttribute('data-th'), 10)); }); });
    $$('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.parentNode.getAttribute('data-setting');
        S.settings[key] = b.getAttribute('data-v'); save(); renderSettings();
        if (key === 'mode' && cur) cur = null; // restart with new mode
      });
    });
    $$('[data-bool]').forEach(function (cb) {
      cb.addEventListener('change', function () { S.settings[cb.getAttribute('data-bool')] = cb.checked; save(); applyAudio(); drawGuide(); });
    });
    $$('.chips button').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = Glyphs[b.getAttribute('data-group')], set = {};
        S.settings.enabled.forEach(function (c) { set[c] = 1; });
        var all = g.every(function (c) { return set[c]; });
        g.forEach(function (c) { if (all) delete set[c]; else set[c] = 1; });
        S.settings.enabled = ORDER.filter(function (c) { return set[c]; });
        S.progress.seq = 0; save(); renderSettings();
      });
    });
    $('#charToggles').addEventListener('click', function (e) {
      var b = e.target.closest('[data-toggle]'); if (!b) return;
      var c = b.getAttribute('data-toggle'), i = S.settings.enabled.indexOf(c);
      if (i >= 0) S.settings.enabled.splice(i, 1); else S.settings.enabled.push(c);
      S.settings.enabled = ORDER.filter(function (x) { return S.settings.enabled.indexOf(x) >= 0; });
      save(); renderSettings();
    });
  }

  // ---------- actions ----------
  var actions = {
    practice: function () { show('practice'); },
    world: function () { show('world'); },
    home: function () { show('home'); },
    parent: openGate,
    'close-gate': function () { $('#gateModal').hidden = true; },
    'close-settings': function () {
      $('#settingsModal').hidden = true;
      if (current === 'practice') { if (!cur || enabledList().indexOf(cur.ch) < 0) nextChar(); else startChar(cur.ch, cur.step, true); }
      if (current === 'world') renderWorld();
      renderMeters();
    },
    speak: function () { if (cur) Sound.say((cur.step === 'trace' ? 'Trace ' : 'Write ') + Glyphs.spoken(cur.ch)); },
    demo: function () { if (cur) { clearInk(); demo(); } },
    erase: function () { stopDemo(); clearInk(); Sound.pop(); },
    skip: function () { stopDemo(); nextChar(); },
    done: function () { clearTimeout(writeTimer); evaluate(true); },
    pick: openPick,
    'close-pick': function () { $('#pickModal').hidden = true; },
    'open-prize': function () { if (S.progress.pending > 0) openReward(); else Sound.say((S.settings.threshold - S.progress.since) + ' more to your next prize!'); },
    'give-prize': function () { S.progress.pending++; save(); renderSettings(); renderMeters(); },
    'reset-world': function () {
      if (!confirm('Remove all train pieces? (Completed counts are kept.)')) return;
      S.progress.owned = {}; S.progress.carOrder = []; S.progress.prizes = 0; save(); renderSettings(); renderMeters();
    },
    'reset-all': function () {
      if (!confirm('Reset ALL progress and settings?')) return;
      try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
      load(); applyAudio(); cur = null; renderSettings(); renderMeters();
    }
  };
  function bindActions() {
    document.addEventListener('click', function (e) {
      Sound.unlock();
      var a = e.target.closest('[data-action]');
      if (a && actions[a.getAttribute('data-action')]) { actions[a.getAttribute('data-action')](); return; }
      var opt = e.target.closest('[data-piece]');
      if (opt) { claim(opt.getAttribute('data-piece')); return; }
      var ch = e.target.closest('#pickGrid [data-ch]');
      if (ch) { $('#pickModal').hidden = true; stopDemo(); startChar(ch.getAttribute('data-ch'), firstStep()); return; }
      var key = e.target.closest('#gateKeys [data-key]');
      if (key) gateKey(key.getAttribute('data-key'));
    });
  }

  // ---------- offline ----------
  var offlineMsg = '';
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) {
      offlineMsg = location.protocol === 'file:' ? 'Running from a local file — works offline as-is.' : '';
      return;
    }
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      offlineMsg = 'Offline mode is ready ✓';
      return reg;
    }).catch(function () { offlineMsg = 'Offline cache unavailable in this browser.'; });
  }

  // ---------- init ----------
  function init() {
    load(); applyAudio();
    pad = $('#pad');
    gCtx = $('#guideCanvas').getContext('2d');
    fCtx = $('#fxCanvas').getContext('2d');
    iCtx = $('#inkCanvas').getContext('2d');
    bindPad(); bindWorld(); bindSettings(); bindActions();
    window.addEventListener('resize', function () { if (current === 'practice') layoutPad(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    show('home');
    registerSW();
  }
  // test hook
  window.TrainTrace = { get state() { return S; }, get current() { return cur; }, geo: geo, save: save };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
