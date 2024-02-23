// Basic locking mechanism to avoid race conditions
export class Mutex {
  private locked = false;

  lock(): Promise<void> {
    return new Promise(resolve => {
      if (this.locked) {
        setTimeout(() => this.lock().then(resolve), 100);
      } else {
        this.locked = true;
        resolve();
      }
    });
  }

  unlock(): void {
    this.locked = false;
  }
}
