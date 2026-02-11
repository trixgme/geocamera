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
    // 1. 서버시간 + GPS를 먼저 확보 (실패 시 에러 throw → 촬영 차단)
    const [serverTime, location] = await Promise.all([
      this.fetchServerTime(),
      this.bridge.requestLocation(),
    ]);

    // 2. 데이터 확보 후 즉시 프레임 캡처 (시간차 최소화)
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;

    if (this.isFrontCamera()) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    }

    // 3. 워터마크 합성
    renderWatermark(this.ctx, this.canvas.width, this.canvas.height, {
      address: location.address,
      datetime: serverTime.formatted,
    });

    // 4. JPEG 출력
    const dataUrl = this.canvas.toDataURL('image/jpeg', 0.92);

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
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`/api/time?tz=${encodeURIComponent(tz)}`);
    if (!res.ok) throw new Error('SERVER_TIME_FAILED');
    return await res.json();
  }
}
