interface FfmpegProgressEvent {
  frames?: number;
  currentFps?: number;
  currentKbps?: number;
  targetSize?: number;
  timemark?: string;
  percent?: number | undefined;
}

export interface VideoProgress extends FfmpegProgressEvent {
  running?: boolean;
  taskId: string;
  file: string;
  outputFile: string;
  size: number;
  percent: number;
  done?: boolean;
  width: number;
  height: number;
}
