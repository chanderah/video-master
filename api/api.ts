import { BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

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

  // ipcMain.handle('scanDirectory', (_e, path, queries: string[] = []) => {
  //   function scan(path: string): any[] {
  //     const entries = readdirSync(path, { withFileTypes: true });

  //     return entries.map((entry) => {
  //       const uri = join(path, entry.name);
  //       const encodedUri = encodeURI(uri);
  //       const stat = statSync(uri);

  //       const data = {
  //         ...entry,
  //         path,
  //         uri,
  //         encodedUri,
  //         isDirectory: entry.isDirectory(),
  //         stat,
  //       };

  //       if (entry.isDirectory()) {
  //         return scan(uri);
  //       }

  //       const lowerName = entry.name?.toLowerCase() ?? '';
  //       if (!queries || queries.some((q) => lowerName.includes(q.toLowerCase()))) {
  //         return [data];
  //       }

  //       return [];
  //     });
  //   }

  //   const result = scan(path);
  //   return result.sort((a, b) => +b.isDirectory - +a.isDirectory);
  // });

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
    if (!fs.existsSync(uri)) {
      throw new Error('File not found');
    }

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

  ipcMain.handle('convertVideo', async (e, filePath: string, options: any) => {
    const { format, quality, separator, suffix } = options;

    const originalDir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const newName = baseName + separator + new Date().getTime() + separator + suffix + '.' + format;
    const outputFile = path.join(originalDir, newName);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(filePath)
        .output(outputFile)
        .on('progress', (progress) => {
          e.sender.send('convertProgress', {
            file: filePath,
            percent: progress.percent,
            time: progress.timemark,
          });
        })
        .on('end', () => {
          e.sender.send('convertProgress', {
            file: filePath,
            done: true,
            percent: 100,
            output: outputFile,
          });
          resolve(outputFile);
        })
        .on('error', (err) => {
          e.sender.send('convertProgress', {
            file: filePath,
            percent: 0,
            error: err.message,
          });
          reject(err);
        });

      ffmpeg.ffprobe(filePath, (_err, data) => {
        // if (err) return
        const { width, height } = data.streams[0];
        const isPortrait = height > width;

        if ((isPortrait && height <= 720) || (!isPortrait && width <= 720)) {
          return resolve(filePath);
        }

        // W x H
        if (quality === '1080p') {
          command.size(isPortrait ? '?x1080' : '1920x?');
        } else {
          command.size(isPortrait ? '?x720' : '1280x?');
        }

        console.log('before', filePath, width, height);
        command.run();
      });
    });
  });

  // ipcMain.handle('openFile', (_e, uri) => {
  //   return shell.openPath(uri);
  // });
}
