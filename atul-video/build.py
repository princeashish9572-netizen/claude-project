"""Generates index.html and compositions/*.html for the Atul Sir / Bhaskar Foundation video.

Run: python3 build.py   (edit the timings below, then rebuild)
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
COMP = ROOT / "compositions"
COMP.mkdir(exist_ok=True)

FOOT = 84.19          # silence-cut footage length
END = 87.5            # root duration (footage + logo outro tail)
OUTRO = 82.6
# Segment boundaries of the silence-cut footage (output seconds).
B = [0, 1.51, 4.28, 7.21, 9.09, 12.92, 16.3, 22.36, 25.75, 27.12, 32.14, 36.82, 38.01, 39.78, 42.45,
     47.29, 49.78, 52.33, 56.37, 58.27, 62.18, 62.71, 64.33, 66.07, 68.41, 70.71, 72.95, 73.25, 74.17,
     78.77, 80.24, FOOT]
WIPES = [7.21, 12.92, 25.75, 32.14, 38.01, 47.29, 52.33, 62.18, 66.07, 70.71, 74.17]
BRANDS = [18.6, 56.6]
LT = [3.8, 42.6]
CTA = 76.4

GOLD_TEXT = ("background: linear-gradient(180deg, #fff4c8 0%, #f5c451 45%, #b77a1e 100%);"
             "-webkit-background-clip: text; background-clip: text; color: transparent;")
RAYS = """background: repeating-conic-gradient(from 0deg, rgba(255,210,110,0.55) 0deg 4deg, rgba(255,210,110,0) 4deg 15deg);
      -webkit-mask-image: radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0) 62%);
      mask-image: radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0) 62%);
      mix-blend-mode: screen; border-radius: 50%;"""


def scene(cid, css, body, js):
    (COMP / f"{cid}.html").write_text(f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; pointer-events: none; }}
{css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="1080" data-height="1920">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
""")


def badge_block(p, size):
    """Badge with rays, burst ring and a shine band clipped to the coin."""
    return f"""      <div id="{p}-rays"></div>
      <div id="{p}-ring"></div>
      <div id="{p}-coin"><img id="{p}-logo" src="assets/logo.png" /><div id="{p}-band"></div></div>"""


def badge_css(p, size):
    r = size * 1.7
    return f"""    #{p}-rays {{ position: absolute; left: {(size - r) / 2}px; top: {(size - r) / 2}px; width: {r}px; height: {r}px; {RAYS} }}
    #{p}-ring {{ position: absolute; left: 0; top: 0; width: {size}px; height: {size}px; border-radius: 50%;
      border: 6px solid rgba(255,214,120,0.95); box-shadow: 0 0 40px rgba(255,200,90,0.9), inset 0 0 40px rgba(255,200,90,0.6); }}
    #{p}-coin {{ position: absolute; left: 0; top: 0; width: {size}px; height: {size}px; border-radius: 50%; overflow: hidden; }}
    #{p}-logo {{ position: absolute; left: 0; top: 0; width: {size}px; height: {size}px; }}
    #{p}-band {{ position: absolute; left: -260px; top: -100px; width: 200px; height: {size + 200}px; transform-origin: 50% 50%;
      background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,235,0.85) 50%, rgba(255,255,255,0) 100%); mix-blend-mode: screen; }}"""


# ---------------------------------------------------------------- intro
S = 640
scene("intro", f"""    #intro-scrim {{ position: absolute; inset: 0;
      background: radial-gradient(ellipse 75% 42% at 50% 50%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%); }}
    #intro-stage {{ position: absolute; left: {540 - S/2}px; top: {960 - S/2}px; width: {S}px; height: {S}px; perspective: 1400px; }}
{badge_css("intro", S)}""",
f"""    <div id="intro-scrim" class="clip" data-start="0" data-duration="3.6"></div>
    <div id="intro-stage" class="clip" data-start="0" data-duration="3.6" data-layout-allow-overflow data-layout-ignore>
{badge_block("intro", S)}
    </div>""",
"""    tl.fromTo("#intro-coin", { rotationY: -70, scale: 0.78, opacity: 0.9 }, { rotationY: 0, scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.6)" }, 0);
    tl.fromTo("#intro-rays", { opacity: 0, scale: 0.5, rotation: 0 }, { opacity: 1, scale: 1, rotation: 45, duration: 3.0, ease: "power2.out" }, 0.1);
    tl.fromTo("#intro-ring", { opacity: 1, scale: 0.9 }, { opacity: 0, scale: 1.6, duration: 0.9, ease: "power2.out" }, 0.45);
    tl.fromTo("#intro-band", { x: 0, rotation: 20 }, { x: 1150, rotation: 20, duration: 0.9, ease: "power2.inOut" }, 0.8);
    tl.fromTo("#intro-band", { x: 0, rotation: 20 }, { x: 1150, rotation: 20, duration: 0.9, ease: "power2.inOut", immediateRender: false }, 1.9);
    tl.fromTo("#intro-stage", { x: 0, y: 0, scale: 1, opacity: 1 }, { x: 410, y: -770, scale: 0.3, opacity: 0, duration: 0.75, ease: "power3.in" }, 2.8);
    tl.fromTo("#intro-scrim", { opacity: 1 }, { opacity: 0, duration: 0.6, ease: "power2.in" }, 2.85);""")

# ---------------------------------------------------------------- lower thirds
for i, _ in enumerate(LT, 1):
    p = f"lt{i}"
    scene(p, f"""    #{p}-card {{ position: absolute; left: 96px; top: 900px; width: 680px; height: 220px; border-radius: 22px; overflow: hidden;
      background: linear-gradient(135deg, rgba(18,13,4,0.88), rgba(10,8,4,0.76)); border: 2px solid rgba(245,196,81,0.6);
      box-shadow: 0 18px 50px rgba(0,0,0,0.55), 0 0 30px rgba(245,196,81,0.3); }}
    #{p}-logo {{ position: absolute; left: 14px; top: 34px; width: 152px; height: 152px; }}
    #{p}-bar {{ position: absolute; left: 180px; top: 36px; width: 6px; height: 148px; border-radius: 3px; background: linear-gradient(180deg, #fff1bf, #f5c451, #a8701c); transform-origin: 50% 0; }}
    #{p}-name {{ position: absolute; left: 200px; top: 34px; width: 470px; font-family: Montserrat, sans-serif; font-weight: 900; font-size: 76px; line-height: 1.05; letter-spacing: 0.02em; {GOLD_TEXT} }}
    #{p}-rule {{ position: absolute; left: 202px; top: 128px; width: 460px; height: 3px; background: linear-gradient(90deg, #f5c451, rgba(245,196,81,0)); transform-origin: 0 50%; }}
    #{p}-org {{ position: absolute; left: 202px; top: 144px; width: 470px; font-family: "Playfair Display", serif; font-weight: 700; font-size: 31px; letter-spacing: 0.08em; color: #fff; }}
    #{p}-glint {{ position: absolute; left: -200px; top: 0; width: 140px; height: 220px; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,246,210,0.4), rgba(255,255,255,0)); }}""",
f"""    <div id="{p}-card" class="clip" data-start="0" data-duration="6">
      <img id="{p}-logo" src="assets/logo.png" />
      <div id="{p}-bar"></div>
      <div id="{p}-name" data-var-text="speaker">ATUL SIR</div>
      <div id="{p}-rule"></div>
      <div id="{p}-org" data-var-text="org">BHASKAR FOUNDATION</div>
      <div id="{p}-glint" data-layout-ignore></div>
    </div>""",
f"""    tl.fromTo("#{p}-card", {{ opacity: 0, x: -120 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, 0);
    tl.fromTo("#{p}-logo", {{ scale: 0.3, rotation: -200, opacity: 0 }}, {{ scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }}, 0.05);
    tl.fromTo("#{p}-bar", {{ scaleY: 0 }}, {{ scaleY: 1, duration: 0.4, ease: "power3.out" }}, 0.2);
    tl.fromTo("#{p}-name", {{ y: 60, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }}, 0.3);
    tl.fromTo("#{p}-rule", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.6, ease: "power2.inOut" }}, 0.5);
    tl.fromTo("#{p}-org", {{ y: 24, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }}, 0.65);
    tl.fromTo("#{p}-glint", {{ x: 0 }}, {{ x: 1050, duration: 1.0, ease: "power2.inOut" }}, 1.2);
    tl.fromTo("#{p}-glint", {{ x: 0 }}, {{ x: 1050, duration: 1.0, ease: "power2.inOut", immediateRender: false }}, 3.3);
    tl.fromTo("#{p}-logo", {{ rotationY: 0 }}, {{ rotationY: 360, duration: 1.0, ease: "power2.inOut" }}, 2.4);
    tl.to("#{p}-card", {{ opacity: 0, x: -140, duration: 0.4, ease: "power2.in" }}, 5.5);""")

# ---------------------------------------------------------------- brand stingers (spinning badge mid-video)
S2 = 560
for i, _ in enumerate(BRANDS, 1):
    p = f"brand{i}"
    scene(p, f"""    #{p}-scrim {{ position: absolute; inset: 0; background: radial-gradient(ellipse 70% 38% at 50% 52%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%); }}
    #{p}-stage {{ position: absolute; left: {540 - S2/2}px; top: {1000 - S2/2}px; width: {S2}px; height: {S2}px; perspective: 1400px; }}
{badge_css(p, S2)}""",
f"""    <div id="{p}-scrim" class="clip" data-start="0" data-duration="2.8"></div>
    <div id="{p}-stage" class="clip" data-start="0" data-duration="2.8" data-layout-allow-overflow data-layout-ignore>
{badge_block(p, S2)}
    </div>""",
f"""    tl.fromTo("#{p}-scrim", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3, ease: "power2.out" }}, 0);
    tl.fromTo("#{p}-coin", {{ rotationY: -540, scale: 0.2 }}, {{ rotationY: 0, scale: 1, duration: 1.1, ease: "power3.out" }}, 0);
    tl.fromTo("#{p}-rays", {{ opacity: 0, scale: 0.4, rotation: 0 }}, {{ opacity: 1, scale: 1, rotation: 60, duration: 2.4, ease: "power2.out" }}, 0.2);
    tl.fromTo("#{p}-ring", {{ opacity: 1, scale: 0.9 }}, {{ opacity: 0, scale: 1.8, duration: 0.8, ease: "power2.out" }}, 0.9);
    tl.fromTo("#{p}-band", {{ x: 0, rotation: 20 }}, {{ x: 1000, rotation: 20, duration: 0.8, ease: "power2.inOut" }}, 1.2);
    tl.fromTo("#{p}-stage", {{ scale: 1, opacity: 1 }}, {{ scale: 0.4, opacity: 0, duration: 0.45, ease: "back.in(2)" }}, 2.3);
    tl.to("#{p}-scrim", {{ opacity: 0, duration: 0.4, ease: "power2.in" }}, 2.35);""")

# ---------------------------------------------------------------- cut wipes (gold light sweep)
for i, _ in enumerate(WIPES, 1):
    p = f"wipe{i}"
    flip = i % 2 == 0
    scene(p, f"""    .{p}-bar {{ position: absolute; left: 0; top: -400px; height: 2700px; transform-origin: 50% 50%; mix-blend-mode: screen; }}
    #{p}-a {{ width: 260px; background: linear-gradient(90deg, rgba(255,200,90,0) 0%, rgba(255,214,120,0.95) 50%, rgba(255,200,90,0) 100%); }}
    #{p}-b {{ width: 120px; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,250,230,0.9) 50%, rgba(255,255,255,0) 100%); }}
    #{p}-flash {{ position: absolute; inset: 0; background: radial-gradient(circle at 50% 45%, rgba(255,236,190,0.85) 0%, rgba(255,200,100,0.35) 40%, rgba(255,200,100,0) 75%); }}""",
f"""    <div id="{p}-fx" class="clip" data-start="0" data-duration="0.8" data-layout-ignore data-layout-allow-overflow>
      <div id="{p}-flash"></div>
      <div id="{p}-a" class="{p}-bar"></div>
      <div id="{p}-b" class="{p}-bar"></div>
    </div>""",
f"""    const dir = {-1 if flip else 1}, rot = {-24 if flip else 24};
    tl.fromTo("#{p}-a", {{ x: dir > 0 ? -500 : 1300, rotation: rot }}, {{ x: dir > 0 ? 1300 : -500, rotation: rot, duration: 0.55, ease: "power2.inOut" }}, 0);
    tl.fromTo("#{p}-b", {{ x: dir > 0 ? -700 : 1500, rotation: rot }}, {{ x: dir > 0 ? 1400 : -600, rotation: rot, duration: 0.6, ease: "power2.inOut" }}, 0.04);
    tl.fromTo("#{p}-flash", {{ opacity: 0.9 }}, {{ opacity: 0, duration: 0.45, ease: "power2.out" }}, 0);""")

# ---------------------------------------------------------------- frame: running gold border + corner brackets
scene("frame", """    #frame-border { position: absolute; left: 22px; top: 22px; width: 1036px; height: 1876px; padding: 5px; border-radius: 28px; overflow: hidden;
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
    #frame-base { position: absolute; inset: 0; background: rgba(245,196,81,0.35); }
    #frame-spin { position: absolute; left: -700px; top: -250px; width: 2436px; height: 2436px;
      background: conic-gradient(from 0deg, rgba(255,214,120,0) 0deg, rgba(255,240,190,1) 18deg, rgba(255,190,70,0.9) 30deg, rgba(255,214,120,0) 60deg,
        rgba(255,214,120,0) 180deg, rgba(255,240,190,1) 198deg, rgba(255,190,70,0.9) 210deg, rgba(255,214,120,0) 240deg); }
    .frame-c { position: absolute; width: 110px; height: 110px; border-color: #f5c451; border-style: solid; border-width: 0; filter: drop-shadow(0 0 10px rgba(245,196,81,0.9)); }
    #frame-tl { left: 40px; top: 40px; border-top-width: 8px; border-left-width: 8px; border-top-left-radius: 22px; transform-origin: 0 0; }
    #frame-tr { right: 40px; top: 40px; border-top-width: 8px; border-right-width: 8px; border-top-right-radius: 22px; transform-origin: 100% 0; }
    #frame-bl { left: 40px; bottom: 40px; border-bottom-width: 8px; border-left-width: 8px; border-bottom-left-radius: 22px; transform-origin: 0 100%; }
    #frame-br { right: 40px; bottom: 40px; border-bottom-width: 8px; border-right-width: 8px; border-bottom-right-radius: 22px; transform-origin: 100% 100%; }""",
f"""    <div id="frame-all" class="clip" data-start="0" data-duration="{OUTRO - 3.4:.2f}" data-layout-ignore data-layout-allow-overflow>
      <div id="frame-border"><div id="frame-base"></div><div id="frame-spin"></div></div>
      <div id="frame-tl" class="frame-c"></div><div id="frame-tr" class="frame-c"></div>
      <div id="frame-bl" class="frame-c"></div><div id="frame-br" class="frame-c"></div>
    </div>""",
f"""    const D = {OUTRO - 3.4:.2f};
    tl.fromTo("#frame-all", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.6, ease: "power2.out" }}, 0);
    tl.fromTo(".frame-c", {{ scale: 0 }}, {{ scale: 1, duration: 0.6, ease: "back.out(2.5)", stagger: 0.08 }}, 0.1);
    tl.fromTo("#frame-spin", {{ rotation: 0 }}, {{ rotation: 360 * Math.round(D / 5), duration: D, ease: "none" }}, 0);
    const n = Math.floor((D - 2) / 1.6);
    tl.fromTo(".frame-c", {{ scale: 1 }}, {{ scale: 1.12, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: n * 2 - 1, immediateRender: false }}, 1.0);
    tl.to("#frame-all", {{ opacity: 0, duration: 0.4, ease: "power2.in" }}, D - 0.45);""")

# ---------------------------------------------------------------- ticker
unit = "BHASKAR FOUNDATION &nbsp;•&nbsp; ATUL SIR &nbsp;•&nbsp; "
TK0, TK1 = 9.9, OUTRO
scene("ticker", f"""    #ticker-band {{ position: absolute; left: 0; top: 1168px; width: 1080px; height: 72px; overflow: hidden;
      background: linear-gradient(90deg, rgba(120,70,10,0.92), rgba(30,18,4,0.92) 30%, rgba(30,18,4,0.92) 70%, rgba(120,70,10,0.92));
      border-top: 2px solid #f5c451; border-bottom: 2px solid #f5c451; box-shadow: 0 0 24px rgba(245,196,81,0.45); }}
    #ticker-text {{ position: absolute; left: 0; top: 13px; white-space: nowrap; font-family: Montserrat, sans-serif; font-weight: 800; font-size: 36px; letter-spacing: 0.1em; {GOLD_TEXT} }}""",
f"""    <div id="ticker-band" class="clip" data-start="0" data-duration="{TK1 - TK0:.2f}" data-layout-allow-overflow data-layout-allow-safe-zone data-layout-ignore>
      <div id="ticker-text">{unit * 14}</div>
    </div>""",
f"""    const D = {TK1 - TK0:.2f};
    tl.fromTo("#ticker-band", {{ scaleY: 0, opacity: 0 }}, {{ scaleY: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }}, 0);
    tl.fromTo("#ticker-text", {{ x: 0 }}, {{ x: -D * 120, duration: D, ease: "none" }}, 0);
    tl.to("#ticker-band", {{ opacity: 0, duration: 0.35, ease: "power2.in" }}, D - 0.4);""")

# ---------------------------------------------------------------- CTA (like / share / follow)
icons = {
    "like": '<path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" fill="#c8202a" stroke="#fff1bf" stroke-width="1.2"/>',
    "share": '<path d="M14 4l7 7-7 7v-4c-5 0-8.5 1.5-11 5 1-5 4-10 11-11z" fill="#f5c451"/>',
    "follow": '<circle cx="12" cy="12" r="10" fill="#f5c451"/><path d="M12 7v10M7 12h10" stroke="#1a1204" stroke-width="2.6" stroke-linecap="round"/>',
}
labels = {"like": "LIKE", "share": "SHARE", "follow": "FOLLOW"}
pills = "\n".join(
    f'''        <div id="cta-{k}" class="cta-pill"><svg viewBox="0 0 24 24" width="64" height="64">{v}</svg><span>{labels[k]}</span></div>'''
    for k, v in icons.items())
scene("cta", f"""    #cta-box {{ position: absolute; left: 150px; top: 760px; width: 600px; height: 380px; }}
    .cta-pill {{ position: relative; display: flex; align-items: center; gap: 22px; height: 104px; margin-bottom: 22px; padding: 0 34px; width: 520px;
      border-radius: 60px; background: linear-gradient(135deg, rgba(25,17,4,0.92), rgba(60,38,8,0.88)); border: 3px solid #f5c451;
      box-shadow: 0 0 26px rgba(245,196,81,0.5); }}
    .cta-pill span {{ font-family: Montserrat, sans-serif; font-weight: 900; font-size: 52px; letter-spacing: 0.08em; {GOLD_TEXT} }}""",
f"""    <div id="cta-box" class="clip" data-start="0" data-duration="{OUTRO - CTA:.2f}">
{pills}
    </div>""",
f"""    const ids = ["#cta-like", "#cta-share", "#cta-follow"];
    ids.forEach((id, i) => {{
      tl.fromTo(id, {{ x: -700, opacity: 0 }}, {{ x: 0, opacity: 1, duration: 0.55, ease: "back.out(1.6)" }}, 0.15 + i * 0.22);
      tl.fromTo(id + " svg", {{ scale: 1 }}, {{ scale: 1.35, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 }}, 1.4 + i * 0.7);
      tl.fromTo(id, {{ scale: 1 }}, {{ scale: 1.06, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }}, 1.4 + i * 0.7);
    }});
    tl.to("#cta-box", {{ opacity: 0, x: 200, duration: 0.4, ease: "power2.in" }}, {OUTRO - CTA - 0.5:.2f});""")

# ---------------------------------------------------------------- fx: sparks + light leaks
scene("fx", """    .fx-leak { position: absolute; left: 0; top: 0; width: 1000px; height: 1000px; border-radius: 50%; opacity: 0; mix-blend-mode: screen;
      background: radial-gradient(circle, rgba(255,190,80,0.6) 0%, rgba(255,120,40,0.3) 35%, rgba(255,120,40,0) 70%); }
    .fx-spark { position: absolute; left: 0; top: 0; width: 14px; height: 14px; border-radius: 50%; mix-blend-mode: screen;
      background: radial-gradient(circle, #fffbe8 0%, rgba(255,205,100,0.95) 35%, rgba(255,205,100,0) 70%); }""",
"""    <div id="fx-layer" class="clip" data-start="0" data-duration="83" data-layout-ignore data-layout-allow-overflow>
      <div id="fx-leak-a" class="fx-leak"></div>
      <div id="fx-leak-b" class="fx-leak"></div>
      <div id="fx-sparks"></div>
    </div>""",
"""    const D = 83;
    let s = 2024;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const host = document.querySelector("#fx-sparks");
    for (let i = 0; i < 56; i++) {
      const el = document.createElement("div");
      el.className = "fx-spark"; el.id = "fx-spark-" + i; host.appendChild(el);
      const side = rnd() < 0.5;
      const x = side ? 10 + rnd() * 260 : 810 + rnd() * 260;
      const size = 0.6 + rnd() * 1.8, period = 5 + rnd() * 7, reps = Math.ceil(D / period), y0 = 1950 - rnd() * 700;
      tl.fromTo(el, { x: x, y: y0, scale: size }, { y: y0 - 1700, x: x + (rnd() - 0.5) * 200, duration: period, ease: "none", repeat: reps - 1 }, rnd() * 2);
      tl.fromTo(el, { opacity: 0 }, { opacity: 0.55 + rnd() * 0.45, duration: period / 2, ease: "sine.inOut", yoyo: true, repeat: reps * 2 - 1 }, 0);
    }
    const sweeps = [5.0, 14.0, 23.0, 30.0, 36.0, 45.0, 51.0, 60.0, 68.0, 77.0];
    sweeps.forEach((t, i) => {
      const id = i % 2 ? "#fx-leak-b" : "#fx-leak-a", L = i % 2 === 0;
      tl.fromTo(id, { x: L ? -800 : 900, y: L ? 150 : 950, scale: 1 }, { x: L ? 900 : -800, y: L ? 750 : 250, scale: 1.5, duration: 3.0, ease: "sine.inOut" }, t);
      tl.fromTo(id, { opacity: 0 }, { opacity: 1, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: 1 }, t);
    });""")

# ---------------------------------------------------------------- outro
S3 = 760
scene("outro", f"""    #outro-bg {{ position: absolute; inset: 0; background: radial-gradient(ellipse 75% 50% at 50% 46%, #2a1a05 0%, #0b0703 55%, #000 100%); }}
    #outro-stage {{ position: absolute; left: {540 - S3/2}px; top: {880 - S3/2}px; width: {S3}px; height: {S3}px; perspective: 1600px; }}
{badge_css("outro", S3)}
    #outro-name {{ position: absolute; left: 140px; top: 1320px; width: 800px; text-align: center; font-family: Montserrat, sans-serif; font-weight: 900; font-size: 68px; letter-spacing: 0.14em; {GOLD_TEXT} }}""",
f"""    <div id="outro-bg" class="clip" data-start="0" data-duration="{END - OUTRO:.2f}"></div>
    <div id="outro-stage" class="clip" data-start="0.3" data-duration="{END - OUTRO - 0.3:.2f}" data-layout-allow-overflow data-layout-ignore>
{badge_block("outro", S3)}
    </div>
    <div id="outro-name" class="clip" data-start="1.1" data-duration="{END - OUTRO - 1.1:.2f}" data-var-text="speaker">ATUL SIR</div>""",
"""    tl.fromTo("#outro-bg", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" }, 0);
    tl.fromTo("#outro-coin", { rotationY: -720, scale: 0.3, opacity: 0 }, { rotationY: 0, scale: 1, opacity: 1, duration: 1.3, ease: "power3.out" }, 0.3);
    tl.fromTo("#outro-rays", { opacity: 0, scale: 0.5, rotation: 0 }, { opacity: 1, scale: 1, rotation: 60, duration: 4.4, ease: "power1.out" }, 0.4);
    tl.fromTo("#outro-ring", { opacity: 1, scale: 0.85 }, { opacity: 0, scale: 1.7, duration: 1.0, ease: "power2.out" }, 1.4);
    tl.fromTo("#outro-band", { x: 0, rotation: 20 }, { x: 1300, rotation: 20, duration: 1.0, ease: "power2.inOut" }, 1.6);
    tl.fromTo("#outro-band", { x: 0, rotation: 20 }, { x: 1300, rotation: 20, duration: 1.0, ease: "power2.inOut", immediateRender: false }, 3.2);
    tl.fromTo("#outro-name", { y: 50, opacity: 0, scale: 1.4 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }, 1.1);""")

# ---------------------------------------------------------------- root
Z = [1.0, 1.14, 1.05, 1.18, 1.02, 1.12, 1.07, 1.16]
hosts = []
def host(cid, start, dur, lane, z):
    hosts.append(f'''      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" data-start="{start}" data-duration="{dur:.2f}"
        data-track-index="{lane}" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:{z}"></div>''')

host("fx", 0, 83, 1, 4)
host("frame", 3.4, OUTRO - 3.4, 2, 5)
host("ticker", TK0, TK1 - TK0, 3, 6)
host("intro", 0, 3.6, 4, 9)
for i, t in enumerate(LT, 1): host(f"lt{i}", t, 6, 4, 9)
for i, t in enumerate(BRANDS, 1): host(f"brand{i}", t, 2.8, 4, 9)
host("cta", CTA, OUTRO - CTA, 4, 9)
for i, t in enumerate(WIPES, 1): host(f"wipe{i}", round(t - 0.25, 2), 0.8, 5, 8)
host("outro", OUTRO, END - OUTRO, 6, 11)

sfx = []
def a(id_, src, t, dur, lane, vol):
    sfx.append(f'      <audio id="{id_}" class="clip" src="assets/{src}" data-start="{t}" data-duration="{dur}" data-track-index="{lane}" data-volume="{vol}"></audio>')
a("sfx-intro-whoosh", "whoosh.wav", 0, 1.4, 7, 0.35)
a("sfx-intro-shim", "shimmer.wav", 0.4, 1.6, 8, 0.22)
for i, t in enumerate(BRANDS, 1):
    a(f"sfx-brand{i}-whoosh", "whoosh.wav", round(t - 0.2, 2), 1.4, 7, 0.3)
    a(f"sfx-brand{i}-shim", "shimmer.wav", round(t + 0.9, 2), 1.6, 8, 0.2)
for i, t in enumerate(WIPES, 1):
    a(f"sfx-wipe{i}", "whoosh.wav", round(t - 0.45, 2), 1.4, 7, 0.16)
a("sfx-outro-whoosh", "whoosh.wav", 82.4, 1.4, 7, 0.35)
a("sfx-outro-shim", "shimmer.wav", 83.6, 1.6, 8, 0.25)

(ROOT / "index.html").write_text(f"""<!doctype html>
<html lang="en" data-resolution="portrait"
  data-composition-variables='[{{"id":"speaker","type":"string","label":"Speaker name","default":"ATUL SIR"}},{{"id":"org","type":"string","label":"Organisation","default":"BHASKAR FOUNDATION"}}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; }}
      #cam {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: 50% 24%; }}
      #footage {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }}
      #vignette {{ position: absolute; inset: 0; z-index: 3; pointer-events: none;
        background: radial-gradient(ellipse 80% 62% at 50% 38%, rgba(0,0,0,0) 55%, rgba(8,5,0,0.5) 100%),
          linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.38) 100%); }}
      #bug-wrap {{ position: absolute; right: 56px; top: 70px; width: 190px; height: 190px; z-index: 7; perspective: 800px; }}
      #bug {{ position: absolute; left: 0; top: 0; width: 190px; height: 190px; filter: drop-shadow(0 0 14px rgba(245,196,81,0.7)); }}
      #progress-fill {{ position: absolute; left: 0; top: 1910px; width: 1080px; height: 10px; z-index: 7; transform-origin: 0 50%;
        background: linear-gradient(90deg, #a8701c, #f5c451, #fff1bf); box-shadow: 0 0 16px rgba(245,196,81,0.9); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1080" data-height="1920">
      <div id="cam">
        <video id="footage" class="clip" src="assets/footage.mp4" data-start="0" data-duration="{FOOT}" data-track-index="0"
          playsinline data-has-audio="true" data-volume="1"></video>
      </div>
      <div id="vignette"></div>
{chr(10).join(hosts)}
      <div id="bug-wrap"><img id="bug" class="clip" src="assets/logo.png" data-start="3.3" data-duration="{OUTRO - 3.3:.2f}" data-track-index="9" /></div>
      <div id="progress-fill" class="clip" data-start="0" data-duration="{OUTRO}" data-track-index="10"></div>
{chr(10).join(sfx)}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      const B = {json.dumps(B)};
      const Z = {json.dumps(Z)};
      for (let i = 0; i < B.length - 1; i++) {{
        const z = Z[i % Z.length];
        tl.fromTo("#cam", {{ scale: z, x: 0 }}, {{ scale: z + 0.05, x: (i % 2 ? 8 : -8), duration: B[i + 1] - B[i], ease: "none" }}, B[i]);
      }}
      tl.fromTo("#bug", {{ opacity: 0, scale: 0.5 }}, {{ opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }}, 3.3);
      for (let t = 12; t < {OUTRO - 2}; t += 10) {{
        tl.fromTo("#bug", {{ rotationY: 0 }}, {{ rotationY: 360, duration: 1.2, ease: "power2.inOut", immediateRender: false }}, t);
      }}
      tl.to("#bug", {{ opacity: 0, duration: 0.35, ease: "power2.in" }}, {OUTRO - 0.4});
      tl.fromTo("#progress-fill", {{ scaleX: 0 }}, {{ scaleX: 1, duration: {OUTRO}, ease: "none" }}, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
""")
print("built", len(hosts), "scenes,", len(sfx), "sfx")
