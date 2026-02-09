// Polyfills for Jest environment when using @jupyterlab/testing FixJSDOMEnvironment

// File constructor (not provided by some JSDOM versions)
if (typeof (globalThis as any).File === 'undefined') {
  class FilePolyfill extends Blob {
    name: string;
    lastModified: number;

    constructor(chunks: BlobPart[], name: string, options?: FilePropertyBag) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  }
  (globalThis as any).File = FilePolyfill as any;
}

// TextEncoder / TextDecoder for older Node/JSDOM combos
// In Node 18+, these are available globally. If not, leave undefined (tests that need them can mock)
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  // no-op
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  // no-op
}

// ResizeObserver stub if needed by JupyterLab widgets
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  };
}
