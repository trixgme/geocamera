import type { CapturedPhoto, ServerTime } from './types';
import type { GeoCameraBridge } from './bridge';
import { renderWatermark } from './watermark';

export class PhotoCapture {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bridge: GeoCameraBridge;
  private isFrontCamera: () => boolean;

  constructor(
    canvas: HTMLCanvasElement,
    bridge: GeoCameraBridge,
    isFrontCamera: () => boolean
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bridge = bridge;
    this.isFrontCamera = isFrontCamera;
  }

  async capture(video: HTMLVideoElement): Promise<CapturedPhoto> {
    // 1. Set canvas to video dimensions
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;

    // 2. Draw video frame (mirror if front camera)
    if (this.isFrontCamera()) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    }

    // 3. Fetch server time and location in parallel
    const [serverTime, location] = await Promise.all([
      this.fetchServerTime(),
      this.bridge.requestLocation(),
    ]);

    // 4. Render watermark
    renderWatermark(this.ctx, this.canvas.width, this.canvas.height, {
      address: location.address,
      datetime: serverTime.formatted,
    });

    // 5. Export as JPEG
    const dataUrl = this.canvas.toDataURL('image/jpeg', 0.92);

    // 6. Release canvas memory
    const result: CapturedPhoto = {
      dataUrl,
      width: this.canvas.width,
      height: this.canvas.height,
      timestamp: serverTime.unix,
    };

    this.canvas.width = 0;
    this.canvas.height = 0;

    return result;
  }

  private async fetchServerTime(): Promise<ServerTime> {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/time?tz=${encodeURIComponent(tz)}`);
      if (!res.ok) throw new Error('Server time fetch failed');
      return await res.json();
    } catch {
      // Fallback to device time
      const now = new Date();
      return {
        iso: now.toISOString(),
        unix: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        formatted: now.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      };
    }
  }
}
