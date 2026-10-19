/**
* 初期プリセット素材（SVG）
*
* すべて 512x512 の共通座標系で描かれています。
* 3頭身ベース素体の主な基準点:
*   頭の中心 (256,145) / 目のライン y=161 / 右手(画面右) (327,334)
*   左手(画面左) (185,334) / 足元 y≒468 / ペット位置 (108,430)
*/
import type { AvatarCategory, AvatarPart, EquippedParts } from '../types';

// ---------------------------------------------------------------------------
// SVGヘルパー
// ---------------------------------------------------------------------------
const OL = '#5a3b2e';

const svg = (body: string, defs = '') =>
`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${
defs ? `<defs>${defs}</defs>` : ''
}${body}</svg>`;

export const svgToDataUrl = (markup: string) =>
`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

/** 中心線 x=256 を軸に左右対称に複製 */
const mirror = (frag: string) => `${frag}<g transform="matrix(-1 0 0 1 512 0)">${frag}</g>`;

/** 5角の星 polygon points */
const star = (cx: number, cy: number, R: number, r: number) =>
Array.from({ length: 10 }, (_, i) => {
const rad = i % 2 === 0 ? R : r;
const a = -Math.PI / 2 + (i * Math.PI) / 5;
return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
}).join(' ');

/** 4方向のキラッ */
const sparkle = (cx: number, cy: number, s: number, fill = '#fff') =>
`<path d="M${cx} ${cy - s} Q${cx} ${cy} ${cx + s} ${cy} Q${cx} ${cy} ${cx} ${cy + s} Q${cx} ${cy} ${cx - s} ${cy} Q${cx} ${cy} ${cx} ${cy - s} Z" fill="${fill}"/>`;

// ---------------------------------------------------------------------------
// 素体（高品質イラスト素体 PNG）
// ---------------------------------------------------------------------------
export const DEFAULT_BODY_ILLUST_SRC = '/assets/avatar/body/body_default.png';
export const DEFAULT_FACE_ILLUST_SRC = '/assets/avatar/face/face_default.png';


// ---------------------------------------------------------------------------
// 髪
// ---------------------------------------------------------------------------
const BROWN = { fill: '#8a5a3b', line: '#4a2e1e', hl: '#c08a5e' };
const PINK = { fill: '#f59cc4', line: '#b2507f', hl: '#ffd3e6' };

const hairBackShort = svg(`
<path d="M164 160 Q156 58 256 50 Q356 58 348 160 L352 214 Q336 230 316 218 L196 218 Q176 230 160 214 Z"
fill="${BROWN.fill}" stroke="${BROWN.line}" stroke-width="4" stroke-linejoin="round"/>
`);

const hairBackLong = svg(`
<path d="M162 150 Q150 46 256 42 Q362 46 350 150 Q368 250 364 336 Q346 352 326 340 Q314 352 300 338 L212 338 Q198 352 186 340 Q166 352 148 336 Q144 250 162 150 Z"
fill="${PINK.fill}" stroke="${PINK.line}" stroke-width="4" stroke-linejoin="round"/>
${mirror(`<path d="M172 236 Q166 290 174 326" fill="none" stroke="${PINK.line}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`)}
`);

const hairFrontShort = svg(`
<path d="M256 58 Q262 32 284 28 Q270 42 268 60 Z" fill="${BROWN.fill}" stroke="${BROWN.line}" stroke-width="4" stroke-linejoin="round"/>
<path d="M166 190 Q150 64 256 56 Q362 64 346 190 Q338 168 334 142 L320 150 L310 116 L292 138 L278 106 L258 134 L238 106 L222 138 L204 116 L192 150 L178 142 Q174 168 166 190 Z"
fill="${BROWN.fill}" stroke="${BROWN.line}" stroke-width="4" stroke-linejoin="round"/>
<path d="M196 86 Q226 70 258 68" fill="none" stroke="${BROWN.hl}" stroke-width="7" stroke-linecap="round"/>
<path d="M280 72 Q300 76 314 88" fill="none" stroke="${BROWN.hl}" stroke-width="5" stroke-linecap="round"/>
`);

const hairFrontLong = svg(`
<path d="M160 214 Q144 60 256 52 Q368 60 352 214 Q344 222 336 212 Q338 160 326 128 Q296 138 256 136 Q216 138 186 128 Q174 160 176 212 Q168 222 160 214 Z"
fill="${PINK.fill}" stroke="${PINK.line}" stroke-width="4" stroke-linejoin="round"/>
<path d="M220 136 L226 110 M256 136 L256 106 M292 136 L286 110" stroke="${PINK.line}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
<path d="M194 84 Q226 66 262 64" fill="none" stroke="${PINK.hl}" stroke-width="8" stroke-linecap="round"/>
${mirror(`<path d="M168 150 Q164 180 168 206" fill="none" stroke="${PINK.hl}" stroke-width="4" stroke-linecap="round"/>`)}
`);

// ---------------------------------------------------------------------------
// トップス
// ---------------------------------------------------------------------------
const topsTshirt = svg(`
<path d="M218 233 Q256 245 294 233 L324 262 L307 284 L296 274 L294 340 Q256 350 218 340 L216 274 L205 284 L188 262 Z"
fill="#5aaae8" stroke="#2c5d8a" stroke-width="4" stroke-linejoin="round"/>
<path d="M238 236 Q256 252 274 236" fill="none" stroke="#2c5d8a" stroke-width="4" stroke-linecap="round"/>
<polygon points="${star(256, 294, 15, 6.5)}" fill="#ffd84a" stroke="#c99a10" stroke-width="2.5" stroke-linejoin="round"/>
`);

const topsDress = svg(`
<path d="M220 233 Q256 245 292 233 L318 258 L303 278 L294 270 L292 302 Q302 344 334 402 Q256 422 178 402 Q210 344 220 302 L218 270 L209 278 L194 258 Z"
fill="#c38ef0" stroke="#6a3f99" stroke-width="4" stroke-linejoin="round"/>
<path d="M184 398 Q256 416 328 398" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 11"/>
<path d="M240 236 Q256 248 272 236" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
<path d="M218 302 Q256 312 294 302" fill="none" stroke="#ff7fb0" stroke-width="9" stroke-linecap="round"/>
<path d="M256 306 L238 295 L238 318 Z M256 306 L274 295 L274 318 Z" fill="#ff7fb0" stroke="#c0457a" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="256" cy="306" r="5" fill="#ff5c9a" stroke="#c0457a" stroke-width="2"/>
`);

// ---------------------------------------------------------------------------
// ボトムス
// ---------------------------------------------------------------------------
const bottomsShorts = svg(`
<path d="M218 324 Q256 334 294 324 L299 384 L262 388 L256 360 L250 388 L213 384 Z"
fill="#3d5a96" stroke="#1d2c4d" stroke-width="4" stroke-linejoin="round"/>
<path d="M219 332 Q256 342 293 332" fill="none" stroke="#2a3f6e" stroke-width="3"/>
`);

const bottomsSkirt = svg(`
<path d="M218 324 Q256 334 294 324 L320 394 Q256 408 192 394 Z"
fill="#ef6176" stroke="#8a2a3a" stroke-width="4" stroke-linejoin="round"/>
<path d="M236 334 L226 400 M256 336 L256 404 M276 334 L286 400" stroke="#b83a50" stroke-width="3" stroke-linecap="round"/>
<path d="M219 331 Q256 341 293 331" fill="none" stroke="#8a2a3a" stroke-width="3"/>
`);

// ---------------------------------------------------------------------------
// 靴
// ---------------------------------------------------------------------------
const shoesSneakers = svg(
mirror(`
<path d="M215 470 Q215 450 232 450 L242 450 Q257 456 257 470 Q257 482 236 482 Q215 482 215 470 Z"
fill="#ff5d5d" stroke="#8a2020" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M217 474 L255 474" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
<path d="M229 458 L244 458" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`),
);

const shoesBoots = svg(
mirror(`
<path d="M222 418 L253 418 L253 460 Q259 464 258 474 Q257 483 236 483 Q215 483 216 471 L222 460 Z"
fill="#9a6232" stroke="#4e2e12" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="219" y="412" width="37" height="15" rx="6" fill="#f3e2c4" stroke="#4e2e12" stroke-width="3"/>`),
);

// ---------------------------------------------------------------------------
// 帽子・メガネ
// ---------------------------------------------------------------------------
const hatCrown = svg(`
<path d="M206 86 L212 40 L234 64 L256 28 L278 64 L300 40 L306 86 Q256 98 206 86 Z"
fill="#ffd24a" stroke="#a87800" stroke-width="4" stroke-linejoin="round"/>
<path d="M210 78 Q256 90 302 78" fill="none" stroke="#a87800" stroke-width="3"/>
<circle cx="256" cy="72" r="7" fill="#ff5c8a" stroke="#a8204a" stroke-width="2.5"/>
${mirror('<circle cx="230" cy="78" r="5" fill="#4fc3f7" stroke="#1f6f99" stroke-width="2"/><circle cx="212" cy="40" r="5" fill="#fff3a6" stroke="#a87800" stroke-width="2.5"/>')}
<circle cx="256" cy="28" r="6" fill="#fff3a6" stroke="#a87800" stroke-width="2.5"/>
`);

const glassesRound = svg(`
${mirror(`
<rect x="198" y="140" width="50" height="42" rx="18" fill="#bfe6ff" fill-opacity="0.25" stroke="#d6455a" stroke-width="5"/>
<path d="M198 154 L172 150" stroke="#d6455a" stroke-width="4" stroke-linecap="round"/>
<path d="M208 150 L216 146" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`)}
<path d="M248 157 Q256 150 264 157" fill="none" stroke="#d6455a" stroke-width="4" stroke-linecap="round"/>
`);

// ---------------------------------------------------------------------------
// 持ち物（右手 (327,334) に合わせて配置）
// ---------------------------------------------------------------------------
const itemSword = svg(`
<g transform="rotate(18 327 334)" stroke-linejoin="round">
<path d="M319 318 L319 196 L327 174 L335 196 L335 318 Z" fill="#e6eef7" stroke="#4a5a6a" stroke-width="4"/>
<path d="M327 190 L327 312" stroke="#b8c7d8" stroke-width="3" stroke-linecap="round"/>
<rect x="303" y="314" width="48" height="11" rx="5.5" fill="#f2c443" stroke="#7a5a10" stroke-width="3.5"/>
<rect x="321" y="325" width="12" height="28" rx="3" fill="#7a4a2a" stroke="#3e2412" stroke-width="3"/>
<circle cx="327" cy="358" r="7" fill="#f2c443" stroke="#7a5a10" stroke-width="3"/>
<circle cx="327" cy="319.5" r="4" fill="#4fc3f7"/>
</g>
${sparkle(352, 186, 10, '#fff7c2')}
`);

const itemWand = svg(`
<g transform="rotate(-12 327 334)" stroke-linejoin="round">
<path d="M322 242 Q300 252 304 272 M332 242 Q354 252 350 272" fill="none" stroke="#ff7fb0" stroke-width="4" stroke-linecap="round"/>
<rect x="322" y="236" width="10" height="124" rx="5" fill="#fff" stroke="#b2507f" stroke-width="3.5"/>
<path d="M322 262 L332 254 M322 284 L332 276 M322 306 L332 298" stroke="#ff9cc8" stroke-width="3" stroke-linecap="round"/>
<polygon points="${star(327, 212, 30, 13)}" fill="#ffe066" stroke="#d19a00" stroke-width="4"/>
<circle cx="321" cy="207" r="5" fill="#fff" opacity="0.85"/>
</g>
${sparkle(282, 196, 9, '#ffe066')}${sparkle(296, 166, 6, '#ff9cc8')}${sparkle(352, 168, 7, '#9fd8ff')}
`);

// ---------------------------------------------------------------------------
// ペット（足元・画面左）
// ---------------------------------------------------------------------------
const petDragon = svg(`
<g stroke="#2f6b2a" stroke-width="3.5" stroke-linejoin="round">
<path d="M86 424 Q48 394 56 368 Q72 384 94 400 Z" fill="#a8e3a0"/>
<path d="M134 424 Q172 394 164 368 Q148 384 126 400 Z" fill="#a8e3a0"/>
<path d="M80 452 Q46 464 38 440 Q56 448 78 438 Z" fill="#7bd36b"/>
<ellipse cx="110" cy="442" rx="34" ry="30" fill="#7bd36b"/>
<ellipse cx="110" cy="450" rx="19" ry="17" fill="#f6f1b8"/>
<ellipse cx="94" cy="470" rx="10" ry="6" fill="#7bd36b"/>
<ellipse cx="126" cy="470" rx="10" ry="6" fill="#7bd36b"/>
<path d="M92 378 L86 354 L104 370 Z" fill="#ffe08a"/>
<path d="M128 378 L134 354 L116 370 Z" fill="#ffe08a"/>
<circle cx="110" cy="398" r="28" fill="#7bd36b"/>
</g>
<circle cx="99" cy="396" r="5" fill="#2a2a2a"/><circle cx="121" cy="396" r="5" fill="#2a2a2a"/>
<circle cx="100.5" cy="394" r="1.8" fill="#fff"/><circle cx="122.5" cy="394" r="1.8" fill="#fff"/>
<ellipse cx="92" cy="407" rx="5" ry="3" fill="#ff9aa8" opacity="0.7"/><ellipse cx="128" cy="407" rx="5" ry="3" fill="#ff9aa8" opacity="0.7"/>
<path d="M104 410 Q110 415 116 410" fill="none" stroke="#2f6b2a" stroke-width="2.5" stroke-linecap="round"/>
`);

const petDog = svg(`
<g stroke="#7a4518" stroke-width="3.5" stroke-linejoin="round">
<path d="M136 438 Q172 430 162 402 Q150 394 146 410 Q154 420 134 426 Z" fill="#e8a25c"/>
<ellipse cx="108" cy="446" rx="34" ry="26" fill="#e8a25c"/>
<ellipse cx="104" cy="452" rx="16" ry="16" fill="#fff6ea"/>
<ellipse cx="90" cy="470" rx="10" ry="6" fill="#fff6ea"/>
<ellipse cx="122" cy="470" rx="10" ry="6" fill="#fff6ea"/>
<path d="M80 392 L84 358 L104 380 Z" fill="#e8a25c"/>
<path d="M128 392 L124 358 L104 380 Z" fill="#e8a25c"/>
<circle cx="104" cy="402" r="28" fill="#e8a25c"/>
<path d="M84 410 Q104 438 124 410 Q118 398 104 404 Q90 398 84 410 Z" fill="#fff6ea"/>
</g>
<path d="M86 384 L88 368 L97 380 Z M122 384 L120 368 L111 380 Z" fill="#ffb3a7"/>
<circle cx="94" cy="398" r="4.5" fill="#2a2a2a"/><circle cx="114" cy="398" r="4.5" fill="#2a2a2a"/>
<circle cx="95.5" cy="396.5" r="1.6" fill="#fff"/><circle cx="115.5" cy="396.5" r="1.6" fill="#fff"/>
<ellipse cx="104" cy="410" rx="5" ry="4" fill="#3a2a1a"/>
<path d="M98 416 Q104 421 110 416" fill="none" stroke="#3a2a1a" stroke-width="2.5" stroke-linecap="round"/>
<ellipse cx="84" cy="410" rx="5" ry="3" fill="#ff9aa8" opacity="0.6"/><ellipse cx="124" cy="410" rx="5" ry="3" fill="#ff9aa8" opacity="0.6"/>
`);

// ---------------------------------------------------------------------------
// 背景
// ---------------------------------------------------------------------------
const bgSky = svg(
`
<rect width="512" height="512" fill="url(#sky)"/>
<circle cx="430" cy="82" r="40" fill="#fff3a6"/>
<circle cx="430" cy="82" r="56" fill="#fff3a6" opacity="0.35"/>
<g fill="#fff">
<ellipse cx="92" cy="92" rx="48" ry="20"/><ellipse cx="122" cy="78" rx="30" ry="22"/><ellipse cx="70" cy="82" rx="22" ry="16"/>
<ellipse cx="320" cy="150" rx="42" ry="16"/><ellipse cx="346" cy="138" rx="24" ry="18"/>
</g>
<path d="M0 410 Q128 380 256 400 Q384 420 512 392 L512 512 L0 512 Z" fill="#a6dd84"/>
<path d="M0 446 Q140 424 256 440 Q380 456 512 434 L512 512 L0 512 Z" fill="#8fd06c"/>
<g>
<circle cx="420" cy="452" r="6" fill="#ff8fb1"/><circle cx="452" cy="470" r="5" fill="#ffe066"/>
<circle cx="380" cy="480" r="5" fill="#fff"/><circle cx="40" cy="486" r="5" fill="#ffe066"/>
<circle cx="190" cy="496" r="4" fill="#ff8fb1"/>
</g>`,
`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset="0.7" stop-color="#e6f6ff"/><stop offset="1" stop-color="#fff6dc"/></linearGradient>`,
);

const NIGHT_STARS: [number, number, number][] = [
[40, 50, 2], [96, 120, 1.6], [150, 40, 2.2], [210, 90, 1.4], [270, 30, 1.8], [330, 70, 1.5],
[70, 210, 1.5], [460, 200, 2], [400, 250, 1.4], [30, 300, 1.8], [480, 330, 1.5], [130, 270, 1.2],
[360, 180, 1.2], [200, 180, 1], [300, 130, 1.2], [490, 40, 1.6],
];

const bgNight = svg(
`
<rect width="512" height="512" fill="url(#night)"/>
${NIGHT_STARS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.9"/>`).join('')}
${sparkle(110, 70, 9, '#fff7c2')}${sparkle(440, 150, 7, '#fff7c2')}
<circle cx="412" cy="88" r="36" fill="#fff4c2"/>
<circle cx="428" cy="76" r="32" fill="#2b3470"/>
<path d="M0 420 Q128 392 256 410 Q384 428 512 400 L512 512 L0 512 Z" fill="#35576b"/>
<path d="M0 452 Q140 432 256 446 Q380 460 512 440 L512 512 L0 512 Z" fill="#2a4757"/>`,
`<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2156"/><stop offset="1" stop-color="#5b3f8a"/></linearGradient>`,
);

// ---------------------------------------------------------------------------
// エフェクト
// ---------------------------------------------------------------------------
const auraRays = Array.from({ length: 16 }, (_, i) => {
const a = (i / 16) * Math.PI * 2;
const R = 270;
const p = (ang: number) => `${(256 + R * Math.cos(ang)).toFixed(1)},${(270 + R * Math.sin(ang)).toFixed(1)}`;
return `<polygon points="256,270 ${p(a - 0.07)} ${p(a + 0.07)}"/>`;
}).join('');

const fxAura = svg(
`
<g fill="#fff3a0" opacity="0.35">${auraRays}</g>
<circle cx="256" cy="270" r="230" fill="url(#aura)"/>`,
`<radialGradient id="aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff7b0" stop-opacity="0.95"/><stop offset="0.55" stop-color="#ffd36b" stop-opacity="0.45"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>`,
);

const fxMagicCircle = svg(`
<g fill="none" stroke="#7fd3ff" stroke-linecap="round">
<ellipse cx="256" cy="470" rx="160" ry="34" stroke-width="5" opacity="0.9"/>
<ellipse cx="256" cy="470" rx="132" ry="26" stroke-width="3" stroke-dasharray="8 8" opacity="0.8"/>
<ellipse cx="256" cy="470" rx="104" ry="20" stroke-width="2.5" opacity="0.7"/>
</g>
<ellipse cx="256" cy="440" rx="150" ry="70" fill="#7fd3ff" opacity="0.12"/>
${sparkle(110, 420, 10, '#bfeaff')}${sparkle(404, 410, 12, '#bfeaff')}${sparkle(150, 360, 7, '#fff')}${sparkle(380, 350, 6, '#fff')}
`);

const fxFrame = svg(`
<rect x="10" y="10" width="492" height="492" rx="36" fill="none" stroke="#ffd84a" stroke-width="8"/>
<rect x="22" y="22" width="468" height="468" rx="28" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 10" stroke-linecap="round"/>
${[
[42, 42],
[470, 42],
[42, 470],
[470, 470],
]
.map(([x, y]) => `<polygon points="${star(x, y, 24, 10)}" fill="#ffe066" stroke="#d19a00" stroke-width="3" stroke-linejoin="round"/>`)
.join('')}
`);

const fxSparkles = svg(`
${sparkle(80, 120, 14)}${sparkle(440, 96, 18)}${sparkle(410, 300, 10, '#fff7c2')}
${sparkle(96, 300, 12, '#ffd3e6')}${sparkle(380, 210, 7)}${sparkle(150, 210, 6, '#fff7c2')}
${sparkle(460, 420, 9, '#bfeaff')}${sparkle(60, 420, 8)}
`);

// ---------------------------------------------------------------------------
// プリセットカタログ
// ---------------------------------------------------------------------------
interface PresetDef {
id: string;
category: AvatarCategory;
name: string;
markup?: string;
src?: string;
}

const PRESET_DEFS: PresetDef[] = [
{ id: 'preset_bg_sky', category: 'background', name: 'はれの草原', markup: bgSky },
{ id: 'preset_bg_night', category: 'background', name: 'ほしぞら', markup: bgNight },
{ id: 'preset_fx_aura', category: 'back_effect', name: 'キラキラオーラ', markup: fxAura },
{ id: 'preset_fx_magic', category: 'back_effect', name: 'まほうじん', markup: fxMagicCircle },
{ id: 'preset_hairback_short', category: 'hair_back', name: 'ショート(うしろ)', markup: hairBackShort },
{ id: 'preset_hairback_long', category: 'hair_back', name: 'ロング(うしろ)', markup: hairBackLong },
{ id: 'preset_body_default', category: 'body', name: 'イラスト素体', src: DEFAULT_BODY_ILLUST_SRC },
{ id: 'preset_eyes_round', category: 'face_eyes', name: 'にっこりフェイス', src: DEFAULT_FACE_ILLUST_SRC },
{ id: 'preset_bottoms_shorts', category: 'bottoms', name: 'ショートパンツ', markup: bottomsShorts },
{ id: 'preset_bottoms_skirt', category: 'bottoms', name: 'プリーツスカート', markup: bottomsSkirt },
{ id: 'preset_shoes_sneakers', category: 'shoes', name: 'スニーカー', markup: shoesSneakers },
{ id: 'preset_shoes_boots', category: 'shoes', name: 'ブーツ', markup: shoesBoots },
{ id: 'preset_tops_tshirt', category: 'tops', name: 'スターTシャツ', markup: topsTshirt },
{ id: 'preset_tops_dress', category: 'tops', name: 'リボンワンピース', markup: topsDress },
{ id: 'preset_hairfront_short', category: 'hair_front', name: 'ショート(まえ)', markup: hairFrontShort },
{ id: 'preset_hairfront_long', category: 'hair_front', name: 'ぱっつん(まえ)', markup: hairFrontLong },
{ id: 'preset_hat_crown', category: 'hat_glasses', name: 'おうかん', markup: hatCrown },
{ id: 'preset_glasses_round', category: 'hat_glasses', name: 'まるメガネ', markup: glassesRound },
{ id: 'preset_item_sword', category: 'hand_item', name: 'ゆうしゃの剣', markup: itemSword },
{ id: 'preset_item_wand', category: 'hand_item', name: 'まほうのステッキ', markup: itemWand },
{ id: 'preset_pet_dragon', category: 'pet', name: 'ちびドラゴン', markup: petDragon },
{ id: 'preset_pet_dog', category: 'pet', name: 'しばいぬ', markup: petDog },
{ id: 'preset_fx_frame', category: 'front_effect', name: 'ゴールドフレーム', markup: fxFrame },
{ id: 'preset_fx_sparkles', category: 'front_effect', name: 'キラキラ', markup: fxSparkles },
];

export const PRESET_PARTS: AvatarPart[] = PRESET_DEFS.map(({ id, category, name, markup, src }) => ({
id,
category,
name,
src: src ?? (markup ? svgToDataUrl(markup) : ''),
source: 'preset',
}));

const byId = (id: string) => PRESET_PARTS.find((p) => p.id === id)!;

/** 位置合わせの基準となる3頭身ベース素体（高品質イラスト透過PNG） */
export const PRESET_BODY: AvatarPart = byId('preset_body_default');
export const PRESET_BODY_SRC = PRESET_BODY.src;

/** 初期装備 */
export const DEFAULT_EQUIPPED: EquippedParts = {
background: byId('preset_bg_sky'),
hair_back: byId('preset_hairback_short'),
body: PRESET_BODY,
face_eyes: byId('preset_eyes_round'),
face_mouth: null, // 表情画像に目・眉・鼻・口・チークが完全内包されているため旧SVG口はnull
bottoms: byId('preset_bottoms_shorts'),
shoes: byId('preset_shoes_sneakers'),
tops: byId('preset_tops_tshirt'),
hair_front: byId('preset_hairfront_short'),
};

