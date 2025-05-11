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
  openFile: (...args: any[]) => ipcRenderer.invoke('openFile', ...args),
  scanDirectory: (...args: any[]) => ipcRenderer.invoke('scanDirectory', ...args),
  getThumbnail: (...args: any[]) => ipcRenderer.invoke('getThumbnail', ...args),
  getFileStat: (...args: any[]) => ipcRenderer.invoke('getFileStat', ...args),
  convertVideo: (...args: any[]) => ipcRenderer.invoke('convertVideo', ...args),
  mergeVideo: (...args: any[]) => ipcRenderer.invoke('mergeVideo', ...args),
  stopFfmpeg: (...args: any[]) => ipcRenderer.invoke('stopFfmpeg', ...args),

  //   invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),
  //   openFile: (uri: string) => ipcRenderer.invoke('openFile', uri),
};

contextBridge.exposeInMainWorld('api', API);
