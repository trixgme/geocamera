import type { CapturedPhoto } from './types';

export class UI {
  private captureBtn: HTMLButtonElement;
  private switchBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private previewOverlay: HTMLDivElement;
  private previewImage: HTMLImageElement;
  private saveBtn: HTMLButtonElement;
  private discardBtn: HTMLButtonElement;
  private slackBtn: HTMLButtonElement;
  private errorOverlay: HTMLDivElement;
  private errorMessage: HTMLParagraphElement;
  private retryBtn: HTMLButtonElement;
  private loadingEl: HTMLDivElement;
  private addressText: HTMLSpanElement;
  private timeText: HTMLSpanElement;
  private memoInput: HTMLInputElement;

  private captureHandler: (() => Promise<void>) | null = null;
  private switchHandler: (() => Promise<void>) | null = null;
  private saveHandler: (() => Promise<void>) | null = null;
  private discardHandler: (() => void) | null = null;
  private slackHandler: (() => Promise<void>) | null = null;

  constructor() {
    this.captureBtn = document.getElementById('btn-capture') as HTMLButtonElement;
    this.switchBtn = document.getElementById('btn-switch') as HTMLButtonElement;
    this.backBtn = document.getElementById('btn-back') as HTMLButtonElement;
    this.previewOverlay = document.getElementById('preview-overlay') as HTMLDivElement;
    this.previewImage = document.getElementById('preview-image') as HTMLImageElement;
    this.saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
    this.discardBtn = document.getElementById('btn-discard') as HTMLButtonElement;
    this.slackBtn = document.getElementById('btn-slack') as HTMLButtonElement;
    this.errorOverlay = document.getElementById('error-overlay') as HTMLDivElement;
    this.errorMessage = document.getElementById('error-message') as HTMLParagraphElement;
    this.retryBtn = document.getElementById('btn-retry') as HTMLButtonElement;
    this.loadingEl = document.getElementById('loading') as HTMLDivElement;
    this.addressText = document.getElementById('info-address-text') as HTMLSpanElement;
    this.timeText = document.getElementById('info-time-text') as HTMLSpanElement;
    this.memoInput = document.getElementById('memo-input') as HTMLInputElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.captureBtn.addEventListener('click', async () => {
      if (this.captureHandler) await this.captureHandler();
    });

    this.switchBtn.addEventListener('click', async () => {
      if (this.switchHandler) await this.switchHandler();
    });

    this.saveBtn.addEventListener('click', async () => {
      if (this.saveHandler) await this.saveHandler();
    });

    this.discardBtn.addEventListener('click', () => {
      if (this.discardHandler) this.discardHandler();
    });

    this.slackBtn.addEventListener('click', async () => {
      if (this.slackHandler) await this.slackHandler();
    });

    this.retryBtn.addEventListener('click', () => {
      this.hideError();
    });

    this.backBtn.addEventListener('click', () => {
      window.history.back();
    });
  }

  onCapture(handler: () => Promise<void>): void {
    this.captureHandler = handler;
  }

  onSwitch(handler: () => Promise<void>): void {
    this.switchHandler = handler;
  }

  onSave(handler: () => Promise<void>): void {
    this.saveHandler = handler;
  }

  onDiscard(handler: () => void): void {
    this.discardHandler = handler;
  }

  onSlack(handler: () => Promise<void>): void {
    this.slackHandler = handler;
  }

  showPreview(photo: CapturedPhoto): void {
    this.previewImage.src = photo.dataUrl;
    this.slackBtn.disabled = false;
    this.slackBtn.textContent = 'Slack';
    this.previewOverlay.classList.remove('hidden');
  }

  hidePreview(): void {
    this.previewOverlay.classList.add('hidden');
    this.previewImage.src = '';
  }

  setSlackSending(): void {
    this.slackBtn.disabled = true;
    this.slackBtn.textContent = '전송 중...';
  }

  setSlackDone(): void {
    this.slackBtn.disabled = true;
    this.slackBtn.textContent = '전송 완료';
  }

  setSlackFailed(): void {
    this.slackBtn.disabled = false;
    this.slackBtn.textContent = '재시도';
  }

  showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorOverlay.classList.remove('hidden');
  }

  hideError(): void {
    this.errorOverlay.classList.add('hidden');
  }

  setLoading(loading: boolean): void {
    this.captureBtn.disabled = loading;
    if (loading) {
      this.loadingEl.classList.remove('hidden');
    } else {
      this.loadingEl.classList.add('hidden');
    }
  }

  updateAddress(address: string): void {
    this.addressText.textContent = address;
  }

  updateTime(time: string): void {
    this.timeText.textContent = time;
  }

  getMemo(): string {
    return this.memoInput.value.trim();
  }

  clearMemo(): void {
    this.memoInput.value = '';
  }
}
