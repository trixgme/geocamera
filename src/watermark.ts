import type { WatermarkData } from './types';

// 로고를 미리 로드해두고 캡처 시점에 동기적으로 합성한다.
const logoImage = new Image();
let logoReady = false;
logoImage.onload = () => {
  logoReady = true;
};
logoImage.src = '/img/gme-logo.png';

export function renderWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  data: WatermarkData
): void {
  const barHeight = Math.max(canvasHeight * 0.08, 60);
  const padding = 20;
  const fontSize = Math.max(barHeight * 0.28, 14);
  const maxTextWidth = canvasWidth - padding * 2;

  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, canvasHeight - barHeight, canvasWidth, barHeight);

  // Text settings
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'middle';

  // Line 1: Address
  const line1Y = canvasHeight - barHeight + barHeight * 0.35;
  const addressText = truncateText(ctx, `📍 ${data.address}`, maxTextWidth);
  ctx.fillText(addressText, padding, line1Y);

  // Line 2: Date/time
  const line2Y = canvasHeight - barHeight + barHeight * 0.7;
  const timeText = truncateText(ctx, `🕐 ${data.datetime}`, maxTextWidth);
  ctx.fillText(timeText, padding, line2Y);

  // 우상단 GME 로고 워터마크
  drawLogo(ctx, canvasWidth);
}

function drawLogo(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
  if (!logoReady || logoImage.naturalWidth === 0) return;

  const logoWidth = canvasWidth * 0.2;
  const logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);
  const margin = canvasWidth * 0.035;
  const x = canvasWidth - logoWidth - margin;
  const y = margin;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = canvasWidth * 0.008;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = canvasWidth * 0.003;
  ctx.drawImage(logoImage, x, y, logoWidth, logoHeight);
  ctx.restore();
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}
