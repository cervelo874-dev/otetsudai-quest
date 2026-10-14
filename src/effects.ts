import confetti from 'canvas-confetti';

const COLORS = ['#FF5A5F', '#FFD23F', '#4DABF7', '#69DB7C', '#FF8FBF', '#9775FA'];

/** 画面いっぱいの紙吹雪 */
export function burst(): void {
  confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors: COLORS, zIndex: 9999 });
  window.setTimeout(() => {
    confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors: COLORS, zIndex: 9999 });
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors: COLORS, zIndex: 9999 });
  }, 220);
}

/** ボタン位置などからの小さな紙吹雪 */
export function smallBurst(x = 0.5, y = 0.7): void {
  confetti({ particleCount: 40, spread: 65, origin: { x, y }, colors: COLORS, scalar: 0.8, zIndex: 9999 });
}

export function burstFromElement(el: Element): void {
  const r = el.getBoundingClientRect();
  smallBurst((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight);
}
