import type { CameraFacing } from './types';

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;
  private currentFacing: CameraFacing = 'environment';

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async start(): Promise<void> {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: this.currentFacing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'OverconstrainedError') {
        // Retry with relaxed constraints
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.currentFacing },
          audio: false,
        });
      } else {
        throw err;
      }
    }

    this.videoElement.srcObject = this.stream;
    await this.videoElement.play();
  }

  async switchCamera(): Promise<void> {
    this.stop();
    this.currentFacing = this.currentFacing === 'environment' ? 'user' : 'environment';
    await this.start();
  }

  getCurrentFacing(): CameraFacing {
    return this.currentFacing;
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.videoElement.srcObject = null;
  }
}
