type AsyncTask<T> = () => Promise<T>;
interface Task {
  id: string;
  run: () => void;
}

export class TaskQueueService {
  private running: number = 0;
  private queue: Task[] = [];

  constructor(private maxConcurrency: number) {}

  add<T = any, R = any>(task: AsyncTask<T>, taskId: string = this.generateTaskId()) {
    let resolveFn!: (res: T) => void;
    let rejectFn!: (err: R) => void;
    const promise = new Promise<T>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const run = async () => {
      this.running++;
      try {
        const result = await task();
        resolveFn(result);
      } catch (err) {
        rejectFn(err);
      } finally {
        this.running--;
        this.runNext();
      }
    };

    const q: Task = { id: taskId, run };
    if (this.running < this.maxConcurrency) {
      run();
    } else {
      this.queue.push(q);
    }
    return { id: taskId, promise };
  }

  remove(id: string) {
    const i = this.queue.findIndex((v) => v.id === id);
    if (i > -1) {
      this.queue.splice(i, 1);
      return true;
    }
    return false;
  }

  private runNext() {
    while (this.queue.length && this.running < this.maxConcurrency) {
      const next = this.queue.shift();
      next?.run();
    }
  }

  public generateTaskId() {
    return crypto.randomUUID();
  }
}
