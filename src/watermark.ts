import type { WatermarkData } from './types';

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
