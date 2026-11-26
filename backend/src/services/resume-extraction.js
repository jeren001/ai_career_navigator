import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { skillsError } from './user-skills.js';

export const resumeFileLimit = 5 * 1024 * 1024;
export const resumeMediaTypes = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const extractor = fileURLToPath(new URL('../lib/extract-resume.py', import.meta.url));
let activeExtractions = 0;

export async function extractResumeText(data, mediaType) {
  const format = Object.hasOwn(resumeMediaTypes, mediaType) ? resumeMediaTypes[mediaType] : null;
  if (!format) throw skillsError(415, 'Upload a PDF or DOCX file with its document content type');
  if (!Buffer.isBuffer(data) || !data.length) throw skillsError(400, 'Upload a nonempty document');
  if (data.length > resumeFileLimit) throw skillsError(413, 'Resume files must be at most 5 MiB');
  const signature = format === 'pdf' ? Buffer.from('%PDF-') : Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  if (!data.subarray(0, signature.length).equals(signature)) {
    throw skillsError(422, 'The file does not match its document content type');
  }
  if (activeExtractions >= 2) throw skillsError(503, 'Document extraction is busy. Retry shortly');
  activeExtractions += 1;
  try {
    const output = await new Promise((resolve, reject) => {
      const child = execFile('python3', ['-I', extractor, format], {
        timeout: 5500, killSignal: 'SIGKILL', maxBuffer: 160000, encoding: 'utf8',
        // Document parsers do not need the backend's credentials.
        env: { PATH: process.env.PATH, LANG: 'C.UTF-8' },
      }, (error, stdout) => {
        if (error?.code === 'ENOENT' || error?.code === 3) {
          reject(skillsError(503, 'Document extraction is unavailable'));
        } else if (error) {
          reject(skillsError(422, 'The document is invalid, protected, or exceeds the extraction limits'));
        } else {
          resolve(stdout);
        }
      });
      child.stdin.on('error', () => {});
      child.stdin.end(data);
    });
    const text = output.replaceAll('\0', '').replace(/\r\n?/g, '\n').trim();
    if (!text || [...text].length > 40000) {
      throw skillsError(422, 'The document must contain extractable text within 40000 characters');
    }
    return text;
  } finally {
    activeExtractions -= 1;
  }
}
