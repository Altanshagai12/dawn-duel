const MAX_PIXEL_RATIO = 2.25;
const MAX_BACKING_PIXELS = 3_000_000;

function finiteDimension(value, fallback = 1) {
  return Math.max(1, Number.isFinite(Number(value)) ? Number(value) : fallback);
}

export function boundedPixelRatio(width, height, requested = 1) {
  const cssWidth = finiteDimension(width);
  const cssHeight = finiteDimension(height);
  const deviceRatio = Math.max(1, Number(requested) || 1);
  const pixelBudgetRatio = Math.sqrt(MAX_BACKING_PIXELS / (cssWidth * cssHeight));
  return Math.max(1, Math.min(deviceRatio, MAX_PIXEL_RATIO, pixelBudgetRatio));
}

export function createDisplayMetrics(width, height, requestedRatio = 1) {
  const cssWidth = finiteDimension(width);
  const cssHeight = finiteDimension(height);
  const pixelRatio = boundedPixelRatio(cssWidth, cssHeight, requestedRatio);
  return {
    cssWidth,
    cssHeight,
    pixelRatio,
    renderWidth: Math.max(1, Math.round(cssWidth * pixelRatio)),
    renderHeight: Math.max(1, Math.round(cssHeight * pixelRatio)),
  };
}

export function cameraZoomForDisplay(metrics) {
  const baseZoom = Math.max(.68, Math.min(1.08, metrics.cssWidth / 1120));
  return baseZoom * metrics.pixelRatio;
}

export function displayMetricsForElement(element, windowRef = globalThis.window) {
  return createDisplayMetrics(
    element?.clientWidth || windowRef?.innerWidth || 1,
    element?.clientHeight || windowRef?.innerHeight || 1,
    windowRef?.devicePixelRatio || 1,
  );
}

export function prepareCanvas(canvas, requestedRatio = globalThis.devicePixelRatio || 1) {
  const metrics = createDisplayMetrics(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height, requestedRatio);
  if (canvas.width !== metrics.renderWidth || canvas.height !== metrics.renderHeight) {
    canvas.width = metrics.renderWidth;
    canvas.height = metrics.renderHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(metrics.pixelRatio, 0, 0, metrics.pixelRatio, 0, 0);
  return { ctx, width: metrics.cssWidth, height: metrics.cssHeight };
}
