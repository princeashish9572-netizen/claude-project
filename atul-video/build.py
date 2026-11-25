"""Before / After showcase edit for Atul Sir (Bhaskar Foundation), modelled on the user's reference layout.

Run: python3 build.py  -> writes index.html and compositions/*.html
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
COMP = ROOT / "compositions"
COMP.mkdir(exist_ok=True)
for f in COMP.glob("*.html"):
    f.unlink()

FOOT = 54.19
END = 56.0
# Segment boundaries of the silence-cut footage (output seconds).
B = [0, 1.51, 4.28, 7.21, 11.04, 14.42, 20.48, 23.87, 28.55, 33.39, 35.88, 37.78, 41.69, 43.31, 45.05,
     47.35, 49.59, FOOT]

# After-panel geometry (canvas px) and the panel's own size.
PX, PY, PW, PH = 368, 400, 650, 1125
BX, BY, BW, BH = 60, 610, 330, 586

FONT = "Poppins, sans-serif"
GLOW = "color:#fff; text-shadow: 0 0 18px rgba(255,255,255,0.85), 0 0 40px rgba(255,255,255,0.45), 0 4px 14px rgba(0,0,0,0.6);"
PILL = ("display:inline-block; padding: 12px 30px; border-radius: 14px; font-family:" + FONT + "; font-weight: 700; color:#1d1503;"
        "background: linear-gradient(180deg, #fff7b8 0%, #f9dc4f 100%); box-shadow: 0 0 26px rgba(255,226,90,0.85), 0 6px 18px rgba(0,0,0,0.45);")
BG = ("position:absolute; inset:0; background: radial-gradient(ellipse 90% 60% at 50% 35%, #3a2a17 0%, #17120c 55%, #07060a 100%);")


def scene(cid, css, body, js, w=PW, h=PH):
    (COMP / f"{cid}.html").write_text(f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; }}
{css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{w}" data-height="{h}">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
""")


beats = []  # (id, start, dur)


def beat(cid, start, end, css, body, js):
    beats.append((cid, start, round(end - start, 2)))
    scene(cid, css, body, js)


def enter_bg(p):
    return f'    tl.fromTo("#{p}-bg", {{ opacity: 0, scale: 1.18 }}, {{ opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }}, 0);\n' \
           f'    tl.fromTo("#{p}-bg", {{ scale: 1 }}, {{ scale: 1.06, duration: 6, ease: "none", immediateRender: false }}, 0.35);\n'


def caption(p, text, top=150, size=46):
    css = f"    #{p}-cap {{ position:absolute; left:30px; top:{top}px; width:{PW - 60}px; text-align:center; font-family:{FONT}; font-weight:700; font-size:{size}px; line-height:1.15; {GLOW} }}\n" \
          f"    #{p}-cap b {{ color:#ffe066; text-shadow: 0 0 18px rgba(255,214,70,0.9), 0 0 40px rgba(255,214,70,0.5); }}"
    body = f'    <div id="{p}-cap" class="clip" data-start="0" data-duration="DUR">{text}</div>'
    js = f'    tl.fromTo("#{p}-cap", {{ opacity: 0, y: 30, scale: 0.9 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(2)" }}, 0.05);\n'
    return css, body, js


def pill(p, text, sub="", top=820, size=40):
    css = f"    #{p}-pill {{ position:absolute; left:0; top:{top}px; width:{PW}px; text-align:center; }}\n" \
          f"    #{p}-pill .pl {{ {PILL} font-size:{size}px; }}\n" \
          f"    #{p}-pill .sub {{ font-family:{FONT}; font-weight:600; font-size:28px; color:#fff; margin-bottom:8px; text-shadow:0 2px 8px rgba(0,0,0,0.8); }}"
    subh = f'<div class="sub">{sub}</div>' if sub else ""
    body = f'    <div id="{p}-pill" class="clip" data-start="0" data-duration="DUR">{subh}<span class="pl">{text}</span></div>'
    js = f'    tl.fromTo("#{p}-pill .pl", {{ scaleX: 0, opacity: 0 }}, {{ scaleX: 1, opacity: 1, duration: 0.45, ease: "power3.out" }}, 0.25);\n' \
         f'    tl.fromTo("#{p}-pill .sub", {{ opacity: 0, y: 10 }}, {{ opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }}, 0.5);\n' if sub else \
         f'    tl.fromTo("#{p}-pill .pl", {{ scaleX: 0, opacity: 0 }}, {{ scaleX: 1, opacity: 1, duration: 0.45, ease: "power3.out" }}, 0.25);\n'
    return css, body, js


def assemble(cid, start, end, parts, extra_css="", extra_body="", extra_js=""):
    dur = round(end - start, 2)
    css = "\n".join(p[0] for p in parts) + "\n" + extra_css
    body = extra_body + "\n" + "\n".join(p[1] for p in parts)
    js = "".join(p[2] for p in parts) + extra_js
    beat(cid, start, end, css, body.replace("DUR", str(dur)), js)


def card(cid, start, end, art_css, art_body, art_js, cap=None, pl=None):
    """An opaque cinematic card: background + art + caption/pill."""
    dur = round(end - start, 2)
    parts = []
    if cap:
        parts.append(caption(cid, *cap) if isinstance(cap, tuple) else caption(cid, cap))
    if pl:
        parts.append(pill(cid, *pl) if isinstance(pl, tuple) else pill(cid, pl))
    css = f"    #{cid}-bg {{ {BG} }}\n    #{cid}-art {{ position:absolute; left:0; top:0; width:{PW}px; height:{PH}px; }}\n" + art_css
    body = f'    <div id="{cid}-bg" class="clip" data-start="0" data-duration="{dur}" data-layout-ignore></div>\n' \
           f'    <div id="{cid}-art" class="clip" data-start="0" data-duration="{dur}" data-layout-ignore data-layout-allow-overflow>\n{art_body}\n    </div>'
    js = enter_bg(cid) + art_js
    assemble(cid, start, end, parts, css, body, js)


def overlay(cid, start, end, cap=None, pl=None):
    """Text over Atul Sir's footage: kept in the lower half so the face stays clear."""
    if isinstance(cap, tuple):
        cap = (cap[0], 700, cap[2] if len(cap) > 2 else 46)
    if isinstance(pl, tuple):
        pl = (pl[0], pl[1], 900, pl[3] if len(pl) > 3 else 40)
    parts = []
    if cap:
        parts.append(caption(cid, *cap) if isinstance(cap, tuple) else caption(cid, cap))
    if pl:
        parts.append(pill(cid, *pl) if isinstance(pl, tuple) else pill(cid, pl))
    assemble(cid, start, end, parts)


# ------------------------------------------------------------------ beats (text from Atul Sir's own words)
card("b01", 0.0, 1.51,
     "    #b01-eye { position:absolute; left:125px; top:380px; width:400px; height:400px; }",
     """      <svg id="b01-eye" viewBox="0 0 200 200">
        <defs><radialGradient id="b01g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe9a6"/><stop offset="1" stop-color="#c8902a"/></radialGradient></defs>
        <path d="M10 100 Q100 20 190 100 Q100 180 10 100Z" fill="none" stroke="#ffe066" stroke-width="6"/>
        <circle id="b01-iris" cx="100" cy="100" r="38" fill="url(#b01g)"/><circle cx="100" cy="100" r="16" fill="#120d05"/>
        <circle cx="112" cy="88" r="7" fill="#fff"/>
      </svg>""",
     """    tl.fromTo("#b01-eye", { scaleY: 0.05, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }, 0.05);
    tl.fromTo("#b01-iris", { x: -30 }, { x: 30, duration: 0.9, ease: "sine.inOut" }, 0.5);""",
     cap=("<b>OBSERVATION</b><br>ka game hai", 150, 58))

overlay("b02", 1.51, 4.28, cap=("Exam ke <b>pehle...</b>", 120, 50), pl=("Atul Sir", "Bhaskar Foundation", 860, 44))

card("b03", 4.28, 7.21,
     """    .b03-book { position:absolute; left:155px; width:340px; height:62px; border-radius:8px; box-shadow: 0 8px 18px rgba(0,0,0,0.5); }
    #b03-warn { position:absolute; left:205px; top:300px; width:240px; height:210px; }""",
     "\n".join(f'      <div id="b03-book{i}" class="b03-book" style="top:{820 - i * 66}px; background: linear-gradient(90deg, {c[0]}, {c[1]});"></div>'
               for i, c in enumerate([("#7a1418", "#b4262c"), ("#173d6e", "#2e64a8"), ("#145a32", "#239b56"), ("#6e4b0f", "#b9801f"), ("#4a1f6e", "#7d3cb5"), ("#7a1418", "#c0392b")]))
     + """
      <svg id="b03-warn" viewBox="0 0 120 105"><path d="M60 4 L116 100 H4 Z" fill="#ffd23f" stroke="#1d1503" stroke-width="5" stroke-linejoin="round"/>
        <rect x="55" y="34" width="10" height="38" rx="4" fill="#1d1503"/><circle cx="60" cy="84" r="6" fill="#1d1503"/></svg>""",
     "".join(f'    tl.fromTo("#b03-book{i}", {{ y: -900, rotation: {(-1) ** i * 8} }}, {{ y: 0, rotation: {(-1) ** i * 2}, duration: 0.45, ease: "bounce.out" }}, {0.1 + i * 0.12:.2f});\n' for i in range(6))
     + """    tl.fromTo("#b03-warn", { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" }, 0.9);
    tl.fromTo("#b03-warn", { scale: 1 }, { scale: 1.12, duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: 3, immediateRender: false }, 1.5);""",
     cap=("Kisi bhi <b>naye content</b> ko padhna", 110, 42), pl=("JAAN-LEVA HAMLA", "", 960, 44))


card("b05", 7.21, 11.04,
     """    #b05-cal { position:absolute; left:155px; top:330px; width:340px; height:380px; border-radius:26px; overflow:hidden; background:#fff; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    #b05-top { position:absolute; left:0; top:0; width:340px; height:96px; background: linear-gradient(180deg,#d8262d,#a3151b); color:#fff; font-family:Poppins, sans-serif; font-weight:700; font-size:40px; text-align:center; line-height:96px; }
    #b05-num { position:absolute; left:0; top:110px; width:340px; text-align:center; font-family:Poppins, sans-serif; font-weight:800; font-size:150px; color:#1d1503; line-height:1; }
    #b05-unit { position:absolute; left:0; top:280px; width:340px; text-align:center; font-family:Poppins, sans-serif; font-weight:700; font-size:40px; color:#a3151b; }""",
     """      <div id="b05-cal"><div id="b05-top">EXAM</div><div id="b05-num">30</div><div id="b05-unit">DIN PEHLE</div></div>""",
     """    tl.fromTo("#b05-cal", { rotationX: -90, opacity: 0, transformPerspective: 900 }, { rotationX: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, 0.1);
    const n5 = { v: 1 };
    tl.fromTo(n5, { v: 1 }, { v: 30, duration: 1.2, ease: "power2.out", onUpdate: () => { const el = document.querySelector("#b05-num"); if (el) el.textContent = Math.round(n5.v); } }, 0.5);""",
     cap=("<b>Preparation</b> hoti hai", 110, 46), pl=("1 MAHINA PEHLE", "Exam se", 790, 44))

card("b06", 11.04, 14.42,
     """    #b06-watch { position:absolute; left:150px; top:300px; width:350px; height:400px; }""",
     """      <svg id="b06-watch" viewBox="0 0 175 200">
        <rect x="72" y="2" width="31" height="16" rx="4" fill="#f5c451"/><rect x="82" y="16" width="11" height="12" fill="#f5c451"/>
        <circle cx="87.5" cy="112" r="80" fill="#14100a" stroke="#f5c451" stroke-width="9"/>
        <path id="b06-arc" d="M87.5 42 A70 70 0 1 1 87.4 42" fill="none" stroke="#e3342f" stroke-width="10" stroke-linecap="round" stroke-dasharray="440" stroke-dashoffset="440"/>
        <line id="b06-hand" x1="87.5" y1="112" x2="87.5" y2="52" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
        <circle cx="87.5" cy="112" r="8" fill="#f5c451"/>
      </svg>""",
     """    tl.fromTo("#b06-watch", { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, 0.05);
    tl.fromTo("#b06-hand", { rotation: 0, svgOrigin: "87.5 112" }, { rotation: 720, svgOrigin: "87.5 112", duration: 3.0, ease: "none" }, 0.3);
    tl.fromTo("#b06-arc", { strokeDashoffset: 440 }, { strokeDashoffset: 0, duration: 3.0, ease: "none" }, 0.3);""",
     cap=("Uske baad jo bhi hota hai...", 120, 40), pl=("TEST TIME", "Ye hai", 800, 50))

card("b07", 14.42, 20.48,
     """    .b07-row { position:absolute; left:80px; width:490px; height:110px; border-radius:22px; display:flex; align-items:center; gap:22px; padding:0 26px;
      background: rgba(255,255,255,0.08); border: 2px solid rgba(255,224,102,0.6); font-family:Poppins, sans-serif; font-weight:700; font-size:38px; color:#fff; }
    .b07-tick { width:62px; height:62px; border-radius:50%; background:#2ecc71; display:flex; align-items:center; justify-content:center; flex:none; }""",
     "\n".join(f'      <div id="b07-r{i}" class="b07-row" style="top:{360 + i * 150}px;"><div class="b07-tick"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M5 12l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>{t}</div>'
               for i, t in enumerate(["Questions solve", "With analysis", "Complete timing"])),
     "".join(f'    tl.fromTo("#b07-r{i}", {{ x: 700, opacity: 0 }}, {{ x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }}, {0.3 + i * 1.3:.2f});\n'
             f'    tl.fromTo("#b07-r{i} .b07-tick", {{ scale: 0 }}, {{ scale: 1, duration: 0.4, ease: "back.out(3)" }}, {0.6 + i * 1.3:.2f});\n' for i in range(3)),
     cap=("Jitne <b>questions</b> solve karoge", 130, 42), pl=("UTNA BETTER", "", 860, 46))

overlay("b08", 20.48, 23.87, cap=("Aapka utna <b>better</b> rahega", 120, 46), pl=("Examination", "Result", 860, 40))

card("b10", 23.87, 28.55,
     """    #b10-paper { position:absolute; left:165px; top:330px; width:320px; height:420px; border-radius:14px; background:#fbf6e9; box-shadow:0 20px 50px rgba(0,0,0,0.6); padding:30px; }
    #b10-paper .hd { font-family:Poppins, sans-serif; font-weight:800; font-size:34px; color:#a3151b; text-align:center; margin-bottom:22px; }
    #b10-paper .ln { height:14px; border-radius:7px; background:#d8cfb8; margin-bottom:22px; transform-origin:0 50%; }""",
     """      <div id="b10-paper"><div class="hd">EXAM PATTERN</div>""" + "".join(f'<div class="ln" id="b10-l{i}" style="width:{w}%"></div>' for i, w in enumerate([100, 86, 94, 70, 90, 60, 80])) + "</div>",
     """    tl.fromTo("#b10-paper", { y: 600, rotation: 12 }, { y: 0, rotation: -3, duration: 0.6, ease: "power3.out" }, 0.05);
""" + "".join(f'    tl.fromTo("#b10-l{i}", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.3, ease: "power2.out" }}, {0.6 + i * 0.12:.2f});\n' for i in range(7)),
     cap=("Padhne se pehle,<br><b>US EXAM</b> ko padho", 100, 46), pl=("Har bacche ko yahi bolta hoon", "", 860, 30))


card("b12", 28.55, 35.88,
     """    #b12-scale { position:absolute; left:5px; top:300px; width:640px; height:470px; }""",
     """      <svg id="b12-scale" viewBox="-45 0 370 235">
        <rect x="134" y="40" width="12" height="170" fill="#f5c451"/><rect x="90" y="205" width="100" height="16" rx="6" fill="#f5c451"/>
        <g id="b12-beam"><rect x="20" y="36" width="240" height="10" rx="5" fill="#ffe066"/>
          <line x1="40" y1="44" x2="40" y2="110" stroke="#ffe066" stroke-width="3"/><line x1="240" y1="44" x2="240" y2="110" stroke="#ffe066" stroke-width="3"/>
          <g id="b12-l"><path d="M5 110 H75 Q40 140 5 110Z" fill="#2ecc71"/><text x="40" y="160" fill="#2ecc71" font-family="Poppins" font-weight="800" font-size="19" text-anchor="middle">STRENGTH</text></g>
          <g id="b12-r"><path d="M205 110 H275 Q240 140 205 110Z" fill="#e3342f"/><text x="240" y="160" fill="#ff5a52" font-family="Poppins" font-weight="800" font-size="19" text-anchor="middle">WEAKNESS</text></g>
        </g><circle cx="140" cy="41" r="10" fill="#fff4c8"/>
      </svg>""",
     """    tl.fromTo("#b12-scale", { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, 0.05);
    tl.fromTo("#b12-beam", { rotation: 0, svgOrigin: "140 41" }, { rotation: 10, svgOrigin: "140 41", duration: 1.4, ease: "elastic.out(1, 0.4)" }, 0.8);
    tl.fromTo("#b12-beam", { rotation: 10, svgOrigin: "140 41" }, { rotation: -6, svgOrigin: "140 41", duration: 1.6, ease: "elastic.out(1, 0.4)", immediateRender: false }, 3.4);""",
     cap=("Har exam ki ek <b>strength</b><br>aur ek <b>weakness</b>", 100, 42), pl=("Simple sa matlab", "", 860, 38))

card("b13", 35.88, 37.78,
     """    #b13-target { position:absolute; left:125px; top:320px; width:400px; height:400px; }
    #b13-arrow { position:absolute; left:0; top:0; width:400px; height:400px; }""",
     """      <svg id="b13-target" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" fill="#e3342f"/><circle cx="100" cy="100" r="70" fill="#fff"/><circle cx="100" cy="100" r="48" fill="#e3342f"/>
        <circle cx="100" cy="100" r="26" fill="#fff"/><circle cx="100" cy="100" r="10" fill="#e3342f"/>
        <g id="b13-arrow-g"><line x1="100" y1="100" x2="190" y2="10" stroke="#f5c451" stroke-width="7" stroke-linecap="round"/>
          <path d="M180 4 L198 2 L196 20 Z" fill="#f5c451"/></g>
      </svg>""",
     """    tl.fromTo("#b13-target", { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.8)" }, 0.05);
    tl.fromTo("#b13-arrow-g", { x: 160, y: -160, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.35, ease: "power4.in" }, 0.7);
    tl.fromTo("#b13-target", { x: 0 }, { x: 8, duration: 0.06, ease: "none", yoyo: true, repeat: 5, immediateRender: false }, 1.05);""",
     cap=("Agar <b>weakness</b> par<br>kaam kiya...", 100, 46), pl=("WEAKNESS PE KAAM", "", 860, 42))

card("b14", 37.78, 41.69,
     """    #b14-ring { position:absolute; left:135px; top:290px; width:380px; height:380px; }
    #b14-num { position:absolute; left:0; top:405px; width:650px; text-align:center; font-family:Poppins, sans-serif; font-weight:800; font-size:120px; color:#ffe066; text-shadow:0 0 30px rgba(255,214,70,0.8); }""",
     """      <svg id="b14-ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="18"/>
        <circle id="b14-arc" cx="100" cy="100" r="84" fill="none" stroke="#ffe066" stroke-width="18" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="527.8" stroke-dashoffset="527.8"/></svg>
      <div id="b14-num">0%</div>""",
     """    tl.fromTo("#b14-ring", { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }, 0.05);
    tl.fromTo("#b14-arc", { strokeDashoffset: 527.8 }, { strokeDashoffset: 527.8 * 0.75, duration: 1.4, ease: "power2.out" }, 0.4);
    const n14 = { v: 0 };
    tl.fromTo(n14, { v: 0 }, { v: 25, duration: 1.4, ease: "power2.out", onUpdate: () => { const el = document.querySelector("#b14-num"); if (el) el.textContent = Math.round(n14.v) + "%"; } }, 0.4);
    tl.fromTo("#b14-num", { scale: 1 }, { scale: 1.15, duration: 0.2, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, 1.85);""",
     cap=("Lagbhag", 140, 44), pl=("QUESTIONS HANDLE KAR SAKTE HO", "", 860, 30))

card("b15", 41.69, 43.31,
     """    #b15-card { position:absolute; left:115px; top:330px; width:420px; height:330px; border-radius:30px; background:linear-gradient(160deg,#20304f,#0e1628); border:3px solid #4a78c2; box-shadow:0 20px 50px rgba(0,0,0,0.6); text-align:center; font-family:Poppins, sans-serif; }
    #b15-card .t { margin-top:40px; font-size:34px; font-weight:700; color:#9fc1ff; }
    #b15-card .n { font-size:130px; font-weight:800; color:#fff; line-height:1.05; }
    #b15-card .u { font-size:34px; font-weight:700; color:#ffe066; }""",
     """      <div id="b15-card"><div class="t">TOTAL</div><div class="n">200</div><div class="u">MARKS KA EXAM</div></div>""",
     """    tl.fromTo("#b15-card", { rotationY: 90, opacity: 0, transformPerspective: 900 }, { rotationY: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, 0.05);""",
     cap=("Example ke taur pe", 130, 42), pl=("Samjho", "", 860, 40))

card("b16", 43.31, 47.35,
     """    .b16-n { position:absolute; font-family:Poppins, sans-serif; font-weight:800; font-size:130px; color:#fff; text-shadow:0 0 30px rgba(255,255,255,0.6); }
    .b16-q { position:absolute; font-family:Poppins, sans-serif; font-weight:800; font-size:110px; color:#ffe066; text-shadow:0 0 30px rgba(255,214,70,0.8); }""",
     """      <div id="b16-a" class="b16-n" style="left:70px; top:360px;">150</div>
      <div id="b16-b" class="b16-n" style="left:330px; top:540px;">160</div>
      <div id="b16-q1" class="b16-q" style="left:300px; top:330px;">?</div>
      <div id="b16-q2" class="b16-q" style="left:150px; top:560px;">?</div>""",
     """    tl.fromTo("#b16-q1", { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(3)" }, 0.1);
    tl.fromTo("#b16-q2", { scale: 0, rotation: 40 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(3)" }, 0.3);
    tl.fromTo("#b16-a", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.5)" }, 1.8);
    tl.fromTo("#b16-b", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.5)" }, 2.5);""",
     cap=("Cut-off <b>kitna</b> jaata hai?", 130, 46), pl=("Koi idea?", "", 860, 44))

card("b17", 47.35, 49.59,
     """    #b17-phone { position:absolute; left:185px; top:250px; width:280px; height:540px; border-radius:40px; background:#0b0b0f; border:6px solid #2a2a33; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.7); }
    #b17-feed { position:absolute; left:0; top:0; width:268px; }
    .b17-reel { width:268px; height:528px; position:relative; }
    .b17-reel .pl { position:absolute; left:104px; top:234px; width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,0.85); }
    .b17-reel .pl:after { content:""; position:absolute; left:23px; top:17px; border-left:22px solid #111; border-top:13px solid transparent; border-bottom:13px solid transparent; }
    .b17-heart { position:absolute; right:14px; top:300px; width:40px; height:40px; }""",
     """      <div id="b17-phone"><div id="b17-feed">""" + "".join(
         f'<div class="b17-reel" style="background:linear-gradient(160deg,{a},{b});"><div class="pl"></div><svg class="b17-heart" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" fill="#ff3b5c"/></svg></div>'
         for a, b in [("#ff5f6d", "#ffc371"), ("#4568dc", "#b06ab3"), ("#11998e", "#38ef7d"), ("#f7971e", "#ffd200")]) + "</div></div>",
     """    tl.fromTo("#b17-phone", { y: 700, rotation: 10 }, { y: 0, rotation: 0, duration: 0.5, ease: "power3.out" }, 0.05);
    tl.fromTo("#b17-feed", { y: 0 }, { y: -528, duration: 0.35, ease: "power2.inOut" }, 0.7);
    tl.fromTo("#b17-feed", { y: -528 }, { y: -1056, duration: 0.35, ease: "power2.inOut", immediateRender: false }, 1.4);
""",
     cap=("Ye sab <b>kahan se</b> suna?", 120, 44), pl=("REELS SE?", "Kaun sunaya?", 860, 48))

card("b18", 49.59, FOOT,
     """    #b18-bar { position:absolute; left:55px; top:420px; width:540px; height:100px; border-radius:50px; background:#fff; box-shadow:0 14px 40px rgba(0,0,0,0.6); display:flex; align-items:center; padding:0 30px; gap:18px; font-family:Poppins, sans-serif; font-weight:600; font-size:30px; color:#222; overflow:hidden; white-space:nowrap; }
    #b18-type { display:inline-block; overflow:hidden; white-space:nowrap; width:0; }
    #b18-cur { width:3px; height:40px; background:#1a73e8; }
    #b18-x { position:absolute; left:235px; top:600px; width:180px; height:180px; }""",
     """      <div id="b18-bar"><svg viewBox="0 0 24 24" width="40" height="40"><circle cx="10" cy="10" r="7" fill="none" stroke="#1a73e8" stroke-width="3"/><line x1="15" y1="15" x2="21" y2="21" stroke="#1a73e8" stroke-width="3" stroke-linecap="round"/></svg><span id="b18-type">cut-off kitna jaata hai?</span><div id="b18-cur"></div></div>
      <svg id="b18-x" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#e3342f"/><path d="M32 32 L68 68 M68 32 L32 68" stroke="#fff" stroke-width="11" stroke-linecap="round"/></svg>""",
     """    tl.fromTo("#b18-bar", { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.5, ease: "back.out(1.8)" }, 0.05);
    tl.fromTo("#b18-type", { width: 0 }, { width: 400, duration: 1.6, ease: "steps(24)" }, 0.6);
    tl.fromTo("#b18-cur", { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "steps(1)", yoyo: true, repeat: 15 }, 0);
    tl.fromTo("#b18-x", { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" }, 2.6);""",
     cap=("Khud kabhi <b>search</b><br>nahi kiya", 110, 46), pl=("KITNA JAATA HAI?", "", 860, 42))


card("b20", FOOT, END,
     """    #b20-logo { position:absolute; left:125px; top:290px; width:400px; height:400px; filter: drop-shadow(0 0 30px rgba(245,196,81,0.7)); }""",
     """      <img id="b20-logo" src="assets/logo.png" />""",
     """    tl.fromTo("#b20-logo", { rotationY: -540, scale: 0.3, transformPerspective: 1200 }, { rotationY: 0, scale: 1, duration: 1.0, ease: "power3.out" }, 0.05);""",
     cap=("Follow karein", 130, 46), pl=("Atul Sir", "Bhaskar Foundation", 820, 46))

# ------------------------------------------------------------------ root
hosts = "\n".join(
    f'''          <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" data-start="{s}" data-duration="{d}"
            data-track-index="1" data-track-kind="graphics" data-width="{PW}" data-height="{PH}" style="position:absolute; left:0; top:0; width:{PW}px; height:{PH}px; z-index:3;"></div>'''
    for cid, s, d in beats)
card_starts = [s for cid, s, d in beats if (COMP / f"{cid}.html").read_text().count("-bg\"") > 0]
sfx = "\n".join(
    f'      <audio id="sfx-{cid}" class="clip" src="assets/whoosh.wav" data-start="{max(0, round(s - 0.3, 2))}" data-duration="1.4" data-track-index="5" data-volume="0.18"></audio>'
    for cid, s, d in beats if "-bg" in (COMP / f"{cid}.html").read_text())

Z = [1.0, 1.1, 1.03, 1.14, 1.0, 1.08, 1.05, 1.12]

(ROOT / "index.html").write_text(f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #6b0a0e; }}
      #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; }}
      #bg {{ position: absolute; inset: 0;
        background:
          radial-gradient(ellipse 60% 35% at 22% 18%, rgba(255,120,120,0.35) 0%, rgba(255,120,120,0) 70%),
          repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0 2px, rgba(0,0,0,0) 2px 7px),
          radial-gradient(ellipse 85% 70% at 50% 42%, #d3161d 0%, #a80d13 45%, #5c0508 100%); }}
      .lbl {{ position: absolute; font-family: Poppins, sans-serif; font-weight: 700; color: #fff; text-shadow: 0 0 14px rgba(255,255,255,0.7); }}
      .lbl i {{ position: absolute; font-family: "Playfair Display", serif; font-style: italic; font-weight: 400; color: #fff; }}
      #lbl-before {{ left: 140px; top: 520px; font-size: 40px; }}
      #lbl-before i {{ left: 70px; top: 26px; font-size: 40px; }}
      #lbl-after {{ left: 610px; top: 300px; font-size: 52px; }}
      #lbl-after i {{ left: 80px; top: 34px; font-size: 50px; }}
      #before {{ position: absolute; left: {BX}px; top: {BY}px; width: {BW}px; height: {BH}px; border-radius: 30px; overflow: hidden; z-index: 2;
        box-shadow: 0 24px 50px rgba(0,0,0,0.55); background:#000; }}
      #before-v {{ position: absolute; left: 0; top: 0; width: {BW}px; height: {BH}px; object-fit: cover; }}
      #after {{ position: absolute; left: {PX}px; top: {PY}px; width: {PW}px; height: {PH}px; border-radius: 34px; overflow: hidden; z-index: 4;
        box-shadow: 0 30px 70px rgba(0,0,0,0.65), 0 0 0 2px rgba(255,255,255,0.12); background:#000; }}
      #cam {{ position: absolute; left: 0; top: 0; width: {PW}px; height: {PH}px; transform-origin: 50% 26%; }}
      #footage {{ position: absolute; left: 0; top: 0; width: {PW}px; height: {PH}px; object-fit: cover; }}
      #shade {{ position: absolute; inset: 0; z-index: 2; background: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%); }}
      #badge {{ position: absolute; left: 880px; top: 70px; width: 150px; height: 150px; z-index: 6; filter: drop-shadow(0 0 18px rgba(255,214,120,0.7)); }}
      #handle {{ position: absolute; left: 368px; top: 1560px; width: 650px; text-align: center; font-family: Poppins, sans-serif; font-weight: 600; font-size: 32px; color: #fff; text-shadow: 0 0 12px rgba(255,255,255,0.7); z-index: 6; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1080" data-height="1920">
      <div id="bg"></div>
      <div id="lbl-before" class="lbl">Before<i>Version</i></div>
      <div id="lbl-after" class="lbl">After<i>Version</i></div>
      <div id="before">
        <video id="before-v" class="clip" src="assets/before.mp4" data-start="0" data-duration="{FOOT}" data-track-index="2" muted playsinline></video>
      </div>
      <div id="after">
        <div id="cam">
          <video id="footage" class="clip" src="assets/footage.mp4" data-start="0" data-duration="{FOOT}" data-track-index="0" playsinline data-has-audio="true" data-volume="1"></video>
        </div>
        <div id="shade"></div>
{hosts}
      </div>
      <img id="badge" class="clip" src="assets/logo.png" data-start="0" data-duration="{END}" data-track-index="3" />
      <div id="handle" class="clip" data-start="0" data-duration="{END}" data-track-index="4">Bhaskar Foundation &nbsp;•&nbsp; Atul Sir</div>
{sfx}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      const B = {json.dumps(B)};
      const Z = {json.dumps(Z)};
      for (let i = 0; i < B.length - 1; i++) {{
        const z = Z[i % Z.length];
        tl.fromTo("#cam", {{ scale: z }}, {{ scale: z + 0.04, duration: B[i + 1] - B[i], ease: "none" }}, B[i]);
      }}
      // Gentle float on both panels, like the reference.
      tl.fromTo("#after", {{ y: 0 }}, {{ y: -10, duration: 3, ease: "sine.inOut", yoyo: true, repeat: {int(END // 3) - 1} }}, 0);
      tl.fromTo("#before", {{ y: 0 }}, {{ y: 10, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: {int(END // 3.4) - 1} }}, 0);
      tl.fromTo("#badge", {{ rotationY: 0 }}, {{ rotationY: 360, duration: 1.4, ease: "power2.inOut", repeat: {int(END // 8) - 1}, repeatDelay: 6.6 }}, 1);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
""")
print("beats:", len(beats))
