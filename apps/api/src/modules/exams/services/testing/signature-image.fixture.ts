import { crc32, deflateSync } from 'node:zlib';

// A real PNG with a dark test stroke, suitable for exercising the upload decoder.
export function signaturePng(width = 600, height = 200): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc((width * 3 + 1) * height, 255);
  for (let y = 0; y < height; y++) {
    pixels[y * (width * 3 + 1)] = 0;
    for (let x = Math.floor(width * 0.1); x < width * 0.9; x++) {
      if (Math.abs(y - (height / 2 + Math.sin(x / 18) * height / 6)) < 2) {
        pixels.fill(20, y * (width * 3 + 1) + 1 + x * 3, y * (width * 3 + 1) + 4 + x * 3);
      }
    }
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
