import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export function getVideoMetadata(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      resolve({
        filePath,
        width: videoStream.width,
        height: videoStream.height,
        bitrate: parseInt(videoStream.bit_rate || '0', 10),
      });
    });
  });
}

export async function getLowestQualityVideo(files: string[]) {
  const metas = await Promise.all(files.map(getVideoMetadata));
  metas.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;

    if (areaA !== areaB) return areaA - areaB;
    return a.bitrate - b.bitrate;
  });

  return metas[0];
}

export async function mergeVideo(files: string[], options: any) {
  if (files.length < 2) throw new Error('At least 2 videos are required to merge.');

  const { format, separator } = options;
  const filePath = await getLowestQualityVideo(files);
  const baseName = path.basename(filePath, path.extname(filePath));
  const newName = baseName + separator + new Date().getTime() + separator + 'merged' + '.' + format;

  const originalDir = path.dirname(filePath);
  const targetDir = path.join(originalDir, 'converted');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
  const outputFile = path.join(targetDir, newName);

  const { mtime } = fs.statSync(filePath);

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    files.forEach((file) => command.input(file));

    // Scale all to lowest resolution while preserving aspect ratio with black bars if needed
    const filters = files.map((_, i) => {
      return `[${i}:v]scale=w=${filePath.width}:h=${filePath.height}:force_original_aspect_ratio=decrease,pad=${filePath.width}:${filePath.height}:(ow-iw)/2:(oh-ih)/2,setdar=dar=16/9[v${i}]`;
    });

    const filterGraph = [...filters, files.map((_, i) => `[v${i}][${i}:a]`).join('') + `concat=n=${files.length}:v=1:a=1[outv][outa]`];

    command
      .complexFilter(filterGraph, ['outv', 'outa'])
      .outputOptions('-preset fast')
      .output(outputFile)
      .on('end', () => resolve(outputFile))
      .on('error', (err) => reject(err))
      .run();
  });
}
