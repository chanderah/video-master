import { BrowserWindow } from 'electron';
import { exec } from 'child_process';

export default function handleIpcMainApi(ipcMain: Electron.IpcMain, mainWindow: BrowserWindow) {
  ipcMain.handle('exec', (_e, command: string) => {
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) reject(stderr || err.message);
        resolve(stdout);
      });
    });
  });

  // ipcMain.handle('scanDirectory', (_e, path) => {
  //   if (!path) path = app.getPath('home');
  //   try {
  //     return readdirSync(path, { withFileTypes: true })
  //       .map((v) => {
  //         const uri = `${path}/${v.name}`;
  //         const encodedUri = encodeURI(uri);
  //         const stat = statSync(uri);
  //         return {
  //           ...v,
  //           path,
  //           uri,
  //           encodedUri,
  //           isDirectory: v.isDirectory(),
  //           stat,
  //         };
  //       })
  //       .sort((a, b) => +b.isDirectory - +a.isDirectory);
  //   } catch (err) {
  //     mainWindow.webContents.send('errorToast', err);
  //     return [];
  //   }
  // });
  // ipcMain.handle('openFile', (_e, uri) => {
  //   return shell.openPath(uri);
  // });
}
