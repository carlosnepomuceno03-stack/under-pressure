from pathlib import Path
from urllib.request import Request, urlopen

BASE = "https://lucky-profiterole-d3faaf.netlify.app/"
FILES = [
"index.html","game.js","style.css","manifest.webmanifest","service-worker.js",
"apple-touch-icon.png","icon-192.png","icon-512.png",
"assets/brick_wall.png","assets/custom_bg.png","assets/front_gc.png","assets/items.json",
"assets/map.png","assets/mask_full.png","assets/mask_left.png","assets/mask_right.png",
"assets/menu.png","assets/mission_wall_clean.png","assets/monkey_mask.png",
"assets/monkey_mask_clean.png","assets/monkey_sticker.png","assets/paint_ref.png",
"assets/painter_idle.png","assets/painter_spray.png","assets/painter_spray_clean.png",
"assets/player/idle_back.png","assets/player/idle_front.png","assets/player/idle_left.png","assets/player/idle_right.png",
"assets/player/walk_back_1.png","assets/player/walk_back_2.png","assets/player/walk_back_3.png","assets/player/walk_back_4.png",
"assets/player/walk_front_1.png","assets/player/walk_front_2.png","assets/player/walk_front_3.png","assets/player/walk_front_4.png",
"assets/player/walk_left_1.png","assets/player/walk_left_2.png","assets/player/walk_left_3.png","assets/player/walk_left_4.png",
"assets/player/walk_right_1.png","assets/player/walk_right_2.png","assets/player/walk_right_3.png","assets/player/walk_right_4.png",
"assets/items/acc_chain.png","assets/items/acc_chain_thumb.png","assets/items/acc_glasses.png","assets/items/acc_glasses_thumb.png",
"assets/items/acc_headphones.png","assets/items/acc_headphones_thumb.png","assets/items/acc_mask.png","assets/items/acc_mask_thumb.png",
"assets/items/bag_crown.png","assets/items/bag_crown_thumb.png","assets/items/bag_graffiti.png","assets/items/bag_graffiti_thumb.png",
"assets/items/bag_street.png","assets/items/bag_street_thumb.png","assets/items/hair_braids.png","assets/items/hair_braids_thumb.png",
"assets/items/hair_curls.png","assets/items/hair_curls_thumb.png","assets/items/hair_dreads.png","assets/items/hair_dreads_thumb.png",
"assets/items/hair_puff.png","assets/items/hair_puff_thumb.png","assets/items/hat_crown.png","assets/items/hat_crown_thumb.png",
"assets/items/hat_nyc.png","assets/items/hat_nyc_thumb.png","assets/items/hat_rebel.png","assets/items/hat_rebel_thumb.png",
"assets/items/hat_white.png","assets/items/hat_white_thumb.png","assets/items/pants_cargo.png","assets/items/pants_cargo_thumb.png",
"assets/items/pants_jeans.png","assets/items/pants_jeans_thumb.png","assets/items/pants_tactical.png","assets/items/pants_tactical_thumb.png",
"assets/items/shoes_classic.png","assets/items/shoes_classic_thumb.png","assets/items/shoes_hightop.png","assets/items/shoes_hightop_thumb.png",
"assets/items/shoes_runner.png","assets/items/shoes_runner_thumb.png","assets/items/shoes_skate.png","assets/items/shoes_skate_thumb.png",
"assets/items/spray_blue.png","assets/items/spray_blue_thumb.png","assets/items/spray_pink.png","assets/items/spray_pink_thumb.png",
"assets/items/spray_tag.png","assets/items/spray_tag_thumb.png","assets/items/spray_yellow.png","assets/items/spray_yellow_thumb.png",
"assets/items/top_hoodie.png","assets/items/top_hoodie_thumb.png","assets/items/top_jacket.png","assets/items/top_jacket_thumb.png",
"assets/items/top_oversize.png","assets/items/top_oversize_thumb.png","assets/items/top_tee.png","assets/items/top_tee_thumb.png"
]

outroot = Path("dist")
outroot.mkdir(exist_ok=True)
for rel in FILES:
    out = outroot / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    req = Request(BASE + rel, headers={"User-Agent":"Mozilla/5.0"})
    with urlopen(req, timeout=90) as r:
        out.write_bytes(r.read())

(outroot / "_redirects").write_text("/* /index.html 200\n", encoding="utf-8")
(outroot / "_headers").write_text("""/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=()
""", encoding="utf-8")
print("Under Pressure bootstrap concluído")
