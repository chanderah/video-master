import { BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

let command!: ffmpeg.FfmpegCommand;

export default function handleIpcMainApi(ipcMain: Electron.IpcMain, mainWindow: BrowserWindow) {
  ipcMain.handle('exec', (_e, command: string) => {
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) reject(stderr || err.message);
        resolve(stdout);
      });
    });
  });

  ipcMain.handle('env', (_e, key?: string) => {
    const env = JSON.parse(JSON.stringify(process.env));
    return key ? env[key] : env;
  });

  ipcMain.handle('scanDirectory', (_e, path, queries: string[] = []) => {
    function scan(path: string): any[] {
      const entries = readdirSync(path, { withFileTypes: true });

      return entries.flatMap((v) => {
        const uri = `${path}/${v.name}`;
        const encodedUri = encodeURI(uri);
        const stat = statSync(uri);

        const data = {
          ...v,
          path,
          uri,
          encodedUri,
          isDirectory: v.isDirectory(),
          stat,
        };
        return data.isDirectory ? scan(uri) : data;
      });
    }

    const result = scan(path);
    return result
      .filter((v) => !queries.length || queries.some((q) => v.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => +b.isDirectory - +a.isDirectory);

    // return readdirSync(path, { withFileTypes: true })
    //   .map((v) => {
    //     const uri = `${path}/${v.name}`;
    //     const encodedUri = encodeURI(uri);
    //     const stat = statSync(uri);
    //     return {
    //       ...v,
    //       path,
    //       uri,
    //       encodedUri,
    //       isDirectory: v.isDirectory(),
    //       stat,
    //     };
    //   })
    //   .filter((entry) => {
    //     if (entry.isDirectory || !queries.length) return true;

    //     const lowerName = entry.name?.toLowerCase() ?? '';
    //     return queries.some((v) => lowerName.includes(v.toLowerCase()));
    //   })
    //   .sort((a, b) => +b.isDirectory - +a.isDirectory);
  });

  ipcMain.handle('getThumbnail', async (_e, uri: string) => {
    if (!fs.existsSync(uri)) throw new Error('File not found');

    const folderName = '.tmp';
    const folder = path.join(process.cwd(), folderName);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const filename = `${path.basename(uri)}-thumbnail.png`;
    const thumbnailUri = path.join(folderName, filename);
    const fallbackUri = '/assets/images/image_placeholder.png';

    return new Promise((resolve) => {
      ffmpeg.ffprobe(uri, (err, data) => {
        if (err) return resolve(fallbackUri);
        const meta = data.streams[0];

        ffmpeg(uri)
          .screenshots({
            count: 1,
            folder,
            filename,
            size: meta.width + 'x' + meta.height,
          })
          .on('end', () => {
            try {
              const buffer = fs.readFileSync(thumbnailUri);
              const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
              resolve(base64);
            } catch (_err) {
              resolve(fallbackUri);
            }
          })
          .on('error', (_err: any) => resolve(fallbackUri));
      });
    });
  });

  ipcMain.handle('getFileStat', async (_e, uri: string) => {
    const encodedUri = encodeURI(uri);
    const stat = statSync(uri);
    return {
      ...stat,
      uri,
      encodedUri,
    };
  });

  ipcMain.handle('stopFfmpeg', async (e) => {
    command?.kill('SIGKILL');
    command = null;
    e.sender.send('consoleLog', 'Process stopped.');
  });

  ipcMain.handle('convertVideo', async (e, filePath: string, options: any) => {
    const { format, quality, separator, suffix, deleteSource } = options;
    const outputFile = getOutputFilePath(filePath, format, separator, suffix);

    return new Promise(async (resolve, reject) => {
      const { width, height } = await getVideoMetadata(filePath);
      const isPortrait = height > width;

      if ((quality === '1080p' && !isAbove1080p(width, height)) || (quality === '720p' && !isAbove720p(width, height))) {
        deleteSource ? fs.renameSync(filePath, outputFile) : fs.copyFileSync(filePath, outputFile);

        e.sender.send('convertProgress', {
          file: filePath,
          done: true,
          percent: 100,
          output: outputFile,
        });
        return resolve(outputFile);
      }

      let size;
      if (quality === '1080p') {
        // Portrait: 1080x1920
        // Landscape: 1920x1080
        size = isPortrait ? '1080x?' : '?x1080';
      } else {
        // Portrait: 720x1280
        // Landscape: 1280×720
        size = isPortrait ? '720x?' : '?x720';
      }

      command = ffmpeg(filePath)
        .output(outputFile)
        .size(size)
        .on('progress', (progress) => {
          const data = { ...progress, width, height };
          e.sender.send('consoleLog', `${progress.percent.toFixed(2)}%`, `- Converting from ${width}x${height} to ${quality}`, data);
          e.sender.send('convertProgress', {
            file: filePath,
            percent: progress.percent,
            time: progress.timemark,
          });
        })
        .on('end', () => {
          const { mtime } = fs.statSync(filePath);
          fs.utimes(outputFile, mtime, mtime, (err) => {
            if (err) return reject(err);

            if (deleteSource && fs.existsSync(outputFile)) {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            e.sender.send('convertProgress', {
              file: filePath,
              done: true,
              percent: 100,
              output: outputFile,
            });
            resolve(outputFile);
          });
        })
        .on('error', (err) => {
          e.sender.send('convertProgress', {
            file: filePath,
            percent: 0,
            error: err.message,
          });
          reject(err);
        });

      command.run();
    });
  });

  ipcMain.handle('mergeVideo', async (e, files: string[], options: any) => {
    if (files.length < 2) throw new Error('At least 2 videos are required to merge.');

    return new Promise(async (resolve, reject) => {
      const { format, separator, suffix, deleteSource } = options;
      let metadata = await getLowestQualityVideo(files); // lowest
      const { filePath } = metadata;
      const outputFile = getOutputFilePath(filePath, format, separator, suffix);

      command = ffmpeg();
      files.forEach((file) => command.input(file));

      if (isAbove720p(metadata.width, metadata.height)) {
        const resolution = getNewResolution('720p', metadata.width, metadata.height);
        mainWindow.webContents.send('consoleLog', `Changing resolution from ${metadata.width}x${metadata.height} to ${resolution.width}x${resolution.height}`);

        metadata.width = resolution.width;
        metadata.height = resolution.height;
      }

      const totalDuration = await getTotalDuration(files);

      const filters = files.map((_, i) => {
        return `[${i}:v]scale=w=${metadata.width}:h=${metadata.height}:force_original_aspect_ratio=decrease,pad=${metadata.width}:${metadata.height}:(ow-iw)/2:(oh-ih)/2[v${i}]`;
      });
      const filterGraph = [...filters, files.map((_, i) => `[v${i}][${i}:a]`).join('') + `concat=n=${files.length}:v=1:a=1[outv][outa]`];

      command
        .complexFilter(filterGraph, ['outv', 'outa'])
        .outputOptions('-preset fast')
        .output(outputFile)
        .on('progress', (progress) => {
          const currentTime = parseTimemark(progress.timemark);
          const percent = Math.min((currentTime / totalDuration) * 100, 100);

          const data = { ...progress, percent, width: metadata.width, height: metadata.height };
          e.sender.send('consoleLog', `${percent.toFixed(2)}%`, `- Merging to ${data.width}x${data.height}`, data);

          files.forEach((v) => {
            e.sender.send('convertProgress', {
              percent,
              file: v,
              time: progress.timemark,
            });
          });
        })
        .on('end', () => {
          const { mtime } = fs.statSync(filePath);
          fs.utimes(outputFile, mtime, mtime, (err) => {
            if (err) return reject(err);

            files.forEach((v) => {
              e.sender.send('convertProgress', {
                file: v,
                percent: 100,
                done: true,
              });
            });

            if (deleteSource && fs.existsSync(outputFile)) {
              for (const v of files) {
                if (fs.existsSync(v)) fs.unlinkSync(v);
              }
            }
            resolve(outputFile);
          });
        })
        .on('error', (err) => reject(err))
        .run();
    });
  });
}

// ipcMain.handle('openFile', (_e, uri) => {
//   return shell.openPath(uri);
// });

export function getVideoMetadata(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      console.log('called');

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      console.log('videoStream', videoStream);
      if (!videoStream) return reject(new Error('No video stream found'));

      console.log('called');

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

function getAspectRatio(width: number, height: number): number {
  return width / height;
}

function getNewResolution(quality: '1080p' | '720p', width: number, height: number) {
  const aspectRatio = getAspectRatio(width, height);
  const isPortrait = height > width;

  if (quality === '1080p') {
    const newWidth = isPortrait ? 1080 : 1920;
    const newHeight = isPortrait
      ? Math.floor(1080 / aspectRatio) // width / aspect = height
      : Math.floor(1920 / aspectRatio);
    return { width: newWidth, height: newHeight };
  } else {
    const newWidth = isPortrait ? 720 : 1280;
    const newHeight = isPortrait ? Math.floor(720 / aspectRatio) : Math.floor(1280 / aspectRatio);
    return { width: newWidth, height: newHeight };
  }
}

function isAbove720p(width: number, height: number) {
  const totalPixels = width * height;
  const threshold = 1280 * 720;
  return totalPixels > threshold;
}

function isAbove1080p(width: number, height: number) {
  const totalPixels = width * height;
  const threshold = 1920 * 1080;
  return totalPixels > threshold;
}

function parseTimemark(t: string): number {
  const [hh, mm, ss] = t.split(':');
  return parseFloat(hh) * 3600 + parseFloat(mm) * 60 + parseFloat(ss);
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration ?? 0;
      resolve(duration);
    });
  });
}

export async function getTotalDuration(files: string[]): Promise<number> {
  const durations = await Promise.all(files.map(getVideoDuration));
  return durations.reduce((acc, dur) => acc + dur, 0);
}

function getOutputFilePath(filePath: string, format: string, separator: string, suffix: string) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const newName = baseName + separator + Date.now() + separator + suffix + '.' + format;

  const originalDir = path.dirname(filePath);
  const targetDir = path.join(originalDir, 'converted');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

  return path.join(targetDir, newName);
}
