from pathlib import Path
from urllib.request import Request,urlopen
import gzip,base64
BASE="https://lucky-profiterole-d3faaf.netlify.app/"
FILES=['index.html', 'style.css', 'manifest.webmanifest', 'service-worker.js', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'assets/brick_wall.png', 'assets/custom_bg.png', 'assets/front_gc.png', 'assets/items.json', 'assets/map.png', 'assets/mask_full.png', 'assets/mask_left.png', 'assets/mask_right.png', 'assets/menu.png', 'assets/mission_wall_clean.png', 'assets/monkey_mask.png', 'assets/monkey_mask_clean.png', 'assets/monkey_sticker.png', 'assets/paint_ref.png', 'assets/painter_idle.png', 'assets/painter_spray.png', 'assets/painter_spray_clean.png', 'assets/player/idle_back.png', 'assets/player/idle_front.png', 'assets/player/idle_left.png', 'assets/player/idle_right.png', 'assets/player/walk_back_1.png', 'assets/player/walk_back_2.png', 'assets/player/walk_back_3.png', 'assets/player/walk_back_4.png', 'assets/player/walk_front_1.png', 'assets/player/walk_front_2.png', 'assets/player/walk_front_3.png', 'assets/player/walk_front_4.png', 'assets/player/walk_left_1.png', 'assets/player/walk_left_2.png', 'assets/player/walk_left_3.png', 'assets/player/walk_left_4.png', 'assets/player/walk_right_1.png', 'assets/player/walk_right_2.png', 'assets/player/walk_right_3.png', 'assets/player/walk_right_4.png']
out=Path("dist");out.mkdir(exist_ok=True)
for rel in FILES:
 p=out/rel;p.parent.mkdir(parents=True,exist_ok=True)
 with urlopen(Request(BASE+rel,headers={"User-Agent":"Mozilla/5.0"}),timeout=90) as r:p.write_bytes(r.read())
payload="".join((Path("payload")/f"part-{i:02}.txt").read_text().strip() for i in range(1,5))
(out/"game.js").write_bytes(gzip.decompress(base64.b64decode(payload)))
sw=out/"service-worker.js"
if sw.exists():
 t=sw.read_text();t=t.replace("under-pressure-v10-public-1","under-pressure-v11-phase2-2");sw.write_text(t)
(out/"_redirects").write_text("/* /index.html 200\n")
(out/"_headers").write_text("/*\n  X-Frame-Options: SAMEORIGIN\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: geolocation=(), camera=(), microphone=()\n")
print("Under Pressure V11 Phase 2 build concluído")
