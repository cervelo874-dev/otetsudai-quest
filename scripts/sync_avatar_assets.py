"""
sync_avatar_assets.py
public/assets/avatar 以下の画像ファイルを自動スキャンし、
src/avatar.ts の IMAGE_ASSETS レジストリを自動更新するスクリプト。
また、未生成のアイテムとおすすめプロンプトを出力します。
"""
import os
import re
import sys
from pathlib import Path

# Windowsのcp932エンコードエラー対策
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
AVATAR_TS_PATH = BASE_DIR / "src" / "avatar.ts"
ASSETS_DIR = BASE_DIR / "public" / "assets" / "avatar"

CATEGORIES = ["pet", "weapon", "accessory", "bg"]

# 全アイテムの定義とAIプロンプト例
ALL_ITEMS = {
    "weapon": {
        "brave_sword": "ゆうしゃのブレイブソード (legendary hero silver sword with golden hilt, blue sapphire jewel on guard, diagonal game icon orientation, chibi anime RPG style, isolated on pure white background, high resolution, soft shading)",
        "giant_candy": "きょだいペロペロキャンディ (giant colorful spiral rainbow swirl lollipop on a white stick, glossy candy shine, cute chibi anime game item style, isolated on pure white background, high resolution, soft shading)",
        "laser_blade": "サイバーレーザーブレード (sci-fi cyber glowing cyan-blue energy beam laser sword saber with metallic hilt and light glow effects, chibi anime game icon style, isolated on pure white background, high resolution)",
        "flame_sword": "ほのおのレジェンドブレード (ultra rare epic flame blade sword engulfed in bright blazing red and orange magical fire flames, dark obsidian hilt with red ruby, chibi anime RPG style, isolated on pure white background)",
        "magic_wand": "スターマジックステッキ (cute magical girl star wand with golden glowing star tip, pink satin ribbon bow, pink pastel handle with pearls, chibi anime RPG style, isolated on pure white background, high resolution, soft shading)"
    },
    "accessory": {
        "ribbon": "ピンクビッグリボン (cute big pink ribbon for hair, chibi anime style, front view, isolated on pure white background, high resolution)",
        "crown": "ゴールドクラウン (cute royal gold crown with red ruby and blue sapphire gems, velvety red cushion, chibi anime RPG style, front view, isolated on pure white background, high resolution, soft shading)",
        "wizard": "まほうつかいのぼうし (cute dark purple pointed wizard hat with wide brim, gold buckled band and shiny stars, chibi anime RPG style, front view, isolated on pure white background)",
        "sunglasses": "クールサングラス (stylish cool black sunglasses, chibi anime RPG accessory style, front view, isolated on pure white background)",
        "star_pin": "キラキラスターピン (cute glowing golden star hair hairpin, chibi anime style, isolated on pure white background)",
        "knight_helmet": "はねかざりナイトカブト (cute chibi silver knight helmet with red feather plume, front view, isolated on pure white background)",
        "tiara": "プリンセスティアラ (delicate sparkling silver and crystal princess tiara with blue gems, front view, isolated on pure white background)",
        "dino_hood": "きょうりゅうフード (cute green dinosaur hoodie headwear with orange soft spikes, cute friendly face, front view, isolated on pure white background)",
        "ninja_band": "にんじゃのハチマキ (cool navy ninja forehead protector headband with metallic leaf emblem, chibi anime RPG style, front view, isolated on pure white background)",
        "cat_headphone": "ネコみみヘッドホン (cute pink gaming headphones with glowing cat ears, front view, isolated on pure white background)",
        "angel_ring": "ひかるてんしのリング (magical glowing golden floating angel halo ring with sparkling light particles, chibi anime RPG style, front view, isolated on pure white background)"
    },
    "pet": {
        "shiba": "ころころしばいぬ (cute chubby shiba inu puppy sitting happily, chibi anime style)",
        "dragon": "ちびドラゴン (cute baby green dragon sitting, friendly wings, cute horns, chibi anime RPG style)",
        "penguin": "マフラーペンギン (cute baby penguin wearing a small warm blue knitted winter scarf, chibi anime RPG style)",
        "unicorn": "ミニユニコーン (cute little baby magical unicorn with rainbow pastel mane, chibi anime RPG style)",
        "slime": "ぷるぷるスライム (cute bouncy round light blue smiling gel slime with water bubbles, chibi anime RPG style)",
        "anglerfish": "ピカピカアンコウ (cute round yellow and orange fantasy anglerfish with glowing antenna light bulb, chibi anime RPG style)",
        "mini_dragon": "おうごんのミニドラゴン (cute baby golden dragon with gleaming gold scales, shiny cute wings, chibi anime RPG style)",
        "flying_unicorn": "はばたくペガサス (cute magical winged pegasus unicorn with elegant feathered white wings, chibi anime RPG style)"
    },
    "bg": {
        "sky": "あおぞらとくも (beautiful anime fantasy blue sky with fluffy white cumulus clouds and gentle sunbeams, peaceful daylight, vertical 5:6 wallpaper style)",
        "meadow": "おはなののはら (lush green rolling grassy meadow with colorful blooming wildflowers under warm sunlight, cute anime landscape, vertical 5:6 wallpaper style)",
        "sunset": "ゆうやけのまち (gorgeous sunset city skyline with glowing orange and pink twilight sky, warm silhouettes, anime aesthetic, vertical 5:6 wallpaper style)",
        "kirakira": "パステルキラキラ (pastel dreamy fantasy background with twinkling stars, soft bokeh light spheres, pink and lavender gradient, vertical 5:6 wallpaper style)",
        "space": "コスモスペース (deep space galaxy with glowing nebula clouds, cosmic dust, distant shining stars and a golden planet ring, vertical 5:6 wallpaper style)",
        "rainbow": "にじのスカイロード (vibrant colorful rainbow arch spanning across a sky road with fluffy clouds, whimsical fairytale, vertical 5:6 wallpaper style)",
        "candy_land": "スイートおかしのくに (magical whimsical candyland with giant lollipops, cotton candy hills, candy canes, pastel colors, vertical 5:6 wallpaper style)",
        "ocean_temple": "神秘のかいていしんでん (mystical underwater ancient sunken crystal temple with glowing sun rays piercing through deep blue sea water, vertical 5:6 wallpaper style)",
        "space_station": "サイバーステーション (futuristic high-tech sci-fi orbital space station window looking out into the blue planet Earth and stars, vertical 5:6 wallpaper style)",
        "crystal_castle": "まおうのクリスタルじょう (majestic fantasy dark crystal castle surrounded by magical purple aurora and glowing crystals, epic RPG scenery, vertical 5:6 wallpaper style)",
        "rainbow_stage": "にじのキラキラステージ (spectacular idol live concert stage with rainbow spotlights, sparkling laser beams, shining stars, vertical 5:6 wallpaper style)"
    }
}

def sync_assets():
    found_assets = {}
    missing_assets = {}

    for cat in CATEGORIES:
        found_assets[cat] = []
        missing_assets[cat] = []
        cat_dir = ASSETS_DIR / cat
        cat_dir.mkdir(parents=True, exist_ok=True)

        existing_files = {f.stem for f in cat_dir.glob("*.png")}
        target_items = ALL_ITEMS.get(cat, {})

        for item_id in target_items:
            if item_id in existing_files:
                found_assets[cat].append(item_id)
            else:
                missing_assets[cat].append(item_id)

    print("=== [アセット検出状況] ===")
    for cat in CATEGORIES:
        print(f"[{cat}] 完了: {len(found_assets[cat])}件 / 未完了: {len(missing_assets[cat])}件")
        if found_assets[cat]:
            print(f"  ✓ 登録済み: {', '.join(found_assets[cat])}")

    # src/avatar.ts の IMAGE_ASSETS を更新
    if not AVATAR_TS_PATH.exists():
        print(f"Error: {AVATAR_TS_PATH} not found.")
        return

    content = AVATAR_TS_PATH.read_text(encoding="utf-8")

    # IMAGE_ASSETS 定義ブロックの置換
    new_image_assets_code = "export const IMAGE_ASSETS = {\n"
    for cat in CATEGORIES:
        items_str = ", ".join([f"'{x}'" for x in sorted(found_assets[cat])])
        new_image_assets_code += f"  {cat}: new Set<string>([{items_str}]),\n"
    new_image_assets_code += "};"

    pattern = r"export const IMAGE_ASSETS = \{[\s\S]*?\};"
    if re.search(pattern, content):
        updated_content = re.sub(pattern, new_image_assets_code, content)
        AVATAR_TS_PATH.write_text(updated_content, encoding="utf-8")
        print("\n✅ src/avatar.ts の IMAGE_ASSETS を最新の状態に同期しました！")
    else:
        print("\n⚠️ IMAGE_ASSETS のパターンが見つかりませんでした。")

    # 未生成アイテム一覧とプロンプト出力
    total_missing = sum(len(v) for v in missing_assets.values())
    if total_missing > 0:
        print(f"\n=== [未完了アイテム ({total_missing}件) の生成プロンプト一覧] ===")
        for cat, items in missing_assets.items():
            if items:
                print(f"\n--- カテゴリ: {cat} ---")
                for itm in items:
                    prompt = ALL_ITEMS[cat].get(itm, itm)
                    print(f"ID: {itm}")
                    print(f"ファイル保存先: public/assets/avatar/{cat}/{itm}.png")
                    print(f"プロンプト: {prompt}\n")

if __name__ == "__main__":
    sync_assets()
