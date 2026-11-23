/* Train Trace — glyph stroke data.
 * Coordinate box: x 0..100, y 0..125.
 * Writing lines: top 10, midline 50, baseline 90, descender 120.
 * Arc angles are degrees; x = cx + rx*cos(a), y = cy + ry*sin(a).
 * Increasing angle = clockwise on screen, decreasing = counter-clockwise.
 */
(function () {
  function B() {
    var p = [];
    var o = {
      m: function (x, y) { p.push([x, y]); return o; },
      l: function (x, y) { p.push([x, y]); return o; },
      a: function (cx, cy, rx, ry, a0, a1) {
        var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 5));
        for (var i = 0; i <= n; i++) {
          var t = (a0 + (a1 - a0) * (i / n)) * Math.PI / 180;
          p.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
        }
        return o;
      },
      pts: p
    };
    return o;
  }
  function g() { return Array.prototype.slice.call(arguments).map(function (b) { return b.pts; }); }
  var bowl = function () { return B().a(50, 70, 20, 20, -30, -390); }; // lowercase a/d/g/q bowl
  var dot = function (x) { return B().a(x, 32, 3, 3, 0, 360); };

  var G = {
    // ---------- Uppercase ----------
    A: g(B().m(50, 10).l(20, 90), B().m(50, 10).l(80, 90), B().m(32, 62).l(68, 62)),
    B: g(B().m(25, 10).l(25, 90), B().m(25, 10).l(52, 10).a(52, 30, 18, 20, -90, 90).l(25, 50), B().m(25, 50).l(55, 50).a(55, 70, 20, 20, -90, 90).l(25, 90)),
    C: g(B().a(55, 50, 35, 40, -40, -320)),
    D: g(B().m(25, 10).l(25, 90), B().m(25, 10).l(45, 10).a(45, 50, 35, 40, -90, 90).l(25, 90)),
    E: g(B().m(25, 10).l(25, 90), B().m(25, 10).l(75, 10), B().m(25, 50).l(65, 50), B().m(25, 90).l(75, 90)),
    F: g(B().m(25, 10).l(25, 90), B().m(25, 10).l(75, 10), B().m(25, 50).l(65, 50)),
    G: g(B().a(55, 50, 35, 40, -40, -360).l(62, 50)),
    H: g(B().m(25, 10).l(25, 90), B().m(75, 10).l(75, 90), B().m(25, 50).l(75, 50)),
    I: g(B().m(50, 10).l(50, 90), B().m(30, 10).l(70, 10), B().m(30, 90).l(70, 90)),
    J: g(B().m(65, 10).l(65, 68).a(45, 68, 20, 22, 0, 180)),
    K: g(B().m(25, 10).l(25, 90), B().m(75, 10).l(25, 56), B().m(40, 44).l(77, 90)),
    L: g(B().m(25, 10).l(25, 90).l(75, 90)),
    M: g(B().m(18, 90).l(18, 10), B().m(18, 10).l(50, 64).l(82, 10).l(82, 90)),
    N: g(B().m(25, 90).l(25, 10), B().m(25, 10).l(75, 90).l(75, 10)),
    O: g(B().a(50, 50, 32, 40, -90, -450)),
    P: g(B().m(25, 10).l(25, 90), B().m(25, 10).l(52, 10).a(52, 30, 20, 20, -90, 90).l(25, 50)),
    Q: g(B().a(50, 50, 32, 40, -90, -450), B().m(56, 66).l(82, 94)),
    R: g(B().m(25, 10).l(25, 90), B().m(25, 10).l(52, 10).a(52, 30, 20, 20, -90, 90).l(25, 50), B().m(45, 50).l(75, 90)),
    S: g(B().a(50, 30, 24, 20, -20, -270).a(50, 70, 26, 20, -90, 155)),
    T: g(B().m(20, 10).l(80, 10), B().m(50, 10).l(50, 90)),
    U: g(B().m(25, 10).l(25, 62).a(50, 62, 25, 28, 180, 0).l(75, 10)),
    V: g(B().m(20, 10).l(50, 90).l(80, 10)),
    W: g(B().m(12, 10).l(30, 90).l(50, 30).l(70, 90).l(88, 10)),
    X: g(B().m(22, 10).l(78, 90), B().m(78, 10).l(22, 90)),
    Y: g(B().m(22, 10).l(50, 50), B().m(78, 10).l(50, 50).l(50, 90)),
    Z: g(B().m(22, 10).l(78, 10).l(22, 90).l(78, 90)),

    // ---------- Lowercase ----------
    a: g(bowl(), B().m(70, 50).l(70, 90)),
    b: g(B().m(30, 10).l(30, 90), B().a(50, 70, 20, 20, 180, 540)),
    c: g(B().a(52, 70, 20, 20, -40, -320)),
    d: g(bowl(), B().m(70, 10).l(70, 90)),
    e: g(B().m(30, 70).l(70, 70).a(50, 70, 20, 20, 0, -310)),
    f: g(B().a(60, 28, 14, 16, -20, -180).l(46, 90), B().m(32, 50).l(66, 50)),
    g: g(bowl(), B().m(70, 50).l(70, 105).a(50, 105, 20, 15, 0, 160)),
    h: g(B().m(30, 10).l(30, 90), B().a(50, 68, 20, 18, 180, 360).l(70, 90)),
    i: g(B().m(50, 50).l(50, 90), dot(50)),
    j: g(B().m(56, 50).l(56, 105).a(38, 105, 18, 15, 0, 160), dot(56)),
    k: g(B().m(30, 10).l(30, 90), B().m(68, 48).l(30, 72), B().m(44, 64).l(70, 90)),
    l: g(B().m(50, 10).l(50, 90)),
    m: g(B().m(18, 50).l(18, 90), B().a(34, 64, 16, 14, 180, 360).l(50, 90), B().a(66, 64, 16, 14, 180, 360).l(82, 90)),
    n: g(B().m(30, 50).l(30, 90), B().a(50, 68, 20, 18, 180, 360).l(70, 90)),
    o: g(B().a(50, 70, 20, 20, -90, -450)),
    p: g(B().m(30, 50).l(30, 120), B().a(50, 70, 20, 20, 180, 540)),
    q: g(bowl(), B().m(70, 50).l(70, 120)),
    r: g(B().m(36, 50).l(36, 90), B().a(56, 68, 20, 18, 180, 300)),
    s: g(B().a(50, 60, 16, 10, -25, -270).a(50, 80, 18, 10, -90, 155)),
    t: g(B().m(50, 18).l(50, 90), B().m(32, 48).l(68, 48)),
    u: g(B().m(30, 50).l(30, 72).a(50, 72, 20, 18, 180, 0).l(70, 50), B().m(70, 50).l(70, 90)),
    v: g(B().m(25, 50).l(50, 90).l(75, 50)),
    w: g(B().m(15, 50).l(32, 90).l(50, 60).l(68, 90).l(85, 50)),
    x: g(B().m(28, 50).l(72, 90), B().m(72, 50).l(28, 90)),
    y: g(B().m(28, 50).l(50, 90), B().m(72, 50).l(35, 120)),
    z: g(B().m(28, 50).l(72, 50).l(28, 90).l(72, 90)),

    // ---------- Numbers ----------
    '0': g(B().a(50, 50, 28, 40, -90, -450)),
    '1': g(B().m(50, 10).l(50, 90)),
    '2': g(B().a(50, 33, 26, 23, -165, 25).l(22, 90).l(80, 90)),
    '3': g(B().a(48, 30, 24, 20, -160, 90).a(48, 70, 27, 20, -90, 160)),
    '4': g(B().m(28, 10).l(22, 60).l(80, 60), B().m(65, 10).l(65, 90)),
    '5': g(B().m(32, 10).l(30, 46).a(50, 66, 25, 24, -127, 150), B().m(32, 10).l(72, 10)),
    '6': g(B().a(62, 68, 34, 58, -78, -180).a(50, 68, 22, 22, 180, -180)),
    '7': g(B().m(20, 10).l(80, 10).l(40, 90)),
    '8': g(B().a(50, 30, 22, 20, -30, -270).a(50, 70, 26, 20, -90, 270).a(50, 30, 22, 20, 90, -30)),
    '9': g(B().a(50, 32, 22, 22, 0, -360).l(72, 90))
  };

  // Resample a polyline to evenly spaced points.
  function resample(pts, step) {
    var out = [pts[0].slice()];
    var carry = 0;
    for (var i = 1; i < pts.length; i++) {
      var x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1];
      var d = Math.hypot(x1 - x0, y1 - y0);
      if (d === 0) continue;
      var t = step - carry;
      while (t <= d) {
        out.push([x0 + (x1 - x0) * t / d, y0 + (y1 - y0) * t / d]);
        t += step;
      }
      carry = d - (t - step);
    }
    var last = pts[pts.length - 1];
    var lo = out[out.length - 1];
    if (Math.hypot(last[0] - lo[0], last[1] - lo[1]) > step * 0.3) out.push(last.slice());
    return out;
  }

  var NAMES = {
    A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'eff', G: 'jee', H: 'aitch', I: 'eye', J: 'jay',
    K: 'kay', L: 'el', M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'cue', R: 'ar', S: 'ess', T: 'tee',
    U: 'you', V: 'vee', W: 'double you', X: 'ex', Y: 'why', Z: 'zee',
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
  };

  window.Glyphs = {
    raw: G,
    resample: resample,
    strokes: function (ch, step) {
      return (G[ch] || G.A).map(function (s) { return resample(s, step || 2); });
    },
    spoken: function (ch) {
      if (/[0-9]/.test(ch)) return 'the number ' + NAMES[ch];
      if (/[a-z]/.test(ch)) return 'little ' + NAMES[ch.toUpperCase()];
      return 'big ' + NAMES[ch];
    },
    UPPER: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    LOWER: 'abcdefghijklmnopqrstuvwxyz'.split(''),
    NUMBERS: '0123456789'.split('')
  };
})();
