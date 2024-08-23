import { expect, test } from '@jupyterlab/galata';

import { setTimeout } from 'timers/promises';
import { open, rm } from 'fs/promises';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 */
test.use({ autoGoto: false });

test('should emit an activation console message', async ({ page }) => {
  const logs: string[] = [];

  page.on('console', message => {
    logs.push(message.text());
  });

  await page.goto();

  try {
    expect(
      logs.filter(
        s => s === 'JupyterLab extension jupyterlab-wall is activated!'
      )
    ).toHaveLength(1);
  } catch (e) {
    console.error(logs);
  }
});

test('should not create an alert', async ({ page }) => {
  const logs: string[] = [];
  await page.goto();

  try {
    let headers = await page.locator('.jp-jupyterlab-wall-header').count();
    if (headers === 0) {
      logs.push('No alerts message');
    } else {
      logs.push('Received alerts message');
    }
  } catch (e) {
    console.log(e);
  }

  expect(logs.filter(s => s === 'No alerts message')).toHaveLength(1);

  // TODO - check for notification
});

async function trigger_alert() {
  let fh;
  try {
    fh = await open('shutdown_test', 'w');
    fh.write('Test shutdown alert');
  } finally {
    fh?.close();
  }
}

async function cleanup_trigger() {
  try {
    rm('shutdown_test');
  } catch (e) {
    console.log(e);
  }
}

/*
test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);

  if (testInfo.status !== testInfo.expectedStatus)
    console.log(`Did not run as expected, ended up at ${page.url()}`);
});
*/

test('should create an alert', async ({ page }) => {
  const logs: string[] = [];
  await trigger_alert();
  await page.goto();
  await setTimeout(5000);

  try {
    let headers = await page.locator('.jp-jupyterlab-wall-header').count();
    if (headers === 0) {
      logs.push('No alerts message');
    } else {
      logs.push('Received alerts message');
    }
  } catch (e) {
    console.log(e);
  }

  await cleanup_trigger();
  expect(logs.filter(s => s === 'Received alerts message')).toHaveLength(1);

  // TODO - check for notification
});

test('should get an alert for each new tab', async ({ page }) => {
  test.fixme();
  const logs: string[] = [];
  await trigger_alert();
  await page.goto();
  await setTimeout(5000);

  try {
    let headers = await page.locator('.jp-jupyterlab-wall-header').count();
    if (headers === 0) {
      logs.push('No alerts message');
    } else {
      logs.push('Received alerts message');
    }
  } catch (e) {
    console.log(e);
  }

  expect(logs.filter(s => s === 'Received alerts message')).toHaveLength(1);

  // TODO - opem new launcher
  page.locator('');

  // TODO - open new terminal
  page.locator('');

  // TODO - open new console
  page.locator('');

  // TODO - open new notebook
  page.locator('');
  await cleanup_trigger();
});

test('closing alert should not reopen if switching taba', async ({ page }) => {
  test.fixme();
  const logs: string[] = [];
  await trigger_alert();
  await page.goto();
  await setTimeout(5000);

  try {
    let headers = await page.locator('.jp-jupyterlab-wall-header').count();
    if (headers === 0) {
      logs.push('No alerts message');
    } else {
      logs.push('Received alerts message');
    }
  } catch (e) {
    console.log(e);
  }

  expect(logs.filter(s => s === 'Received alerts message')).toHaveLength(1);
  await cleanup_trigger();
});
