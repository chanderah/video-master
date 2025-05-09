type AsyncTask<T> = () => Promise<T>;

export class TaskQueueService {
  private running: number = 0;
  private queue: (() => void)[] = [];

  constructor(private maxConcurrency: number) {}

  add<T = any>(task: AsyncTask<T> | Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        this.running++;
        try {
          const result = task instanceof Promise ? await task : await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.runNext();
        }
      };

      if (this.running < this.maxConcurrency) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  private runNext() {
    while (this.queue.length && this.running < this.maxConcurrency) {
      const next = this.queue.shift();
      next?.();
    }
  }
}
