import { contextBridge, ipcRenderer } from 'electron';

const toMain = {
  //   showNotification: (body: any, title?: string) => ipcRenderer.send('showNotification', body, title),
  //   sendMessage: (message: any) => ipcRenderer.send('sendMessage', message),
};

const toRenderer = {
  //   newMessage: (callback?: any) => ipcRenderer.on('newMessage', (_e, args) => callback(args)),
  //   showToast: (callback: any) => ipcRenderer.on('showToast', (_e, args) => callback(args)),
  //   dismissToast: (callback: any) => ipcRenderer.on('dismissToast', (_e, args) => callback(args)),
  //   infoToast: (callback: any) => ipcRenderer.on('infoToast', (_e, args) => callback(args)),
  //   successToast: (callback: any) => ipcRenderer.on('successToast', (_e, args) => callback(args)),
  //   errorToast: (callback: any) => ipcRenderer.on('errorToast', (_e, args) => callback(args)),
  //   applicationErrorToast: (callback: any) => ipcRenderer.on('applicationErrorToast', (_e, args) => callback(args)),

  consoleLog: (callback: (...args: any[]) => void) => ipcRenderer.on('consoleLog', (_e, ...args: any[]) => callback(...args)),
};

export const API = {
  ...toMain,
  ...toRenderer,
  receive: (channel: string, callback: (...args: any[]) => void) => {
    // const validChannels = ['convertProgress', 'someOtherEvent'];
    ipcRenderer.on(channel, (_e, ...args) => callback(...args));
  },
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  exec: (command: string) => ipcRenderer.invoke('exec', command),
  scanDirectory: (path: string, extensions: string[] = []) => ipcRenderer.invoke('scanDirectory', path, extensions),
  getThumbnail: (uri: string) => ipcRenderer.invoke('getThumbnail', uri),
  getFileStat: (uri: string) => ipcRenderer.invoke('getFileStat', uri),
  convertVideo: (filePath: string, options: any) => ipcRenderer.invoke('convertVideo', filePath, options),
  mergeVideo: (files: string[], options: any, deleteSource: boolean = false) => ipcRenderer.invoke('mergeVideo', files, options, deleteSource),

  //   invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),
  //   openFile: (uri: string) => ipcRenderer.invoke('openFile', uri),
};

contextBridge.exposeInMainWorld('api', API);
