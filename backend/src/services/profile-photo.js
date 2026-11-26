import { execFile } from 'node:child_process';
import { skillsError } from './user-skills.js';

export const photoLimit = 5 * 1024 * 1024;
const png = Buffer.from('89504e470d0a1a0a', 'hex');
const jpg = Buffer.from('ffd8ff', 'hex');
const riff = Buffer.from('RIFF');
const webp = Buffer.from('WEBP');
export const photoFormats = {
  'image/jpeg': { decoder: 'jpeg', matches: (bytes) => bytes.subarray(0, 3).equals(jpg) },
  'image/png': { decoder: 'png', matches: (bytes) => bytes.subarray(0, 8).equals(png) },
  'image/webp': { decoder: 'webp', matches: (bytes) => bytes.subarray(0, 4).equals(riff) && bytes.subarray(8, 12).equals(webp) },
};
let active = 0;

export async function normalizeProfilePhoto(bytes, mediaType) {
  if (!Object.hasOwn(photoFormats, mediaType)) throw skillsError(415, 'Upload a JPEG, PNG, or WebP image');
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw skillsError(400, 'Upload a nonempty image');
  if (bytes.length > photoLimit) throw skillsError(413, 'Profile photos must be at most 5 MiB');
  const { matches, decoder } = photoFormats[mediaType];
  if (!matches(bytes)) throw skillsError(422, 'The image does not match its content type');
  if (active >= 2) throw skillsError(503, 'Photo processing is busy. Retry shortly');
  active += 1;
  try {
    return await new Promise((resolve, reject) => {
      const child = execFile('magick', [
        '-limit', 'memory', '64MiB', '-limit', 'map', '64MiB', '-limit', 'disk', '0',
        '-limit', 'width', '4096', '-limit', 'height', '4096', '-limit', 'list-length', '8', '-limit', 'thread', '1',
        decoder + ':-[0]', '-auto-orient', '-strip', '-thumbnail', '512x512>',
        '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-quality', '86', 'jpeg:-',
      ], {
        timeout: 5000, killSignal: 'SIGKILL', maxBuffer: 1048576, encoding: 'buffer',
        env: { PATH: process.env.PATH, LANG: 'C.UTF-8' },
      }, (error, output) => {
        if (error?.code === 'ENOENT') reject(skillsError(503, 'Photo processing is unavailable'));
        else if (error || !output?.subarray(0, 3).equals(jpg)) reject(skillsError(422, 'Invalid image or image dimensions exceeded'));
        else resolve(output);
      });
      child.stdin.on('error', () => {});
      child.stdin.end(bytes);
    });
  } finally {
    active -= 1;
  }
}
