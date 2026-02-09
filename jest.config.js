const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const esModules = [
  '@codemirror',
  '@jupyter',
  '@jupyterlab/',
  '@microsoft/fast-',
  'exenv-es6',
  'lib0',
  'nanoid',
  'vscode-ws-jsonrpc',
  'y-protocols',
  'y-websocket',
  'yjs'
].join('|');

const baseConfig = jestJupyterLab(__dirname);

module.exports = {
  ...baseConfig,
  automock: false,
  // Avoid scanning the prebuilt labextension output (has its own package.json)
  modulePathIgnorePatterns: ['<rootDir>/jupyterlab_wall/labextension'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/.ipynb_checkpoints/*'
  ],
  coverageReporters: ['lcov', 'text'],
  testRegex: 'tests/.*\\.spec\\.ts[x]?$',
  testPathIgnorePatterns: ['/ui-tests/'],
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`],
  // Ensure missing Web APIs are polyfilled for the JSDOM environment used by @jupyterlab/testing
  setupFilesAfterEnv: ['<rootDir>/tests/jest.polyfills.ts']
};
