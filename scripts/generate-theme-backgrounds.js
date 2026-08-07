/**
 * Generates the theme-wheel background PNGs from scratch — a hand-rolled
 * PNG encoder (zlib for DEFLATE, manual chunk framing) plus a simple
 * radial-blob renderer, no image library or external asset. Same
 * "procedurally generate everything" approach as the WAV tone synth in
 * src/lib/audio/tone.ts. Run with `npm run generate:themes`; output goes to
 * public/themes/<theme>-<mode>.png and is committed like any other asset —
 * this script doesn't need to run again unless a theme's palette changes.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const WIDTH = 1200;
const HEIGHT = 675;
const OUT_DIR = path.join(__dirname, "..", "public", "themes");

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(zlib.crc32(crcInput) >>> 0, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgb) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Blends a base color with a few soft radial "blobs," the same layered look as .bg-gradient-party-soft in globals.css. */
function renderGradient(width, height, base, blobs) {
  const pixels = Buffer.alloc(width * height * 3);
  const maxDim = Math.max(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let [r, g, b] = base;
      for (const blob of blobs) {
        const dx = x - blob.cx * width;
        const dy = y - blob.cy * height;
        const dist = Math.sqrt(dx * dx + dy * dy) / (blob.r * maxDim);
        const t = Math.max(0, 1 - dist);
        const alpha = Math.pow(t, 1.6) * blob.strength;
        r += (blob.color[0] - r) * alpha;
        g += (blob.color[1] - g) * alpha;
        b += (blob.color[2] - b) * alpha;
      }
      const idx = (y * width + x) * 3;
      pixels[idx] = clamp255(r);
      pixels[idx + 1] = clamp255(g);
      pixels[idx + 2] = clamp255(b);
    }
  }
  return pixels;
}

const BLOB_LAYOUT = [
  { cx: 0.15, cy: 0.1, r: 0.5 },
  { cx: 0.85, cy: 0.2, r: 0.5 },
  { cx: 0.5, cy: 1.0, r: 0.55 },
];

const THEMES = {
  classic: {
    colors: [
      [124, 58, 237], // violet
      [236, 72, 153], // pink
      [245, 158, 11], // amber
    ],
  },
  neon: {
    colors: [
      [34, 211, 238], // cyan
      [132, 204, 22], // lime
      [139, 92, 246], // violet
    ],
  },
  sunset: {
    colors: [
      [251, 113, 133], // coral
      [251, 191, 36], // gold
      [192, 38, 211], // magenta
    ],
  },
};

const MODES = {
  light: { base: [250, 250, 251], strength: 0.32 },
  dark: { base: [9, 9, 11], strength: 0.55 },
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [themeId, theme] of Object.entries(THEMES)) {
  for (const [modeId, mode] of Object.entries(MODES)) {
    const blobs = BLOB_LAYOUT.map((layout, i) => ({
      ...layout,
      color: theme.colors[i],
      strength: mode.strength,
    }));
    const pixels = renderGradient(WIDTH, HEIGHT, mode.base, blobs);
    const png = encodePng(WIDTH, HEIGHT, pixels);
    const outPath = path.join(OUT_DIR, `${themeId}-${modeId}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`wrote ${outPath} (${(png.length / 1024).toFixed(0)}kb)`);
  }
}
