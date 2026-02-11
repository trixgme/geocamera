import type { GeoLocation } from './types';

type Platform = 'ios' | 'android' | 'web';

interface PendingRequest {
  resolve: (value: GeoLocation) => void;
  reject: (reason: Error) => void;
}

export class GeoCameraBridge {
  private platform: Platform;
  private pendingRequests = new Map<string, PendingRequest>();

  constructor() {
    this.platform = this.detectPlatform();
    this.registerCallbacks();
  }

  private detectPlatform(): Platform {
    if (window.webkit?.messageHandlers?.geocamera) return 'ios';
    if (window.GeoCameraAndroid) return 'android';
    return 'web';
  }

  private registerCallbacks(): void {
    window.GeoCameraCallback = {
      onLocation: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          const pending = this.pendingRequests.get(parsed.requestId);
          if (pending) {
            this.pendingRequests.delete(parsed.requestId);
            pending.resolve({
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              address: parsed.address,
              timestamp: parsed.timestamp,
            });
          }
        } catch {
          // ignore parse errors
        }
      },
      onPhotoSaved: (_success: boolean) => {
        // handled inline in savePhoto
      },
    };
  }

  private sendToNative(action: string, payload: Record<string, unknown>): void {
    if (this.platform === 'ios') {
      window.webkit!.messageHandlers!.geocamera!.postMessage({ action, ...payload });
    } else if (this.platform === 'android') {
      const method = window.GeoCameraAndroid![action as keyof typeof window.GeoCameraAndroid];
      if (typeof method === 'function') {
        (method as (p: string) => void)(JSON.stringify(payload));
      }
    }
  }

  isNativeApp(): boolean {
    return this.platform !== 'web';
  }

  getPlatform(): Platform {
    return this.platform;
  }

  async requestLocation(): Promise<GeoLocation> {
    if (this.platform === 'web') {
      return this.browserGetLocation();
    }

    const requestId = crypto.randomUUID();
    return new Promise<GeoLocation>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.sendToNative('requestLocation', { requestId });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Location request timed out'));
        }
      }, 10000);
    });
  }

  private async browserGetLocation(): Promise<GeoLocation> {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });
    });

    const { latitude, longitude } = position.coords;
    const address = await this.reverseGeocode(latitude, longitude);

    return {
      latitude,
      longitude,
      address,
      timestamp: position.timestamp,
    };
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocode failed');
      const data = await res.json();
      return data.locality
        ? `${data.countryName} ${data.principalSubdivision} ${data.city} ${data.locality}`
        : `${data.countryName} ${data.principalSubdivision} ${data.city}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async savePhoto(dataUrl: string, filename: string): Promise<boolean> {
    if (this.platform === 'web') {
      return this.browserSavePhoto(dataUrl, filename);
    }

    if (this.platform === 'ios') {
      this.sendToNative('savePhoto', { dataUrl, filename });
    } else if (this.platform === 'android') {
      window.GeoCameraAndroid!.savePhoto(dataUrl, filename);
    }
    return true;
  }

  private browserSavePhoto(dataUrl: string, filename: string): boolean {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return true;
  }
}
