export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
}

export interface ServerTime {
  iso: string;
  unix: number;
  timezone: string;
  formatted: string;
}

export interface WatermarkData {
  address: string;
  datetime: string;
}

export type CameraFacing = 'user' | 'environment';

export interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface NativeBridge {
  requestLocation(): Promise<GeoLocation>;
  savePhoto(dataUrl: string, filename: string): Promise<boolean>;
  isNativeApp(): boolean;
  getPlatform(): 'ios' | 'android' | 'web';
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        geocamera?: {
          postMessage(message: unknown): void;
        };
      };
    };
    GeoCameraAndroid?: {
      requestLocation(payload: string): void;
      savePhoto(dataUrl: string, filename: string): void;
    };
    GeoCameraCallback?: {
      onLocation(data: string): void;
      onPhotoSaved(success: boolean): void;
    };
  }
}
