import { createTicker } from './ticker';
import { formatClock, formatHMKana } from './utils';

type Listener = () => void;

const W = 480;
const H = 240;

/**
 * <canvas> にアバター＋残り時間を描画し、captureStream() で <video> に流して
 * requestPictureInPicture() で他アプリの上に浮かぶ極小タイマーを表示する。
 */
class PipTimerController {
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;
  private img: HTMLImageElement | null = null;
  private svg = '';
  private endsAt = 0;
  private name = '';
  private stopTick: (() => void) | null = null;
  private listeners = new Set<Listener>();
  active = false;

  supported(): boolean {
    return (
      typeof document !== 'undefined' &&
      'pictureInPictureEnabled' in document &&
      document.pictureInPictureEnabled === true &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function'
    );
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  update(info: { svg?: string; imageSrc?: string; endsAt: number; name: string }): void {
    const rawSrc = info.imageSrc || info.svg || '';
    if (rawSrc && rawSrc !== this.svg) {
      this.svg = rawSrc;
      const img = new Image();
      img.onload = () => {
        this.img = img;
        this.draw();
      };
      if (rawSrc.startsWith('data:') || rawSrc.startsWith('blob:') || rawSrc.startsWith('http') || rawSrc.startsWith('/')) {
        img.src = rawSrc;
      } else {
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSrc)}`;
      }
    }
    this.endsAt = info.endsAt;
    this.name = info.name;
    this.draw();
  }

  private ensure(): { canvas: HTMLCanvasElement; video: HTMLVideoElement } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = W;
      this.canvas.height = H;
    }
    if (!this.video) {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.autoplay = true;
      v.setAttribute('aria-hidden', 'true');
      Object.assign(v.style, {
        position: 'fixed',
        right: '0',
        bottom: '0',
        width: '2px',
        height: '2px',
        opacity: '0',
        pointerEvents: 'none',
      });
      document.body.appendChild(v);
      v.addEventListener('leavepictureinpicture', () => {
        this.active = false;
        this.stopLoop();
        this.emit();
      });
      this.video = v;
    }
    return { canvas: this.canvas, video: this.video };
  }

  /** タイマー開始時にあらかじめ video を再生状態にしておく（クリック時に即PiPできるように） */
  prepare(): void {
    if (!this.supported()) return;
    const { canvas, video } = this.ensure();
    this.draw();
    if (!video.srcObject) {
      video.srcObject = canvas.captureStream(30);
    }
    video.play().catch(() => undefined);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  draw(): void {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const remain = this.endsAt - Date.now();
    const done = remain <= 0;
    const warn = remain <= 3 * 60 * 1000;

    const g = ctx.createLinearGradient(0, 0, W, H);
    if (done) {
      const blink = Math.floor(Date.now() / 500) % 2 === 0;
      g.addColorStop(0, blink ? '#FF5A5F' : '#FF8A5B');
      g.addColorStop(1, '#FF9F43');
    } else if (warn) {
      g.addColorStop(0, '#FFB347');
      g.addColorStop(1, '#FFCC33');
    } else {
      g.addColorStop(0, '#6DD5FA');
      g.addColorStop(1, '#7F7FD5');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // アバター
    ctx.save();
    this.roundRect(ctx, 18, 20, 200, 200, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.clip();
    if (this.img) ctx.drawImage(this.img, 18, 20, 200, 200);
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    this.roundRect(ctx, 18, 20, 200, 200, 36);
    ctx.stroke();

    // テキスト
    const font = `'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 0;
    ctx.font = `800 26px ${font}`;
    ctx.fillText(done ? 'おしまいの じかん！' : `${this.name}の のこり`, 350, 52);
    ctx.font = `900 ${done ? 72 : 88}px ${font}`;
    ctx.fillText(done ? 'もどってね' : formatClock(remain), 350, 124);
    ctx.font = `800 24px ${font}`;
    ctx.fillText(done ? '＋15コイン チャンス！' : `${formatHMKana(this.endsAt)} まで`, 350, 196);
    ctx.shadowColor = 'transparent';
  }

  private startLoop(): void {
    this.stopLoop();
    this.stopTick = createTicker(() => this.draw(), 500);
  }

  private stopLoop(): void {
    if (this.stopTick) {
      this.stopTick();
      this.stopTick = null;
    }
  }

  async open(): Promise<void> {
    if (!this.supported()) throw new Error('PiP not supported');
    const { canvas, video } = this.ensure();
    this.draw();
    if (!video.srcObject) video.srcObject = canvas.captureStream(30);
    if (video.paused) await video.play();
    if (video.readyState < 1) {
      await new Promise<void>((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
    }
    await video.requestPictureInPicture();
    this.active = true;
    this.startLoop();
    this.emit();
  }

  async close(): Promise<void> {
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        /* noop */
      }
    }
    this.active = false;
    this.stopLoop();
    this.emit();
  }
}

export const pipTimer = new PipTimerController();
