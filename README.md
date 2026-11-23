# Train Trace 🚂✏️

A letter & number tracing game for preschoolers (built for a 4-year-old). Every few completed letters earns a
prize — a new train car or piece of scenery — that the child picks and adds to their own animated train world.

Runs fully **offline** on **iPad** and **desktop**. No build step, no dependencies, no network calls, no tracking.

## Players (multiple kids, one device)
On launch the game shows **Who's playing?** with a card for each saved player (avatar, name, pieces earned, letters done;
last-played first) plus **New player**.

- **New player:** type a name, pick an animal buddy, optionally *start with the same settings as* an existing player.
- **Load:** tap a card to continue that child's game.
- **Each player saves separately:** train world, prize progress, per-letter counts, **and all parent settings**.
- **Switch:** tap the name chip on the home screen. Rename, change avatar, switch or delete a player in Parent Settings.
- A save from the earlier single-player version is moved over automatically as "Player 1".

## How it plays

| Step | What happens |
|---|---|
| Trace | A big dotted letter on handwriting lines, with numbered green start dots and orange direction arrows. The path turns green as the child covers it. |
| Write | Blank handwriting lines with a small model card. The child's letter is scaled to the model before it's scored, so size and position don't matter. |
| Success | Chime, confetti, spoken praise, and a ⭐ fills on the prize meter. |
| Prize | When the meter fills, the child picks 1 of 3 prizes (the first prize is always the steam engine). The new piece pops into the world. |
| Engine color | Right after earning the engine, the child picks its color (10 choices). Repaint any time with 🎨 in the train world. Saved per player. |
| Train world | The train runs around the track, puffing smoke. Tap the train to toot and speed it up; tap scenery to make it wiggle. |

Kid controls: 👀 Show me (animated stroke demo), 🧽 Erase, 🔤 Pick a letter, ⏭️ Next, ✅ Done, 🔊 hear the letter.

### Prizes (≈45 before repeats)
Cars: steam engine, coal car, passenger cars ×2, box cars ×2, milk tank car, log car, giraffe car, ice cream car, caboose.
Scenery: station, trees ×10, house, barn, windmill, water tower, signal, river & bridge, ducks, tunnel, cows ×2,
flowers ×6, sun, clouds ×3, hot air balloon, rainbow. Gold stars (up to 40) are the fallback once most items are collected.

## Parent settings
Tap ⚙️ on the home screen and answer a multiplication question (keeps little fingers out).

| Setting | Options | Default |
|---|---|---|
| Prize threshold | 1–20 completed letters per prize | 3 |
| Activity | Trace · Write · Trace → Write (same letter twice) | Trace |
| Neatness needed | Easy (3–4) · Medium (4–5) · Hard (5+) | Easy |
| Order | In order · Mixed up | In order |
| What to practice | ABC / abc / 123 groups, or individual characters (shows completion count per character) | ABC + 123 |
| Helpers | Start dots & arrows, auto "Show me", sound effects, spoken letters | All on |
| Player | Rename, change avatar, switch player, delete player | — |
| Progress | Stats, give a prize now, reset train world, reset this player | — |

All settings above apply to the current player only. Everything is saved on the device (`localStorage`, key `trainTrace.players.v1`).

## Running it

**Desktop, quickest:** open `index.html` in a browser. Works from the local file with no server.

**iPad (offline, full screen):** the files need to be served over HTTPS once so Safari can cache them.
1. Host the folder on any static host (e.g. GitHub Pages: Settings → Pages → deploy from this branch, root folder).
2. On the iPad, open the URL in Safari → Share → **Add to Home Screen**.
3. Launch from the home-screen icon. After the first launch it works with no internet (service worker cache).

**Local server for testing:** `python3 -m http.server 8000` then open http://localhost:8000.

Tip for iPad: turn on **Guided Access** (Settings → Accessibility) to lock the child into the app.

## How scoring works
Each glyph is defined as ordered strokes on a 100 × 125 grid (top line 10, midline 50, baseline 90,
descender 120) in `js/glyphs.js`. Ink is compared to points sampled every 2 units along those strokes:

- **Coverage:** share of the path that has ink within the tolerance
- **Precision:** share of the ink that sits near the path
- **Length ratio:** ink length vs. path length, so scribbling over the whole letter doesn't pass
- **Every stroke:** each stroke must be mostly covered, so skipping the bars on an I or the tail on a Q doesn't pass

**Never-stuck rule (Easy & Medium):** if a letter is wiped for being messy, the next try on that letter is a bit
more forgiving; after two wipes the train demo plays automatically. Palm rejection: a touch that lands first and doesn't
move (a resting hand) is dropped when a moving finger starts.

Neatness level sets all thresholds (`STRICT` in `js/app.js`). Stroke order is shown but not enforced.

## Files
```
index.html            screens and modals
css/styles.css        styling (touch-first, landscape/portrait layouts)
js/glyphs.js          stroke data for A–Z, a–z, 0–9
js/audio.js           synthesized sounds (Web Audio) + speech
js/world.js           prize catalogue, SVG train world, animation
js/app.js             state, tracing engine, rewards, parent gate, settings
sw.js                 offline cache
manifest.webmanifest  install metadata
icons/                app icons
```
When you change any file, bump `CACHE` in `sw.js` so installed copies pick up the update.
