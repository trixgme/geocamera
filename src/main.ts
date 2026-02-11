import { CameraManager } from './camera';
import { PhotoCapture } from './capture';
import { GeoCameraBridge } from './bridge';
import { UI } from './ui';
import type { CapturedPhoto } from './types';

async function init(): Promise<void> {
  const video = document.getElementById('camera-preview') as HTMLVideoElement;
  const canvas = document.getElementById('capture-canvas') as HTMLCanvasElement;

  const bridge = new GeoCameraBridge();
  const camera = new CameraManager(video);
  const capture = new PhotoCapture(
    canvas,
    bridge,
    () => camera.getCurrentFacing() === 'user'
  );
  const ui = new UI();

  // Check secure context (HTTPS required for getUserMedia)
  if (!window.isSecureContext || !navigator.mediaDevices) {
    ui.showError(
      'HTTPS 연결이 필요합니다.\n카메라는 보안 연결(HTTPS)에서만 사용할 수 있습니다.'
    );
    return;
  }

  // Start camera
  try {
    await camera.start();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      ui.showError('카메라 접근이 거부되었습니다.\n설정에서 카메라 권한을 허용해주세요.');
    } else if (err instanceof DOMException && err.name === 'NotFoundError') {
      ui.showError('카메라를 찾을 수 없습니다.\n카메라가 연결되어 있는지 확인해주세요.');
    } else {
      ui.showError('카메라를 시작할 수 없습니다.\n다시 시도해주세요.');
    }
    return;
  }

  // Pre-fetch location for info bar
  updateInfoBar(bridge, ui);

  // Update time every second
  const timeInterval = setInterval(() => {
    const now = new Date();
    ui.updateTime(
      now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    );
  }, 1000);

  let lastPhoto: CapturedPhoto | null = null;

  ui.onCapture(async () => {
    ui.setLoading(true);
    try {
      lastPhoto = await capture.capture(video);
      ui.showPreview(lastPhoto);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'SERVER_TIME_FAILED') {
        ui.showError('서버 시간을 확인할 수 없습니다.\n네트워크 연결을 확인해주세요.');
      } else if (msg === 'Location request timed out' || msg === 'LOCATION_FAILED') {
        ui.showError('위치 정보를 가져올 수 없습니다.\n위치 권한과 네트워크를 확인해주세요.');
      } else {
        ui.showError('촬영에 실패했습니다.\n네트워크 연결을 확인 후 다시 시도해주세요.');
      }
    } finally {
      ui.setLoading(false);
    }
  });

  ui.onSwitch(async () => {
    try {
      await camera.switchCamera();
    } catch {
      ui.showError('카메라 전환에 실패했습니다.');
    }
  });

  ui.onSave(async () => {
    if (!lastPhoto) return;
    const filename = `geocamera_${Date.now()}.jpg`;
    await bridge.savePhoto(lastPhoto.dataUrl, filename);
    ui.hidePreview();
    lastPhoto = null;
  });

  ui.onDiscard(() => {
    ui.hidePreview();
    lastPhoto = null;
  });

  // 네트워크 복구 시 자동으로 에러 닫고 위치 재요청
  window.addEventListener('online', () => {
    ui.hideError();
    updateInfoBar(bridge, ui);
  });

  // 네트워크 끊김 감지
  window.addEventListener('offline', () => {
    ui.updateAddress('네트워크 연결 없음');
    ui.updateTime('네트워크 연결 없음');
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(timeInterval);
    camera.stop();
  });
}

async function updateInfoBar(bridge: GeoCameraBridge, ui: UI): Promise<void> {
  try {
    const location = await bridge.requestLocation();
    ui.updateAddress(location.address);
  } catch {
    ui.updateAddress('위치를 확인할 수 없습니다');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
