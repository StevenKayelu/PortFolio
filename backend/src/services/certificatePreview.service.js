import sharp from "sharp";

/**
 * Builds the public preview of a certificate: readable on screen, poor
 * for printing or editing. Resized to at most 1200px wide, tiled with a
 * faint diagonal watermark, re-encoded as WebP with metadata stripped.
 * The full-quality original is stored privately elsewhere.
 */

const MAX_WIDTH = 1200;
export const WATERMARK_TEXT = process.env.CERTIFICATE_WATERMARK || "stevenkayelu.online · view only";

const escapeXml = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

function watermarkSvg(width, height, text) {
  // One rotated pattern tile repeated over the whole image. Dark text with a
  // light outline stays visible on both white and coloured certificates.
  const tileW = Math.max(360, Math.round(width / 2.4));
  const tileH = Math.round(tileW * 0.45);
  const fontSize = Math.max(16, Math.round(width / 42));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
        <text x="0" y="${Math.round(tileH / 2)}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700"
          fill="#14243D" fill-opacity="0.16" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="1">${escapeXml(text)}</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#wm)"/>
  </svg>`);
}

/** @param {Buffer} input any raster image (JPEG/PNG/WebP), e.g. a rendered PDF page */
export async function makeCertificatePreview(input) {
  const base = sharp(input, { limitInputPixels: 60_000_000 }).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).flatten({ background: "#FFFFFF" });
  const { data, info } = await base.png().toBuffer({ resolveWithObject: true });
  const buffer = await sharp(data)
    .composite([{ input: watermarkSvg(info.width, info.height, WATERMARK_TEXT), top: 0, left: 0 }])
    .webp({ quality: 72 })
    .toBuffer();
  return { buffer, width: info.width, height: info.height };
}
