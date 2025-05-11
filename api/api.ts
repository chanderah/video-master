import { BrowserWindow, shell } from 'electron';
import { exec } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { VideoProgress } from '../src/interfaces/video';

let commands: { [id: string]: ffmpeg.FfmpegCommand } = {};
// let isStopped: boolean = false;

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

  ipcMain.handle('openFile', (_e, uri) => {
    return shell.openPath(uri);
  });

  ipcMain.handle('stopFfmpeg', async (e, taskId: string) => {
    commands[taskId]?.kill('SIGKILL');
    delete commands[taskId];

    e.sender.send('consoleLog', 'Process stopped.');
  });

  ipcMain.handle('convertVideo', async (e, taskId: string, filePath: string, options: any) => {
    const { format, quality, separator, suffix, deleteSource } = options;
    const outputFile = getOutputFilePath(filePath, format, separator, suffix);

    console.log('taskId, filePath', taskId, filePath);

    return new Promise(async (resolve, reject) => {
      const { width, height, size } = await getVideoMetadata(filePath);
      const isPortrait = height > width;

      if ((quality === '1080p' && !isAbove1080p(width, height)) || (quality === '720p' && !isAbove720p(width, height))) {
        deleteSource ? fs.renameSync(filePath, outputFile) : fs.copyFileSync(filePath, outputFile);

        e.sender.send('convertProgress', getProgress(taskId, filePath, outputFile, size, 100, width, height));
        return resolve(outputFile);
      }

      let newSize;
      if (quality === '1080p') {
        // Portrait: 1080x1920
        // Landscape: 1920x1080
        newSize = isPortrait ? '1080x?' : '?x1080';
      } else {
        // Portrait: 720x1280
        // Landscape: 1280×720
        newSize = isPortrait ? '720x?' : '?x720';
      }

      let targetFileSize = 0;
      commands[taskId] = ffmpeg(filePath)
        .output(outputFile)
        .size(newSize)
        .on('progress', (progress) => {
          // const data = { ...progress, width, height };
          // e.sender.send('consoleLog', `${progress.percent.toFixed(2)}%`, `- Converting from ${width}x${height} to ${newSize}`, data);

          console.log('progress.targetSize', progress.targetSize);
          targetFileSize = progress.targetSize * 1000;
          e.sender.send('convertProgress', getProgress(taskId, filePath, outputFile, targetFileSize, progress.percent, width, height));
        })
        .on('end', () => {
          const { mtime } = fs.statSync(filePath);
          fs.utimes(outputFile, mtime, mtime, (err) => {
            if (err) return reject(err);

            if (deleteSource && fs.existsSync(outputFile)) {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            e.sender.send('convertProgress', getProgress(taskId, filePath, outputFile, targetFileSize, 100, width, height));
            resolve(outputFile);
          });
        })
        .on('error', (err) => {
          e.sender.send('convertProgress', getProgress(taskId, filePath, outputFile, targetFileSize, -1, width, height));
          fs.rmSync(outputFile);
          reject(err);
        });

      commands[taskId].run();
    });
  });

  ipcMain.handle('mergeVideo', async (e, taskId: string, files: string[], options: any) => {
    if (files.length < 2) throw new Error('At least 2 videos are required to merge.');

    return new Promise(async (resolve, reject) => {
      const { format, separator, suffix, deleteSource } = options;
      let { filePath, width, height } = await getLowestQualityVideo(files); // lowest
      const outputFile = getOutputFilePath(filePath, format, separator, suffix);

      commands[taskId] = ffmpeg();
      files.forEach((file) => commands[taskId].input(file));

      if (isAbove720p(width, height)) {
        const resolution = getNewResolution('720p', width, height);
        e.sender.send('consoleLog', `Changing resolution from ${width}x${height} to ${resolution.width}x${resolution.height}`);

        width = resolution.width;
        height = resolution.height;
      }

      const totalDuration = await getTotalDuration(files);

      const filters = files.map((_, i) => {
        return `[${i}:v]scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[v${i}]`;
      });
      const filterGraph = [...filters, files.map((_, i) => `[v${i}][${i}:a]`).join('') + `concat=n=${files.length}:v=1:a=1[outv][outa]`];

      let targetFileSize = 0;
      commands[taskId]
        .complexFilter(filterGraph, ['outv', 'outa'])
        .outputOptions('-preset fast')
        .output(outputFile)
        .on('progress', (progress) => {
          const currentTime = parseTimemark(progress.timemark);
          const percent = Math.min((currentTime / totalDuration) * 100, 100);

          // const data = { ...progress, percent, width, height, file, size: progress.targetSize };
          // e.sender.send('consoleLog', `${percent.toFixed(2)}%`, `- Merging to ${data.width}x${data.height}`, data);

          targetFileSize = progress.targetSize;
          e.sender.send('convertProgress', getProgress(taskId, null, outputFile, targetFileSize, percent, width, height));
        })
        .on('end', () => {
          const { mtime } = fs.statSync(filePath);
          fs.utimes(outputFile, mtime, mtime, (err) => {
            if (err) return reject(err);

            e.sender.send('convertProgress', getProgress(taskId, null, outputFile, targetFileSize, 100, width, height));

            if (deleteSource && fs.existsSync(outputFile)) {
              for (const v of files) {
                if (fs.existsSync(v)) fs.unlinkSync(v);
              }
            }
            resolve(outputFile);
          });
        })
        .on('error', (err) => {
          e.sender.send('convertProgress', getProgress(taskId, null, outputFile, targetFileSize, -1, width, height));
          fs.rmSync(outputFile);
          reject(err);
        });

      commands[taskId].run();
    });
  });
}

function getProgress(taskId: string, file: string, outputFile: string, size: number, percent: number, width: number, height: number): VideoProgress {
  return { taskId, file, outputFile, size, percent, width, height, done: percent === 100 };
}

// FUNCTIONS
function getVideoMetadata(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      resolve({
        filePath,
        width: videoStream.width,
        height: videoStream.height,
        size: fs.statSync(filePath).size,
        bitrate: parseInt(videoStream.bit_rate || '0', 10),
      });
    });
  });
}

async function getLowestQualityVideo(files: string[]) {
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
  // const totalPixels = width * height;
  // const threshold = 1280 * 720;
  // return totalPixels > threshold;
  const isPortrait = height > width;
  return isPortrait ? width > 720 : height > 720;
}

function isAbove1080p(width: number, height: number) {
  // const totalPixels = width * height;
  // const threshold = 1920 * 1080;
  // return totalPixels > threshold;
  const isPortrait = height > width;
  return isPortrait ? width > 1080 : height > 1080;
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

async function getTotalDuration(files: string[]): Promise<number> {
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
