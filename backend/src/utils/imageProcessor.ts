import sharp from 'sharp';

/**
 * Resizes a raw image buffer to the given width × height using "cover" fit,
 * then converts the result to WebP at quality 85.
 */
export async function processGalleryImage(
  buffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * Composites a semi-transparent SVG text watermark onto the bottom-right
 * corner of the given WebP buffer and returns a new WebP buffer.
 *
 * sharp does not natively render text, so we generate a minimal SVG overlay
 * and let the compositor handle blending.
 */
export async function addWatermark(buffer: Buffer, text: string): Promise<Buffer> {
  // Sanitise the watermark text to avoid breaking SVG markup
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const wmWidth = 200;
  const wmHeight = 30;

  const svgBuffer = Buffer.from(
    `<svg width="${wmWidth}" height="${wmHeight}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${wmWidth}" height="${wmHeight}" rx="4" fill="rgba(0,0,0,0.45)"/>` +
      `<text x="10" y="21" font-size="14" font-family="sans-serif" fill="white">${safeText}</text>` +
      `</svg>`
  );

  // Retrieve dimensions of the base image so we can position the watermark
  const metadata = await sharp(buffer).metadata();
  const imgWidth = metadata.width ?? wmWidth;
  const imgHeight = metadata.height ?? wmHeight;

  const left = Math.max(0, imgWidth - wmWidth - 8);
  const top = Math.max(0, imgHeight - wmHeight - 8);

  return sharp(buffer)
    .composite([{ input: svgBuffer, left, top, blend: 'over' }])
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * Convenience helper that resizes + converts to WebP, then overlays the
 * platform watermark in one pipeline call.
 */
export async function processAndWatermark(
  buffer: Buffer,
  width: number,
  height: number,
  watermarkText: string
): Promise<Buffer> {
  const resized = await processGalleryImage(buffer, width, height);
  return addWatermark(resized, watermarkText);
}
