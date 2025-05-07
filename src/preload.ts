import { contextBridge, ipcRenderer } from 'electron';

const toMain = {
  //   showNotification: (body: any, title?: string) => ipcRenderer.send('showNotification', body, title),
  //   sendMessage: (message: any) => ipcRenderer.send('sendMessage', message),
};

const toRenderer = {
  //   newMessage: (data?: any) => ipcRenderer.on('newMessage', (_e, args) => data(args)),
  //   showToast: (data: any) => ipcRenderer.on('showToast', (_e, args) => data(args)),
  //   dismissToast: (data: any) => ipcRenderer.on('dismissToast', (_e, args) => data(args)),
  //   infoToast: (data: any) => ipcRenderer.on('infoToast', (_e, args) => data(args)),
  //   successToast: (data: any) => ipcRenderer.on('successToast', (_e, args) => data(args)),
  //   errorToast: (data: any) => ipcRenderer.on('errorToast', (_e, args) => data(args)),
  //   applicationErrorToast: (data: any) => ipcRenderer.on('applicationErrorToast', (_e, args) => data(args)),
};

export const API = {
  ...toMain,
  ...toRenderer,
  invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),
  exec: (command: string) => ipcRenderer.invoke('exec', command),

  //   invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),
  //   scanDirectory: (path?: string) => ipcRenderer.invoke('scanDirectory', path),
  //   openFile: (uri: string) => ipcRenderer.invoke('openFile', uri),
};

contextBridge.exposeInMainWorld('api', API);
