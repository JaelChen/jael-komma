"""Render tools/posters/<name>.html → assets/work/<name>-hero.webp (1920x1080) with headless Chrome."""
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

for name in sys.argv[1:] or [p.stem for p in (ROOT / "tools/posters").glob("*.html")]:
    src = ROOT / "tools/posters" / f"{name}.html"
    png = Path(tempfile.gettempdir()) / f"{name}.png"
    for size, suffix in (("1920,1080", ""), ("1080,1920", "-m")):
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={size}",
                        f"--screenshot={png}", src.resolve().as_uri()], capture_output=True)
        out = ROOT / "assets/work" / f"{name}-hero{suffix}.webp"
        Image.open(png).convert("RGB").save(out, "WEBP", quality=90, method=6)
        print(f"{out.name}: {out.stat().st_size // 1024} KB")
