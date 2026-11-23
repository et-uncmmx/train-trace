/* Train Trace — the train world: reward pieces, scene rendering, animation. */
(function () {
  var W = 1000, H = 620;
  var R = 170, CX1 = 240, CX2 = 760, CY = 320, TOP = CY - R, BOT = CY + R;
  var STRAIGHT = CX2 - CX1, CURVE = Math.PI * R, TOTAL = 2 * STRAIGHT + 2 * CURVE;
  var CAR_GAP = 74;

  function trackAt(s) {
    s = ((s % TOTAL) + TOTAL) % TOTAL;
    if (s < STRAIGHT) return { x: CX1 + s, y: TOP, dx: 1 };
    s -= STRAIGHT;
    if (s < CURVE) { var t = -Math.PI / 2 + s / R; return { x: CX2 + R * Math.cos(t), y: CY + R * Math.sin(t), dx: -Math.sin(t) }; }
    s -= CURVE;
    if (s < STRAIGHT) return { x: CX2 - s, y: BOT, dx: -1 };
    s -= STRAIGHT;
    var t2 = Math.PI / 2 + s / R;
    return { x: CX1 + R * Math.cos(t2), y: CY + R * Math.sin(t2), dx: -Math.sin(t2) };
  }

  function stadium(r) {
    return 'M' + CX1 + ',' + (CY - r) + ' H' + CX2 + ' A' + r + ',' + r + ' 0 0 1 ' + CX2 + ',' + (CY + r) +
      ' H' + CX1 + ' A' + r + ',' + r + ' 0 0 1 ' + CX1 + ',' + (CY - r) + ' Z';
  }

  // ---------- Drawings (local coords; cars: origin = wheel bottom centre, facing right) ----------
  function wheels(xs, r) {
    return xs.map(function (x) {
      return '<circle cx="' + x + '" cy="' + (-r) + '" r="' + r + '" fill="#333"/><circle cx="' + x + '" cy="' + (-r) + '" r="' + (r * 0.4) + '" fill="#ffd23f"/>';
    }).join('');
  }
  function carBase(color, extra) {
    return '<rect x="-30" y="-12" width="60" height="5" rx="2" fill="#444"/>' +
      '<rect x="-33" y="-12" width="4" height="3" fill="#444"/><rect x="29" y="-12" width="4" height="3" fill="#444"/>' +
      extra + wheels([-17, 17], 7);
  }
  var ENGINE_COLORS = [
    { id: 'red', name: 'Red', c: '#e63946' }, { id: 'blue', name: 'Blue', c: '#3a86ff' },
    { id: 'green', name: 'Green', c: '#2a9d4a' }, { id: 'yellow', name: 'Yellow', c: '#ffbe0b', trim: '#e63946' },
    { id: 'orange', name: 'Orange', c: '#fb8500' }, { id: 'purple', name: 'Purple', c: '#8338ec' },
    { id: 'pink', name: 'Pink', c: '#ff5fa2' }, { id: 'teal', name: 'Teal', c: '#13a89e' },
    { id: 'black', name: 'Black', c: '#3d405b' }, { id: 'brown', name: 'Brown', c: '#9c6644' }
  ];
  function engineColor(id) { return ENGINE_COLORS.filter(function (e) { return e.id === id; })[0] || ENGINE_COLORS[0]; }
  var D = {
    engine: function (i, colorId) {
      var ec = engineColor(colorId), trim = ec.trim || '#ffd23f';
      return '<g>' +
        '<rect x="-31" y="-46" width="26" height="6" rx="2" fill="#2b2b2b"/>' +
        '<rect x="-29" y="-41" width="22" height="31" rx="3" fill="' + ec.c + '"/>' +
        '<rect x="-25" y="-37" width="13" height="11" rx="2" fill="#bde8ff" stroke="#fff" stroke-width="1.5"/>' +
        '<rect x="-8" y="-31" width="36" height="21" rx="10" fill="' + ec.c + '"/>' +
        '<rect x="-8" y="-24" width="36" height="3" fill="' + trim + '"/>' +
        '<rect x="13" y="-46" width="9" height="16" fill="#2b2b2b"/><rect x="10" y="-50" width="15" height="6" rx="2" fill="#2b2b2b"/>' +
        '<circle cx="2" cy="-32" r="5" fill="' + trim + '"/>' +
        '<circle cx="29" cy="-21" r="3.5" fill="#fff6a8" stroke="#2b2b2b" stroke-width="1"/>' +
        '<rect x="-33" y="-12" width="64" height="5" rx="2" fill="#2b2b2b"/>' +
        '<polygon points="31,-12 40,0 28,0" fill="#2b2b2b"/>' +
        wheels([-20], 9) + wheels([2, 19], 6) +
        '</g>';
    },
    tender: function () {
      return carBase('#333', '<rect x="-27" y="-30" width="54" height="19" rx="3" fill="#3a3a3a"/>' +
        '<path d="M-24,-30 Q-14,-42 -4,-32 Q6,-44 14,-32 Q20,-40 24,-30 Z" fill="#111"/>' +
        '<rect x="-27" y="-22" width="54" height="3" fill="#ffd23f"/>');
    },
    passenger: function (i) {
      var c = i % 2 ? '#2a9d8f' : '#3a86ff';
      var faces = ['#ffd166', '#f4a261', '#c68b59'];
      var win = [-18, 0, 18].map(function (x, k) {
        return '<rect x="' + (x - 6) + '" y="-36" width="12" height="12" rx="3" fill="#bde8ff"/>' +
          (k !== 1 ? '<circle cx="' + x + '" cy="-29" r="4" fill="' + faces[(k + i) % 3] + '"/><circle cx="' + (x - 1.4) + '" cy="-30" r=".8" fill="#222"/><circle cx="' + (x + 1.4) + '" cy="-30" r=".8" fill="#222"/>' : '');
      }).join('');
      return carBase(c, '<rect x="-30" y="-44" width="60" height="6" rx="3" fill="#264653"/>' +
        '<rect x="-28" y="-40" width="56" height="29" rx="4" fill="' + c + '"/>' + win);
    },
    boxcar: function (i) {
      var c = i % 2 ? '#8338ec' : '#fb8500';
      return carBase(c, '<rect x="-28" y="-42" width="56" height="31" rx="3" fill="' + c + '"/>' +
        '<rect x="-9" y="-38" width="18" height="24" fill="rgba(0,0,0,.15)"/>' +
        '<path d="M-9,-38 L9,-14 M9,-38 L-9,-14" stroke="rgba(255,255,255,.5)" stroke-width="2"/>' +
        '<rect x="-30" y="-45" width="60" height="5" rx="2" fill="#5a3e2b"/>');
    },
    tanker: function () {
      return carBase('#aaa', '<rect x="-28" y="-36" width="56" height="25" rx="12" fill="#cfd8dc" stroke="#90a4ae" stroke-width="2"/>' +
        '<rect x="-4" y="-41" width="8" height="6" rx="1" fill="#90a4ae"/>' +
        '<text x="0" y="-18" font-size="11" text-anchor="middle" fill="#e63946" font-weight="bold">MILK</text>');
    },
    logcar: function () {
      var logs = [[-12, -18], [12, -18], [0, -29]].map(function (p) {
        return '<rect x="' + (p[0] - 16) + '" y="' + (p[1] - 6) + '" width="32" height="12" rx="6" fill="#8d5524"/>' +
          '<circle cx="' + (p[0] + 16) + '" cy="' + p[1] + '" r="6" fill="#e0ac69" stroke="#8d5524" stroke-width="2"/>';
      }).join('');
      return carBase('#6d4c41', '<rect x="-29" y="-14" width="58" height="4" fill="#6d4c41"/>' +
        '<rect x="-29" y="-36" width="3" height="24" fill="#6d4c41"/><rect x="26" y="-36" width="3" height="24" fill="#6d4c41"/>' + logs);
    },
    giraffe: function () {
      return carBase('#f4a261', '<rect x="-29" y="-26" width="58" height="15" rx="2" fill="#e9c46a"/>' +
        '<path d="M-27,-26 V-11 M-15,-26 V-11 M-3,-26 V-11 M9,-26 V-11 M21,-26 V-11" stroke="#b5838d" stroke-width="2"/>' +
        '<rect x="0" y="-62" width="7" height="38" rx="3" fill="#f4c542"/>' +
        '<ellipse cx="8" cy="-64" rx="10" ry="6" fill="#f4c542"/>' +
        '<circle cx="9" cy="-66" r="1.4" fill="#222"/>' +
        '<path d="M2,-69 l-1,-6 M7,-69 l0,-6" stroke="#8d5524" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="3" cy="-50" r="2" fill="#c97b2a"/><circle cx="5" cy="-40" r="2" fill="#c97b2a"/>');
    },
    icecream: function () {
      return carBase('#ff99c8', '<rect x="-28" y="-38" width="56" height="27" rx="4" fill="#ffc8dd"/>' +
        '<path d="M-28,-38 h56 l-4,-7 h-48 z" fill="#ff99c8"/>' +
        '<polygon points="-6,-22 6,-22 0,-12" fill="#e0ac69"/><circle cx="0" cy="-25" r="6" fill="#a2d2ff"/><circle cx="0" cy="-30" r="5" fill="#ff99c8"/>' +
        '<circle cx="-18" cy="-24" r="3" fill="#fff"/><circle cx="18" cy="-24" r="3" fill="#fff"/>');
    },
    caboose: function () {
      return carBase('#d62828', '<rect x="-26" y="-36" width="52" height="25" rx="3" fill="#d62828"/>' +
        '<rect x="-10" y="-48" width="20" height="13" rx="2" fill="#d62828"/><rect x="-12" y="-51" width="24" height="4" rx="2" fill="#2b2b2b"/>' +
        '<rect x="-29" y="-39" width="58" height="4" rx="2" fill="#2b2b2b"/>' +
        '<rect x="-6" y="-46" width="12" height="7" fill="#bde8ff"/>' +
        '<circle cx="-14" cy="-24" r="5" fill="#bde8ff"/><circle cx="14" cy="-24" r="5" fill="#bde8ff"/>');
    },
    // ---- scenery (origin = base centre) ----
    tree: function (i) {
      var shades = ['#2a9d4a', '#38b000', '#3c8d2f', '#55a630'];
      var c = shades[i % shades.length];
      if (i % 3 === 2) {
        return '<rect x="-4" y="-18" width="8" height="18" fill="#7f5539"/>' +
          '<polygon points="0,-78 -24,-30 24,-30" fill="' + c + '"/><polygon points="0,-62 -28,-16 28,-16" fill="' + c + '"/>';
      }
      return '<rect x="-5" y="-26" width="10" height="26" rx="2" fill="#7f5539"/>' +
        '<circle cx="0" cy="-46" r="24" fill="' + c + '"/><circle cx="-14" cy="-34" r="14" fill="' + c + '"/><circle cx="14" cy="-34" r="14" fill="' + c + '"/>' +
        '<circle cx="-8" cy="-50" r="4" fill="#e63946"/><circle cx="9" cy="-40" r="4" fill="#e63946"/>';
    },
    flowers: function (i) {
      var cols = ['#ff006e', '#ffbe0b', '#8338ec', '#fb5607', '#3a86ff'];
      return [-14, 0, 14].map(function (x, k) {
        var c = cols[(i + k) % cols.length];
        var y = -14 - (k % 2) * 6;
        return '<path d="M' + x + ',0 V' + y + '" stroke="#2d6a4f" stroke-width="2"/>' +
          '<circle cx="' + (x - 4) + '" cy="' + y + '" r="4" fill="' + c + '"/><circle cx="' + (x + 4) + '" cy="' + y + '" r="4" fill="' + c + '"/>' +
          '<circle cx="' + x + '" cy="' + (y - 4) + '" r="4" fill="' + c + '"/><circle cx="' + x + '" cy="' + (y + 4) + '" r="4" fill="' + c + '"/>' +
          '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#fff3b0"/>';
      }).join('');
    },
    station: function () {
      return '<rect x="-70" y="-10" width="140" height="10" fill="#b08968"/>' +
        '<rect x="-55" y="-58" width="110" height="48" fill="#ffe8d6"/>' +
        '<polygon points="-66,-56 66,-56 52,-84 -52,-84" fill="#9d0208"/>' +
        '<rect x="-12" y="-38" width="24" height="28" rx="3" fill="#6f4518"/>' +
        '<rect x="-46" y="-46" width="22" height="16" rx="2" fill="#bde8ff"/><rect x="24" y="-46" width="22" height="16" rx="2" fill="#bde8ff"/>' +
        '<circle cx="0" cy="-70" r="9" fill="#fff" stroke="#333" stroke-width="2"/><path d="M0,-70 V-76 M0,-70 H5" stroke="#333" stroke-width="2"/>';
    },
    house: function () {
      return '<rect x="-40" y="-50" width="80" height="50" fill="#ffd6a5"/>' +
        '<polygon points="-48,-48 0,-86 48,-48" fill="#e76f51"/>' +
        '<rect x="22" y="-80" width="10" height="20" fill="#9c6644"/>' +
        '<rect x="-10" y="-28" width="20" height="28" rx="2" fill="#6f4518"/>' +
        '<rect x="-32" y="-40" width="16" height="14" fill="#bde8ff" stroke="#fff" stroke-width="2"/><rect x="16" y="-40" width="16" height="14" fill="#bde8ff" stroke="#fff" stroke-width="2"/>';
    },
    barn: function () {
      return '<rect x="-45" y="-50" width="90" height="50" fill="#c1121f"/>' +
        '<polygon points="-50,-48 -30,-78 30,-78 50,-48" fill="#780000"/>' +
        '<rect x="-16" y="-34" width="32" height="34" fill="#fff"/><rect x="-13" y="-31" width="26" height="31" fill="#c1121f"/>' +
        '<path d="M-13,-31 L13,0 M13,-31 L-13,0" stroke="#fff" stroke-width="3"/>' +
        '<rect x="-7" y="-68" width="14" height="12" fill="#fff"/>';
    },
    windmill: function () {
      return '<polygon points="-22,0 22,0 12,-100 -12,-100" fill="#f1faee" stroke="#a8dadc" stroke-width="2"/>' +
        '<rect x="-8" y="-26" width="16" height="26" rx="8" fill="#457b9d"/>' +
        '<g class="spin" style="transform-origin:0px -100px">' +
        [0, 90, 180, 270].map(function (a) { return '<rect x="-6" y="-160" width="12" height="58" rx="3" fill="#e63946" transform="rotate(' + a + ' 0 -100)"/>'; }).join('') +
        '</g><circle cx="0" cy="-100" r="7" fill="#1d3557"/>';
    },
    watertower: function () {
      return '<path d="M-24,0 L-16,-50 M24,0 L16,-50 M-20,-25 H20" stroke="#6d4c41" stroke-width="5"/>' +
        '<rect x="-30" y="-92" width="60" height="44" rx="8" fill="#4ea8de"/>' +
        '<polygon points="-34,-90 34,-90 0,-108" fill="#1d3557"/>' +
        '<path d="M28,-60 h14 v16" stroke="#555" stroke-width="5" fill="none"/>';
    },
    signal: function () {
      return '<rect x="-3" y="-70" width="6" height="70" fill="#555"/>' +
        '<rect x="-12" y="-96" width="24" height="40" rx="6" fill="#222"/>' +
        '<circle class="blink-r" cx="0" cy="-86" r="7" fill="#ff4d4d"/><circle class="blink-g" cx="0" cy="-66" r="7" fill="#38b000"/>';
    },
    cows: function (i) {
      var flip = i % 2 ? ' transform="scale(-1,1)"' : '';
      return '<g' + flip + '><rect x="-22" y="-30" width="40" height="20" rx="8" fill="#fff" stroke="#333" stroke-width="1.5"/>' +
        '<circle cx="-8" cy="-22" r="5" fill="#333"/><circle cx="8" cy="-16" r="4" fill="#333"/>' +
        '<path d="M-16,-12 V0 M-8,-12 V0 M8,-12 V0 M14,-12 V0" stroke="#333" stroke-width="3"/>' +
        '<ellipse cx="24" cy="-32" rx="9" ry="8" fill="#fff" stroke="#333" stroke-width="1.5"/>' +
        '<ellipse cx="28" cy="-28" rx="5" ry="3.5" fill="#ffafcc"/><circle cx="23" cy="-35" r="1.4" fill="#222"/>' +
        '<path d="M18,-40 l-3,-5 M28,-40 l3,-5" stroke="#bfa" stroke-width="3" stroke-linecap="round"/></g>';
    },
    sun: function () {
      var rays = '';
      for (var a = 0; a < 360; a += 30) rays += '<rect x="-3" y="-48" width="6" height="14" rx="3" fill="#ffbe0b" transform="rotate(' + a + ')"/>';
      return '<g class="spin-slow">' + rays + '</g><circle r="28" fill="#ffd60a"/>' +
        '<circle cx="-9" cy="-5" r="3" fill="#6b4e00"/><circle cx="9" cy="-5" r="3" fill="#6b4e00"/>' +
        '<path d="M-10,7 Q0,16 10,7" stroke="#6b4e00" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<circle cx="-16" cy="5" r="4" fill="#ff99c8" opacity=".6"/><circle cx="16" cy="5" r="4" fill="#ff99c8" opacity=".6"/>';
    },
    cloud: function () {
      return '<g class="drift"><ellipse cx="0" cy="0" rx="46" ry="18" fill="#fff"/><circle cx="-18" cy="-10" r="18" fill="#fff"/><circle cx="12" cy="-16" r="22" fill="#fff"/></g>';
    },
    balloon: function () {
      return '<g class="bob"><path d="M-30,-10 Q-34,-60 0,-62 Q34,-60 30,-10 L8,18 H-8 Z" fill="#ff006e"/>' +
        '<path d="M-10,-61 Q-14,-30 -8,18 M10,-61 Q14,-30 8,18" stroke="#ffbe0b" stroke-width="6" fill="none"/>' +
        '<path d="M-7,18 L-6,30 M7,18 L6,30" stroke="#6d4c41" stroke-width="1.5"/>' +
        '<rect x="-8" y="30" width="16" height="12" rx="2" fill="#9c6644"/></g>';
    },
    star: function () {
      return '<g class="twinkle"><polygon points="0,-16 4.7,-6.5 15.2,-4.9 7.6,2.5 9.4,12.9 0,8 -9.4,12.9 -7.6,2.5 -15.2,-4.9 -4.7,-6.5" fill="#ffd60a" stroke="#f4a261" stroke-width="1.5"/></g>';
    },
    ducks: function () {
      function duck(x, y, c) {
        return '<g transform="translate(' + x + ',' + y + ')"><ellipse cx="0" cy="0" rx="12" ry="7" fill="' + c + '"/><circle cx="9" cy="-8" r="6" fill="' + c + '"/>' +
          '<polygon points="14,-9 21,-7 14,-5" fill="#fb8500"/><circle cx="10" cy="-9" r="1.3" fill="#222"/></g>';
      }
      return '<g class="paddle">' + duck(-18, 0, '#ffd60a') + duck(14, 6, '#ffe66d') + duck(36, -4, '#ffd60a') + '</g>';
    },
    // absolute-coordinate pieces
    bridge: function () {
      var planks = '';
      for (var x = 584; x <= 652; x += 8) planks += '<rect x="' + x + '" y="466" width="5" height="48" fill="#8d5524"/>';
      var posts = '';
      for (var px = 580; px <= 660; px += 20) posts += '<rect x="' + (px - 2) + '" y="452" width="4" height="16" fill="#6f4518"/><rect x="' + (px - 2) + '" y="512" width="4" height="16" fill="#6f4518"/>';
      return '<g class="deck">' + planks + posts +
        '<rect x="578" y="452" width="86" height="4" fill="#6f4518"/><rect x="578" y="524" width="86" height="4" fill="#6f4518"/></g>';
    },
    river: function () {
      return '<path d="M590,640 C570,590 650,560 615,500 C590,455 640,440 620,415" stroke="#4cc9f0" stroke-width="44" fill="none" stroke-linecap="round"/>' +
        '<path d="M590,640 C570,590 650,560 615,500 C590,455 640,440 620,415" stroke="#90e0ef" stroke-width="6" fill="none" stroke-dasharray="10 22" class="flow"/>' +
        '<ellipse cx="610" cy="398" rx="80" ry="34" fill="#4cc9f0"/><ellipse cx="596" cy="392" rx="40" ry="10" fill="#90e0ef" opacity=".7"/>';
    },
    tunnel: function () {
      return '<path d="M232,528 Q236,420 330,404 Q424,420 428,528 Z" fill="#6a994e"/>' +
        '<path d="M262,500 Q300,436 360,440" stroke="#a7c957" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M236,516 v-44 a22,22 0 0 1 22,-0 v44 z" fill="#1b1b1b"/>' +
        '<path d="M402,516 v-44 a22,22 0 0 1 22,0 v44 z" fill="#1b1b1b"/>' +
        '<path d="M232,518 v-46 a26,26 0 0 1 30,0 v46" stroke="#8d99ae" stroke-width="5" fill="none"/>' +
        '<path d="M398,518 v-46 a26,26 0 0 1 30,0 v46" stroke="#8d99ae" stroke-width="5" fill="none"/>' +
        '<circle cx="300" cy="440" r="5" fill="#ff006e"/><circle cx="350" cy="430" r="5" fill="#ffbe0b"/><circle cx="380" cy="460" r="5" fill="#fff"/>';
    },
    rainbow: function () {
      var cols = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
      return '<g opacity=".85">' + cols.map(function (c, i) {
        var r = 110 - i * 9;
        return '<path d="M' + (640 - r) + ',135 A' + r + ',' + r + ' 0 0 1 ' + (640 + r) + ',135" stroke="' + c + '" stroke-width="9" fill="none"/>';
      }).join('') + '</g>';
    }
  };

  // ---------- Reward catalogue ----------
  // type: car | scenery. at: positions (count = max). abs: drawn in world coords. layer: back | deck | front
  function starSpots() {
    var s = [], seed = 7;
    for (var i = 0; i < 40; i++) {
      seed = (seed * 9301 + 49297) % 233280; var x = 30 + (seed / 233280) * 940;
      seed = (seed * 9301 + 49297) % 233280; var y = 14 + (seed / 233280) * 70;
      s.push([Math.round(x), Math.round(y)]);
    }
    return s;
  }
  var PIECES = [
    { id: 'engine', name: 'Steam Engine', type: 'car', max: 1, box: [-40, -58, 84, 62] },
    { id: 'tender', name: 'Coal Car', type: 'car', max: 1, requires: 'engine', box: [-36, -46, 72, 50] },
    { id: 'passenger', name: 'Passenger Car', type: 'car', max: 2, box: [-36, -48, 72, 52] },
    { id: 'boxcar', name: 'Box Car', type: 'car', max: 2, box: [-36, -48, 72, 52] },
    { id: 'tanker', name: 'Milk Tank Car', type: 'car', max: 1, box: [-36, -46, 72, 50] },
    { id: 'logcar', name: 'Log Car', type: 'car', max: 1, box: [-36, -46, 72, 50] },
    { id: 'giraffe', name: 'Giraffe Car', type: 'car', max: 1, box: [-36, -80, 72, 84] },
    { id: 'icecream', name: 'Ice Cream Car', type: 'car', max: 1, box: [-36, -48, 72, 52] },
    { id: 'caboose', name: 'Caboose', type: 'car', max: 1, box: [-36, -56, 72, 60] },
    { id: 'station', name: 'Train Station', type: 'scenery', at: [[380, 128]], box: [-72, -90, 144, 94] },
    { id: 'tree', name: 'Tree', type: 'scenery', at: [[500, 126], [195, 118], [810, 110], [92, 150], [966, 330], [34, 330], [575, 262], [278, 392], [70, 600], [870, 604]], box: [-36, -82, 72, 86] },
    { id: 'house', name: 'House', type: 'scenery', at: [[330, 290]], box: [-52, -90, 104, 94] },
    { id: 'barn', name: 'Red Barn', type: 'scenery', at: [[460, 300]], box: [-54, -82, 108, 86] },
    { id: 'windmill', name: 'Windmill', type: 'scenery', at: [[696, 372]], box: [-64, -166, 128, 170] },
    { id: 'watertower', name: 'Water Tower', type: 'scenery', at: [[630, 126]], box: [-40, -112, 86, 116] },
    { id: 'signal', name: 'Train Signal', type: 'scenery', at: [[882, 142]], box: [-20, -100, 40, 104] },
    { id: 'bridge', name: 'River & Bridge', type: 'scenery', abs: true, max: 1, layer: 'deck', box: [520, 360, 180, 180] },
    { id: 'ducks', name: 'Ducks', type: 'scenery', requires: 'bridge', at: [[600, 402]], box: [-34, -20, 82, 34] },
    { id: 'tunnel', name: 'Tunnel', type: 'scenery', abs: true, max: 1, layer: 'front', box: [226, 398, 208, 136] },
    { id: 'cows', name: 'Cow', type: 'scenery', at: [[160, 602], [236, 612]], box: [-28, -50, 66, 54] },
    { id: 'flowers', name: 'Flowers', type: 'scenery', at: [[330, 604], [400, 612], [470, 600], [530, 612], [700, 606], [766, 612]], box: [-24, -30, 48, 34] },
    { id: 'sun', name: 'Happy Sun', type: 'scenery', at: [[62, 54]], box: [-52, -52, 104, 104] },
    { id: 'cloud', name: 'Cloud', type: 'scenery', at: [[170, 48], [470, 40], [770, 58]], box: [-52, -42, 104, 64] },
    { id: 'balloon', name: 'Hot Air Balloon', type: 'scenery', at: [[318, 66]], box: [-38, -68, 76, 114] },
    { id: 'rainbow', name: 'Rainbow', type: 'scenery', abs: true, max: 1, box: [524, 20, 232, 120] },
    { id: 'star', name: 'Gold Star', type: 'scenery', at: starSpots(), filler: true, box: [-18, -18, 36, 36] }
  ];
  PIECES.forEach(function (p) { if (p.max == null) p.max = p.at ? p.at.length : 1; });
  var BY_ID = {}; PIECES.forEach(function (p) { BY_ID[p.id] = p; });

  function drawPiece(p, i) {
    if (p.id === 'bridge') return D.river() + D.bridge();
    return D[p.id](i || 0);
  }
  function thumb(id) {
    var p = BY_ID[id];
    var b = p.box;
    var inner = drawPiece(p, 0);
    if (p.id === 'bridge') inner = D.river() + '<path d="' + stadium(R) + '" stroke="#8d6e63" stroke-width="10" fill="none"/>' + D.bridge();
    return '<svg viewBox="' + b.join(' ') + '" xmlns="http://www.w3.org/2000/svg" class="thumb">' + inner + '</svg>';
  }

  // Ordered list of car ids for the train (engine, tender, others in acquisition order, caboose last)
  function trainCars(owned, carOrder) {
    if (!owned.engine) return [];
    var list = ['engine'];
    if (owned.tender) list.push('tender');
    var counts = {};
    (carOrder || []).forEach(function (id) {
      if (id === 'engine' || id === 'tender' || id === 'caboose') return;
      counts[id] = (counts[id] || 0) + 1;
      if (counts[id] <= (owned[id] || 0)) list.push(id);
    });
    if (owned.caboose) list.push('caboose');
    return list;
  }

  // ---------- Scene ----------
  var scene = null;
  function build(svg, state, highlight) {
    var owned = state.owned || {};
    var back = '', deck = '', front = '', water = '';
    function place(p, i, html) {
      var hl = highlight && highlight.id === p.id && (highlight.index == null || highlight.index === i) ? ' new-piece' : '';
      return '<g class="piece' + hl + '" data-id="' + p.id + '" data-i="' + i + '"' + (p.abs ? '' : ' transform="translate(' + p.at[i][0] + ',' + p.at[i][1] + ')"') +
        '><g class="wig">' + html + '</g></g>';
    }
    // Draw scenery sorted by base y so nearer things overlap farther ones
    var items = [];
    PIECES.forEach(function (p) {
      if (p.type !== 'scenery') return;
      var n = Math.min(owned[p.id] || 0, p.max);
      for (var i = 0; i < n; i++) items.push({ p: p, i: i, y: p.abs ? 0 : p.at[i][1] });
    });
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it) {
      var p = it.p;
      if (p.id === 'bridge') { water += place(p, 0, D.river()); deck += place(p, 0, D.bridge()); return; }
      var html = place(p, it.i, drawPiece(p, it.i));
      if (p.layer === 'front') front += html;
      else back += html;
    });

    var ties = '<path d="' + stadium(R) + '" stroke="#c9b18c" stroke-width="46" fill="none"/>' +
      '<path d="' + stadium(R) + '" stroke="#8d6e63" stroke-width="34" fill="none" stroke-dasharray="7 9"/>' +
      '<path d="' + stadium(R + 10) + '" stroke="#78909c" stroke-width="4" fill="none"/>' +
      '<path d="' + stadium(R - 10) + '" stroke="#78909c" stroke-width="4" fill="none"/>';

    var cars = trainCars(owned, state.carOrder);
    var carIdx = {};
    var carsSvg = cars.map(function (id, k) {
      carIdx[id] = (carIdx[id] || 0) + 1;
      var isNew = highlight && highlight.id === id && highlight.car === k;
      return '<g class="car' + (isNew ? ' new-piece' : '') + '" data-car="' + k + '"><g class="flip"><g class="wig">' + D[id](carIdx[id] - 1, id === 'engine' ? state.engineColor : undefined) + '</g></g></g>';
    }).join('');

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML =
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ecae6"/><stop offset="1" stop-color="#d7f0ff"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>' +
      '<path d="M0,120 Q120,70 250,112 T520,104 T780,100 T1000,108 V160 H0 Z" fill="#b5e48c"/>' +
      '<rect y="118" width="' + W + '" height="' + (H - 118) + '" fill="#99d98c"/>' +
      '<path d="M0,118 Q250,108 500,120 T1000,116 V130 H0Z" fill="#8bd17c"/>' +
      water + ties + deck + back.replace(/^/, '') +
      '<g id="smoke"></g><g id="train">' + carsSvg + '</g>' + front;
    // Note: back scenery is drawn after the track so items sit on top of grass/track edges,
    // and before the train so the train passes in front.

    scene = { svg: svg, cars: Array.prototype.slice.call(svg.querySelectorAll('#train .car')), smoke: svg.querySelector('#smoke'), puffs: [], head: scene ? scene.head : 300, speed: 70, boost: 0, last: 0, t: 0 };
    position();
  }

  function position() {
    if (!scene) return;
    scene.cars.forEach(function (el, k) {
      var p = trackAt(scene.head - k * CAR_GAP);
      var dir = p.dx < 0 ? -1 : 1;
      var bob = Math.sin(scene.t * 9 + k) * 0.8;
      el.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + (p.y + 8 + bob).toFixed(1) + ')');
      el.firstChild.setAttribute('transform', 'scale(' + dir + ',1)');
      if (k === 0) { scene.chimX = p.x + dir * 17; scene.chimY = p.y + 8 - 50; }
    });
  }

  var raf = null;
  function frame(ts) {
    if (!scene) return;
    var dt = scene.last ? Math.min(0.05, (ts - scene.last) / 1000) : 0;
    scene.last = ts; scene.t += dt;
    if (scene.cars.length) {
      var sp = scene.speed + (scene.boost > 0 ? 160 : 0);
      scene.boost = Math.max(0, scene.boost - dt);
      scene.head += sp * dt;
      position();
      // smoke
      scene.puffT = (scene.puffT || 0) - dt;
      if (scene.puffT <= 0) {
        scene.puffT = scene.boost > 0 ? 0.12 : 0.28;
        scene.puffs.push({ x: scene.chimX, y: scene.chimY, age: 0 });
        if (scene.puffs.length > 14) scene.puffs.shift();
      }
      var html = '';
      scene.puffs.forEach(function (pf) {
        pf.age += dt; pf.y -= 26 * dt; pf.x += 6 * dt;
        var r = 5 + pf.age * 12, op = Math.max(0, 0.75 - pf.age * 0.5);
        if (op > 0) html += '<circle cx="' + pf.x.toFixed(1) + '" cy="' + pf.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#fff" opacity="' + op.toFixed(2) + '"/>';
      });
      scene.smoke.innerHTML = html;
    }
    raf = requestAnimationFrame(frame);
  }

  window.World = {
    PIECES: PIECES,
    byId: BY_ID,
    thumb: thumb,
    build: build,
    start: function () { if (!raf && scene) { scene.last = 0; raf = requestAnimationFrame(frame); } },
    stop: function () { if (raf) cancelAnimationFrame(raf); raf = null; },
    boost: function () { if (scene) scene.boost = 3; },
    carDrawing: function (id, colorId) { return D[id](0, colorId); },
    ENGINE_COLORS: ENGINE_COLORS,
    engineColor: engineColor,
    trainCars: trainCars
  };
})();
