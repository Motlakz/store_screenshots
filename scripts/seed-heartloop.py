"""Build the editable Heart Loop phone decks from the supplied captures."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects" / "heart-loop.json"
state = json.loads(PROJECT.read_text(encoding="utf-8"))

screens = ROOT / "public" / "screenshots" / "heart-loop" / "screens"
source = ["home", "link", "spin", "latedate", "play", "notes", "memories", "lovemap", "plant", "night-mode"]
for name in source + ["garden"]:
    assert (screens / f"{name}.png").exists(), name

def path(name):
    return f"/screenshots/heart-loop/screens/{name}.png"

copy = [
    ("THE COUPLES APP FOR EVERY DAY", "Make room for\na little *more us*.", "hero", "home"),
    ("DATE NIGHT, DECIDED", "A date idea for\n*your kind of night*.", "device-top", "latedate"),
    ("PLAY TOGETHER", "Turn any moment\ninto *play*.", "hero", "play"),
    ("LITTLE WORDS, BIG FEELINGS", "Leave a note\nthey'll *keep*.", "device-bottom", "notes"),
    ("EVERY MOMENT MATTERS", "Keep your favorite\ndays *close*.", "device-top", "memories"),
    ("YOUR STORY, MAPPED", "See where your\nstory *leads*.", "hero", "lovemap"),
    ("GROW TOGETHER", "A garden that grows\nwith *you*.", "device-bottom", "garden"),
    ("NIGHT MODE TOGETHER", "Check in when\nthe lights *go low*.", "device-top", "night-mode"),
]

def rect(x, y, w, h, z=3, rotation=0):
    return {"x": x, "y": y, "width": w, "height": h, "rotation": rotation, "zIndex": z}

def focus(which, ios):
    scale = 1320 / 1080 if ios else 1
    examples = {
        0: ("invite-link", "link", (14, 17, 73, 32), (675, 1030, 360, 240), -7),
        1: ("date-wheel", "spin", (15, 19, 72, 53), (650, 900, 410, 430), 6),
        4: ("memory", "memories", (12, 36, 79, 41), (670, 990, 380, 440), 6),
        6: ("first-seed", "plant", (4, 15, 92, 58), (660, 1030, 370, 420), -5),
    }
    if which not in examples:
        return []
    name, src, crop, box, rotation = examples[which]
    x, y, w, h = box
    if ios:
        x, y, w, h = (int(x * scale), int(y * 1.43), int(w * scale), int(h * scale))
    return [{
        "id": name,
        "source": path(src),
        "crop": dict(zip(("x", "y", "width", "height"), crop)),
        "transform": rect(x, y, w, h, 9, rotation),
        "borderRadius": 30 if not ios else 38,
        "borderWidth": 5 if not ios else 7,
        "accentColor": "#D780B2",
    }]

def make_slide(index, spec, ios):
    label, headline, layout, name = spec
    width = 1320 if ios else 1080
    if layout == "device-top":
        caption = rect(75 if ios else 55, 2260 if ios else 1530, width - (150 if ios else 110), 460 if ios else 320, 5)
        phone = rect(214 if ios else 190, 100 if ios else 100, 890 if ios else 700, 1816 if ios else 1517)
    else:
        caption = rect(75 if ios else 55, 130 if ios else 90, width - (150 if ios else 110), 425 if ios else 320, 5)
        phone = rect(210 if ios else 174, 680 if ios else 430, 900 if ios else 730, 1837 if ios else 1582)
    slide = {
        "id": f"heartloop-{'ios' if ios else 'android'}-{index+1:02}",
        "layout": layout,
        "label": {"en": label},
        "headline": {"en": headline},
        "screenshot": path(name),
        "transforms": {"caption": caption},
    }
    slide["transforms"]["device"] = phone
    slide["screenshotFit"] = "contain"
    slide["screenshotMatte"] = {
        "home": "#F8EDF2", "latedate": "#241929", "play": "#F9EBF2",
        "notes": "#F9ECF3", "memories": "#FAEAF1", "lovemap": "#E4F1D3",
        "garden": "#F8EEF1", "night-mode": "#251A2C",
    }.get(name, "#FBF3F8")
    if index in (0, 1, 4, 6):
        slide["focusElements"] = focus(index, ios)
    if index in (1, 7):
        slide["inverted"] = True
        slide["background"] = {"kind": "gradient", "stops": ["#2E1B36 0%", "#482743 58%", "#241729 100%"] if index == 1 else ["#25172F 0%", "#3B2244 60%", "#1D162B 100%"], "angle": 160}
    if not ios:
        slide["frame"] = {"style": "3d", "color": "graphite", "rotateX": 8 if index in (0, 2, 6) else 5, "rotateY": -17 if index % 2 == 0 else 16, "depth": 1550, "thickness": 34}
    return slide

state["themeId"] = "heartloop-bloom"
state["device"] = "android"
state["connectedCanvas"] = True
state["themes"] = [{
    "id": "heartloop-bloom", "name": "Heart Loop Bloom",
    "bg": "#FBF3F8", "bgAlt": "#25172F", "fg": "#30213B", "fgAlt": "#FFF8FD", "accent": "#AF427D", "muted": "#866A87",
    "background": {"kind": "solids", "colors": ["#FBF2F9", "#2E1B36", "#FFF4F8", "#F5EAF4", "#FCF0FA", "#F1EAF9", "#FBF2F5", "#2B1A35"]},
    "backgroundAlt": {"kind": "solid", "color": "#2B1A35"},
    "headline": {"family": "var(--font-newsreader), Newsreader, Georgia, serif", "weight": 700, "scale": 1.03, "lineHeight": 0.96, "letterSpacing": -0.032},
    "label": {"family": "var(--font-dm-sans), 'DM Sans', sans-serif", "weight": 750, "scale": 0.84, "letterSpacing": 0.14, "transform": "uppercase"},
    "emphasis": {"family": "var(--font-newsreader), Newsreader, Georgia, serif", "color": "#B24580", "weight": 700, "scale": 1.0},
    "device": {"bezel": "#36263E", "bezelStroke": "#C996B5", "bezelStrokeWidth": 2, "shadow": "0 34px 75px rgba(74,27,77,.25)"},
    "decor": {"heartloop": True, "grain": 0.014},
}]
state["slidesByDevice"]["android"] = [make_slide(i, spec, False) for i, spec in enumerate(copy)]
state["slidesByDevice"]["iphone"] = [make_slide(i, spec, True) for i, spec in enumerate(copy)]
state["slidesByDevice"]["feature-graphic"] = [{
    "id": "heartloop-feature-graphic", "layout": "feature-graphic",
    "label": {"en": "DATES · NOTES · MEMORIES"},
    "headline": {"en": "A little more us, every day."},
    "screenshot": path("home"), "screenshotSecondary": path("plant"), "screenshotTertiary": path("memories"),
}]
PROJECT.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
