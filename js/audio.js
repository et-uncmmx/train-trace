/* Train Trace — synthesized sounds (no audio files, works offline) + speech. */
(function () {
  var ctx = null;
  var Sound = {
    enabled: true,
    voice: true,
    unlock: function () {
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) ctx = new AC();
        }
        if (ctx && ctx.state === 'suspended') ctx.resume();
      } catch (e) { /* no audio */ }
    },
    tone: function (freq, when, dur, type, vol, slideTo) {
      if (!this.enabled || !ctx) return;
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      var gn = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    },
    chime: function () {
      var self = this;
      [523, 659, 784, 1047].forEach(function (f, i) { self.tone(f, i * 0.09, 0.35, 'triangle', 0.2); });
    },
    star: function () { this.tone(880, 0, 0.15, 'sine', 0.15, 1320); this.tone(1320, 0.1, 0.25, 'sine', 0.12); },
    pop: function () { this.tone(400, 0, 0.12, 'sine', 0.2, 900); },
    tick: function () { this.tone(1200, 0, 0.04, 'sine', 0.05); },
    oops: function () { this.tone(330, 0, 0.18, 'triangle', 0.15, 220); this.tone(262, 0.16, 0.25, 'triangle', 0.12, 196); },
    fanfare: function () {
      var self = this;
      [[392, 0], [523, 0.15], [659, 0.3], [784, 0.45], [659, 0.6], [784, 0.72]].forEach(function (n) {
        self.tone(n[0], n[1], n[1] > 0.6 ? 0.6 : 0.2, 'square', 0.08);
        self.tone(n[0] * 2, n[1], 0.2, 'triangle', 0.06);
      });
    },
    toot: function () {
      if (!this.enabled || !ctx) return;
      var t = ctx.currentTime;
      [[0, 0.32], [0.4, 0.55]].forEach(function (seg) {
        var gn = ctx.createGain();
        var filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 1400;
        gn.gain.setValueAtTime(0.0001, t + seg[0]);
        gn.gain.exponentialRampToValueAtTime(0.12, t + seg[0] + 0.04);
        gn.gain.setValueAtTime(0.12, t + seg[0] + seg[1] - 0.08);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + seg[0] + seg[1]);
        filt.connect(gn); gn.connect(ctx.destination);
        [370, 466, 554].forEach(function (f) {
          var o = ctx.createOscillator();
          o.type = 'sawtooth'; o.frequency.value = f;
          o.connect(filt); o.start(t + seg[0]); o.stop(t + seg[0] + seg[1] + 0.05);
        });
      });
    },
    say: function (text) {
      if (!this.voice || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 0.85; u.pitch = 1.15; u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    }
  };
  window.Sound = Sound;
})();
