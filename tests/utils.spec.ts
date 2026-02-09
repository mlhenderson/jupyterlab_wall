import { Mutex } from '../src/utils';

describe('Mutex', () => {
  it('should allow locking and unlocking', async () => {
    const mutex = new Mutex();
    await mutex.lock();
    // Successfully locked
    mutex.unlock();
    // Successfully unlocked
    await mutex.lock();
    // Should be able to lock again
    mutex.unlock();
  });

  it('should prevent concurrent access', async () => {
    const mutex = new Mutex();
    let counter = 0;

    const task = async () => {
      await mutex.lock();
      const current = counter;
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 50));
      counter = current + 1;
      mutex.unlock();
    };

    await Promise.all([task(), task(), task()]);
    expect(counter).toBe(3);
  });
});
