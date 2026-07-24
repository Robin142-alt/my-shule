import { writeFileSync } from 'node:fs';

const TRANSIENT_WINDOWS_WRITE_CODES = new Set(['EACCES', 'EBUSY', 'EPERM', 'UNKNOWN']);

type ArtifactWriteOperation = (outputPath: string, content: string) => void;

export interface ArtifactWriterOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  write?: ArtifactWriteOperation;
  sleep?: (durationMs: number) => void;
}

export function writeArtifactFileSync(
  outputPath: string,
  content: string,
  options: ArtifactWriterOptions = {},
): void {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 7);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 50);
  const write = options.write ?? ((path, value) => writeFileSync(path, value, 'utf8'));
  const sleep = options.sleep ?? sleepSync;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      write(outputPath, content);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? '';
      const canRetry = TRANSIENT_WINDOWS_WRITE_CODES.has(code) && attempt < maxAttempts;

      if (!canRetry) {
        throw error;
      }

      sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

function sleepSync(durationMs: number): void {
  if (durationMs <= 0) {
    return;
  }

  const signal = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  Atomics.wait(signal, 0, 0, durationMs);
}
