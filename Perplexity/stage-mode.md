<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# "How to implement a metronome/click track in a web app using Web Audio API? Include: generating or playing click sounds, adjustable BPM, start/stop, and volume control. What are common pitfalls on mobile Safari and when the tab is backgrounded?"

You implement a Web Audio metronome by pre‑scheduling short click sounds against `audioContext.currentTime`, driven by a lightweight JS scheduler loop, then layering transport controls and gain nodes on top.[^1_1][^1_2][^1_3]

## Core architecture

- Create a single shared `AudioContext` on first user interaction (button tap/click) to satisfy autoplay policies.[^1_4][^1_1]
- Maintain state: `bpm`, `nextNoteTime` (in AudioContext time), current beat index, `isPlaying`, and a JS timer id.[^1_2][^1_3][^1_1]
- Use a scheduler function (called via `setInterval` or `setTimeout`) that, on each tick, schedules all clicks that should fire in the next small “look‑ahead” window (e.g. 0.1–0.2 s).[^1_3][^1_1][^1_2]

Example state skeleton:

```js
let audioCtx;
let masterGain;
let isPlaying = false;
let bpm = 120;
let currentBeat = 0;
let nextNoteTime = 0;
let schedulerId = null;

const scheduleAheadTime = 0.1;   // seconds
const schedulerInterval = 25;    // ms
const beatsPerBar = 4;
```


## Generating click sounds

You can generate the click either as an oscillator blip or by playing a short sample; both should be scheduled with `start(when)` rather than fired “now”.[^1_5][^1_1]

### Option 1: Oscillator blip

```js
function scheduleClick(beatNumber, time) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();

  // Accent first beat
  osc.frequency.value = (beatNumber % beatsPerBar === 0) ? 2000 : 1400;

  env.gain.setValueAtTime(0.0, time);
  env.gain.linearRampToValueAtTime(1.0, time + 0.001);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(time);
  osc.stop(time + 0.04);
}
```

This mirrors the classic Web Audio metronome approach: very short envelopes and `osc.start(time)` for sample‑accurate clicks.[^1_1][^1_2][^1_3]

### Option 2: Sample‑based click

Pre‑load a small click WAV/OGG into an `AudioBuffer`, then for each beat create an `AudioBufferSourceNode` and schedule its `start(time)`.[^1_5]

```js
let clickBuffer = null;

async function loadClickSample(url) {
  const res = await fetch(url);
  const arrayBuf = await res.arrayBuffer();
  clickBuffer = await audioCtx.decodeAudioData(arrayBuf);
}

function scheduleClickSample(beatNumber, time) {
  if (!clickBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = clickBuffer;
  src.connect(masterGain);
  src.start(time);
}
```


## Timing, BPM, and start/stop

Compute beat duration from BPM and advance `nextNoteTime` in AudioContext time.[^1_2][^1_3][^1_1]

```js
function nextBeat() {
  const secondsPerBeat = 60.0 / bpm;
  nextNoteTime += secondsPerBeat;
  currentBeat = (currentBeat + 1) % beatsPerBar;
}

function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleClick(currentBeat, nextNoteTime); // or scheduleClickSample
    nextBeat();
  }
}

function start() {
  if (isPlaying) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  isPlaying = true;
  currentBeat = 0;
  nextNoteTime = audioCtx.currentTime + 0.05;

  schedulerId = setInterval(scheduler, schedulerInterval);
}

function stop() {
  if (!isPlaying) return;
  isPlaying = false;
  clearInterval(schedulerId);
  schedulerId = null;
}
```

Changing `bpm` at runtime just changes how `nextBeat` advances (the next scheduled notes will use the new BPM). Since you’re always scheduling slightly ahead of “now” in audio time, you avoid audible jitter from JS timer variance.[^1_3][^1_1][^1_2]

## Volume control

Use a single `GainNode` as a master volume, connected to `destination`, and adjust its `gain.value` or schedule ramps on it.[^1_1][^1_5]

```js
// On UI volume slider (0..1)
function setVolume(v) {
  if (!masterGain) return;
  masterGain.gain.setTargetAtTime(v, audioCtx.currentTime, 0.01);
}
```

You can also mute/unmute by toggling this gain, or send different accent/non‑accent clicks into separate gains if you want per‑voice control.[^1_5][^1_1]

## Mobile Safari pitfalls

Mobile Safari has stricter autoplay and power‑saving behavior than desktop, and you need to design around that.[^1_6][^1_7][^1_8][^1_4]

- User gesture required to start audio: you must create and/or `resume()` the `AudioContext` in direct response to a tap/click (e.g., “Start” button handler). Otherwise the context will be stuck in `suspended` and no sound will play.[^1_7][^1_6][^1_4]
- Context suspension on lock or background: when the user locks the device, switches apps, or sometimes when Safari tab is backgrounded, the `AudioContext` can be automatically suspended and your metronome will effectively stop.[^1_6][^1_4]
    - Listen for `visibilitychange` and `pagehide` to update UI state or stop scheduling rather than assuming it keeps ticking.
- Latency quirks: iOS audio hardware and Safari’s pipeline can introduce extra latency, so using `currentTime`‑based scheduling is essential; avoid using plain `setInterval` to fire clicks directly.[^1_4][^1_3][^1_1]
- Sample decoding costs: decoding large samples on the main thread during playback can cause glitches; decode your click sound once on startup and reuse it.[^1_4][^1_5]

A common pattern is: first tap initializes and resumes the context; subsequent taps just change parameters or start/stop the scheduler, but you never fully close the context so you don’t need to re‑negotiate autoplay each time.[^1_7][^1_6][^1_4]

## Background tab and throttling issues

Browsers throttle JS timers when the tab is not visible; this breaks “just‑in‑time” scheduling loops.[^1_9][^1_10][^1_11][^1_2]

- Timer throttling: in background tabs, `setTimeout`/`setInterval` often run as rarely as once per second, so your scheduler loop stops scheduling clicks in time, causing gaps or “broken” timing.[^1_10][^1_11][^1_9][^1_2]
- Audio continues, JS doesn’t: some browsers keep audio rendering running but starve the JS thread, so any schedule‑ahead system that relies on frequent JS callbacks degrades once the tab is hidden.[^1_11][^1_9][^1_10][^1_2]

Workarounds (none are perfect on all platforms):

- Web Worker scheduler: use a Worker to drive the scheduler since worker timers may be throttled less aggressively in some browsers; Chris Wilson’s metronome example uses a worker pinging the main thread to mitigate this.[^1_10][^1_11][^1_2]
- Longer scheduling horizon: if you know the metronome only needs to run for N seconds, you can schedule an entire span of clicks ahead of time so that short timer stalls don’t matter, but this limits dynamic tempo changes.[^1_9][^1_3][^1_1]
- UX constraints: explicitly state that highly accurate background‑tab metronome is not guaranteed; pause when the page is hidden or ask users to keep the tab foregrounded if they need tight timing.

In practice, for a DAW‑style web app you typically: preschedule clicks using AudioContext time, drive scheduling from a small‑interval loop (possibly in a Worker), initialize audio from an explicit user gesture on mobile, and accept that power‑saving policies may still pause or degrade timing when the tab or app is backgrounded.[^1_11][^1_2][^1_3][^1_9][^1_10][^1_1][^1_4]

Would you prefer an idiomatic React/TypeScript hook example, or a plain ES module you can drop into a vanilla JS app?
<span style="display:none">[^1_12][^1_13][^1_14][^1_15]</span>

<div align="center">⁂</div>

[^1_1]: https://grantjames.github.io/creating-a-simple-metronome-using-javascript-and-the-web-audio-api/

[^1_2]: https://github.com/cwilso/metronome

[^1_3]: https://meowni.ca/posts/metronomes/

[^1_4]: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

[^1_5]: https://stackoverflow.com/questions/53022480/scheduling-sample-playback-with-web-audio-api

[^1_6]: https://niconiconi.neocities.org/tech-notes/force-enable-web-audio-autoplay-on-ios-for-incompatible-apps-via-userscript/

[^1_7]: https://stackoverflow.com/questions/66300840/trying-to-play-an-mp3-via-js-on-ios-browsers

[^1_8]: https://www.reddit.com/r/webdev/comments/18j9478/need_advice_on_ios_autoplay_restrictions/

[^1_9]: https://bugzilla.mozilla.org/show_bug.cgi?id=1181073

[^1_10]: https://stackoverflow.com/questions/6032429/chrome-timeouts-interval-suspended-in-background-tabs

[^1_11]: https://www.reddit.com/r/learnjavascript/comments/1chx1q5/best_practice_for_handling_and_avoiding_tab/

[^1_12]: https://blog.paul.cx/post/metronome/

[^1_13]: https://www.youtube.com/watch?v=31Qm_upl8kU

[^1_14]: https://blog.ericyd.com/loop-supreme-part-3-metronome-click/

[^1_15]: https://www.youtube.com/watch?v=f6dwSJ_n1cg


---

# "Best practices for metronome click sounds in web audio: synthesized vs. sample-based, common sound types (woodblock, rim, hi-hat), and licensing for royalty-free click samples."

Synthesized clicks are usually best for a Web Audio metronome (small, cheap, customizable), but sample‑based clicks are great if you want a more “acoustic” feel or consistent branding.[^2_1][^2_2][^2_3][^2_4][^2_5]

## Synthesized clicks

- **Pros**:
    - Trivially small “size” (no asset download), instant availability.[^2_2][^2_4][^2_1]
    - Easy to parameterize (accent vs non‑accent, tone, decay, stereo placement) with envelopes and filters.[^2_6][^2_4][^2_2]
    - No licensing issues; you generated the sound at runtime.[^2_4][^2_2]
- Cons:
    - Can sound sterile or fatiguing if you just use a raw sine/square blip.
    - More work to design “natural” woodblock/rim/hat style timbres.

Common synthesized approaches:[^2_1][^2_2][^2_6][^2_4]

- Short sine/triangle “beep” (1–4 kHz) with a super fast attack and 10–50 ms decay.
- Click from a noise burst: white noise into a band‑pass or high‑pass filter, very short decay, gives a hi‑hat‑like tick.
- “Woodblock” flavor: higher‑frequency sine/triangle plus a quick pitch drop and lowpass, or a resonant band‑pass around 1–2 kHz, 20–60 ms decay.
- Accents: slightly lower pitch, a few dB louder, or a tad more low‑mid to feel heavier.

For a metronome, one nice pattern is: accent = slightly lower, rounder click with more body; non‑accent = brighter, thinner tick that doesn’t mask music.[^2_7][^2_2]

## Sample‑based clicks

- **Pros**:
    - Can sound more musical (actual rimshot, woodblock, hi‑hat) and easier on the ear in long sessions.[^2_8][^2_7]
    - Consistency across platforms—no subtle synthesis differences between browsers.
- Cons:
    - Need to host and decode audio assets; slight startup latency.[^2_2]
    - Must manage licensing and attributions correctly.[^2_3][^2_9][^2_5]

Practical tips:[^2_9][^2_5][^2_3][^2_2]

- Use very short one‑shots (20–100 ms) with clean onsets; trim silence to keep the transient tight.
- Normalize then maybe reduce overall level so user volume control has headroom.
- Prefer mono 44.1/48 kHz WAV for predictable decoding and timing.
- Load and decode once at app init and reuse the `AudioBuffer` for all clicks.


## Typical sound types

For “DAW‑style” metronomes, users tend to like a few families: woodblock, rim, and hi‑hat‑ish ticks.[^2_7][^2_8]

- Woodblock / clave:
    - Mid‑focused, percussive, not too bright, cuts through mixes well.
    - Synth: band‑pass‑filtered noise or resonant filter “ping” around 1–2 kHz plus fast decay.
- Rimshot / stick click:
    - Sharper and brighter, strong transient, can be fatiguing at high levels.
    - Synth: layered high‑freq noise burst with a short pitched component.
- Hi‑hat / shaker:
    - Noisy, broadband, but usually lower level and less “annoying”.
    - Synth: high‑pass noise with very short decay for the transient, maybe a tiny bit of randomization on level/pan to avoid staleness.[^2_10][^2_7]

Good UX practice is to offer at least 2–3 flavors (e.g., “Digital beep”, “Woodblock”, “Hi‑hat”) and separate volume for accent vs others.[^2_8]

## Licensing for royalty‑free clicks

If you don’t synthesize everything, you need to treat metronome clicks as any other sample.[^2_5][^2_3][^2_9]

- Public domain / CC0:
    - Ideal; no attribution or fees required.
    - Example: some sites distribute “metronome click” sounds explicitly as public‑domain or CC0; check the per‑file license text and keep a copy.[^2_5]
- Attribution‑required free SFX:
    - Many “free SFX” portals allow commercial use but require a visible credit, often including their URL.[^2_3]
    - Suitable if you are okay adding credits (about page, app footer, or documentation).
- “Unknown” or unclear license:
    - Avoid for anything beyond personal or internal use.[^2_9]
    - If the source says “license unknown” or doesn’t specify, treat it as not safe to ship.
- CC‑BY / CC‑BY‑SA / CC‑BY‑NC:
    - CC‑BY: fine for commercial use with attribution.
    - CC‑BY‑SA: your distribution may need to be under a compatible share‑alike license; risky for closed‑source or proprietary web apps.
    - CC‑BY‑NC: not allowed for commercial or revenue‑generating products.

Best practice:[^2_3][^2_9][^2_5]

- Prefer: synth your own clicks or record/mandate your own originals so your company fully owns them.
- If using libraries:
    - Keep a small “asset manifest” (sample name → URL → license type → proof screenshot or text).
    - Mirror the license text in your repo/docs for future audits.
    - Provide attribution somewhere persistent in the app/site when required.

Given your DSP background, you’re probably comfortable rolling a small “click synth” that can morph between woodblock/rim/hat flavors. Do you want a concrete Web Audio patch recipe for 2–3 specific click types (with envelopes and filter settings)?
<span style="display:none">[^2_11][^2_12][^2_13][^2_14][^2_15]</span>

<div align="center">⁂</div>

[^2_1]: https://grantjames.github.io/creating-a-simple-metronome-using-javascript-and-the-web-audio-api/

[^2_2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques

[^2_3]: https://freesfx.co.uk/Category/Metronome-/274

[^2_4]: https://github.com/notthetup/awesome-webaudio/blob/master/readme.md

[^2_5]: https://creazilla.com/media/audio/15465984/metronome-click

[^2_6]: https://modernweb.com/creating-sound-web-audio-api-oscillators/

[^2_7]: https://www.edmprod.com/hi-hats/

[^2_8]: https://www.reddit.com/r/Reaper/comments/1ef7ei4/free_repository_of_click_sounds/

[^2_9]: https://free-loops.com/4264-metronome-click.html

[^2_10]: https://www.youtube.com/watch?v=HoPzJq59g1o

[^2_11]: https://www.youtube.com/watch?v=f6dwSJ_n1cg

[^2_12]: https://www.youtube.com/watch?v=31Qm_upl8kU

[^2_13]: https://blog.ericyd.com/loop-supreme-part-3-metronome-click/

[^2_14]: https://www.youtube.com/watch?v=YJb70IV3rb8

[^2_15]: https://rhythmnotes.net/hi-hat-techniques/


---

# "Does Web Audio API continue playing when a mobile browser tab is backgrounded or the screen is locked? iOS Safari, Android Chrome. Workarounds for keeping audio during a live performance."

Web Audio playback in the background is only partially reliable: Android Chrome can usually keep playing if the user/device allows it, while iOS Safari is heavily restricted and often suspends Web Audio when locked or backgrounded.[^3_1][^3_2][^3_3][^3_4][^3_5][^3_6][^3_7]

## iOS Safari

- Web Audio is tied to strict power‑saving and media policies; the `AudioContext` may be silently suspended when the screen locks, the app goes to background, or after some idle time.[^3_8][^3_2][^3_3][^3_1]
- Many developers report:
    - Audio stops a short time after lock, and subsequent Web Audio playback fails until the page is reloaded or the context is re‑created.[^3_2][^3_1][^3_8]
    - You cannot reliably force continuous Web Audio in the background; this is an OS/browser policy, not a bug you can fully “fix”.[^3_3][^3_5][^3_2]
- Common hacks/workarounds (none guaranteed long‑term):

```
- Keep an `<audio>` or `<video>` element playing (possibly a silent/quiet loop) with user‑initiated `play()`. This may keep iOS treating your page as active media and can help the Web Audio context survive screen lock on some versions.[^3_9][^3_4][^3_10][^3_6][^3_1]
```

    - Use the media element as the primary player (so iOS’ native background audio rules apply) and use Web Audio only for visualization or light processing on top of that stream.[^3_10][^3_6]
- Practical conclusion for live performance: if you must support iOS Safari, assume you cannot guarantee glitch‑free background/lock playback with pure Web Audio; design UX so the performer keeps the browser in the foreground and screen awake (e.g., guided to disable auto‑lock) or uses a wrapped/native app.


## Android Chrome

- Android Chrome is generally more permissive: if a tab is actively playing media and the user has interacted, audio often continues when you switch apps or lock the screen, subject to battery‑optimization settings.[^3_4][^3_6][^3_11][^3_7]
- However, background behavior depends on:
    - OS “battery optimization” / background limits for Chrome; if restricted, Android may stop background audio to save power.[^3_11][^3_7]
    - Tab freezing/discarding in Chrome, which can suspend background tabs; playing audio makes the tab more likely to be kept alive, but not guaranteed.[^3_5][^3_4]
- Recommended steps for a live‑performance context on Android:
    - Instruct users to set Chrome’s app battery usage to “Unrestricted” (or equivalent vendor setting) before the show.[^3_7][^3_11]
    - Keep a continuous audio stream playing (even if it’s mostly silence plus your metronome/track) so the tab is marked as active media and less likely to be frozen.[^3_6][^3_4]


## General workarounds and patterns

- Don’t rely on JS timers in background: even if audio continues, `setTimeout`/`setInterval` can be heavily throttled, breaking “live” scheduling; schedule as much as possible ahead using `AudioContext.currentTime`.[^3_5]
- Use the Page Visibility / lifecycle events (`visibilitychange`, `pagehide`, etc.) to detect when you lose foreground and update your UI state (e.g., show “Background mode may be unreliable on this device”).[^3_12][^3_13][^3_5]
- For serious live‑performance needs:
    - Prefer a native wrapper (WKWebView‑based iOS app with background audio entitlement, Android WebView app with background playback allowed) and run your Web Audio code inside that, or
    - Provide a dedicated native app for critical metronome/click duties and treat the web app as the controller/visual layer.

If your target is mainly iOS‑based performers, are you open to shipping a minimal native wrapper just for reliable background audio, or do you need this to remain 100% in Safari?
<span style="display:none">[^3_14][^3_15]</span>

<div align="center">⁂</div>

[^3_1]: https://stackoverflow.com/questions/69502340/ios-15-web-audio-playback-stops-working-in-safari-after-locking-screen-for-a-fe

[^3_2]: https://github.com/goldfire/howler.js/issues/1525

[^3_3]: https://niconiconi.neocities.org/tech-notes/force-enable-web-audio-autoplay-on-ios-for-incompatible-apps-via-userscript/

[^3_4]: https://stackoverflow.com/questions/64058877/sound-does-not-play-in-background-tab

[^3_5]: https://developer.chrome.com/blog/web-audio-faq

[^3_6]: https://news.ycombinator.com/item?id=16850473

[^3_7]: https://www.spf.io/2025/01/30/how-to-keep-audio-playing-in-the-background-in-chrome-on-android/

[^3_8]: https://www.reddit.com/r/webdev/comments/1ldjqa1/safari_web_audio_api_issue_audiocontext_silently/

[^3_9]: https://www.youtube.com/watch?v=YmsJbGLgD9U

[^3_10]: https://github.com/video-dev/hls.js/issues/3480

[^3_11]: https://www.youtube.com/watch?v=IHFWhm0usnQ

[^3_12]: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API

[^3_13]: https://stackoverflow.com/questions/11177010/pause-a-sound-when-user-leaves-the-page-on-mobile-safari

[^3_14]: https://forums.tumult.com/t/how-to-stop-sound-playing-in-background-in-a-webview-or-mobile-browser/15350

[^3_15]: https://community.glideapps.com/t/audio-component-on-ios-keeps-playing-even-during-locked-screen/7224

