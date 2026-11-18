// Renders timeline.html frame by frame in a local Chrome/Edge (headless) and pipes frames into ffmpeg.
// Every frame is computed from its timestamp, so motion is perfectly smooth regardless of machine speed.
//   node render.mjs                 -> ../../docs/video/plainclick-launch.mp4 (1920x1080, 30 fps)
//   node render.mjs --preview       -> stills at key times in ./preview/
//   node render.mjs --fps 60        -> 60 fps
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const preview = args.includes('--preview');
const fps = Number(args[args.indexOf('--fps') + 1]) || 30;
const vertical = args.includes('--vertical');            // 1080x1920 for Reels / Shorts / TikTok
const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
const outFile = path.resolve(here, '..', '..', 'docs', 'video', vertical ? 'plainclick-launch-vertical.mp4' : 'plainclick-launch.mp4');
const music = path.join(here, 'assets', 'music.wav');     // original track from make-audio.mjs (optional)

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = browsers.find(existsSync);
if (!executablePath) throw new Error('No Chrome/Edge found');

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files', '--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'timeline.html')).href + (vertical ? '?vertical' : ''));
await page.waitForFunction('window.__ready === true', { timeout: 30000 });
const duration = await page.evaluate('window.DURATION');

if (preview) {
  const dir = path.join(here, 'preview');
  mkdirSync(dir, { recursive: true });
  const custom = args.includes('--times') ? args[args.indexOf('--times') + 1].split(',').map(Number) : null;
  const times = custom || [2, 5.5, 10, 14.3, 16.5, 19.1, 23, 26.2, 30.5, 35.5, 39, 43, 49, 55];
  for (const t of times) {
    await page.evaluate((tt) => window.renderAt(tt), t);
    await page.screenshot({ path: path.join(dir, `${vertical ? 'v' : 't'}${String(t).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
  console.log(`preview: ${times.length} stills in ${dir}`);
} else {
  const audioIn = existsSync(music) ? ['-i', music] : [];
  const audioOut = existsSync(music) ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : [];
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', ...audioIn,
    ...audioOut, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(duration * fps);
  const started = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate((tt) => window.renderAt(tt), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95, optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) console.log(`frame ${i}/${total} (${Math.round((Date.now() - started) / 1000)} s)`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))));
  console.log(`wrote ${outFile}`);
}
await browser.close();
