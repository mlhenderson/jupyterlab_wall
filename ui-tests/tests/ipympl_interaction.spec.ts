import { expect, test } from '@jupyterlab/galata';
import { open, rm } from 'fs/promises';

test.use({ autoGoto: false });

test.describe('ipympl interaction', () => {
  test.beforeEach(async ({ page }) => {
    await cleanup_trigger();
    await page.goto();
    await page.evaluate(() => {
      if (window.jupyterapp && window.jupyterapp.restorer) {
        window.jupyterapp.restorer.state.remove('jupyterlab-wall:activeAlerts');
        window.jupyterapp.restorer.state.remove(
          'jupyterlab-wall:dismissedAlerts'
        );
      }
    });
    await page.reload();

    await trigger_alert();
    // Wait for the poller
    await page.waitForTimeout(7000);
  });

  test.afterEach(async ({ page }) => {
    await cleanup_trigger();
  });

  test('should not block mouse events on the page when alert is shown', async ({
    page
  }) => {
    await page.goto();

    // Verify alert header is visible
    const header = page.locator('.jp-jupyterlab-wall-header');
    await expect(header).toBeVisible({ timeout: 15000 });

    // Verify the header message has pointer-events: none
    const headerMessage = page.locator('.jp-jupyterlab-wall-header-message');
    const pointerEvents = await headerMessage.evaluate(
      el => window.getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe('none');

    // Check if any element from jupyterlab-wall is blocking the center of the viewport
    const elementAtPoint = await page.evaluate(() => {
      const el = document.elementFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      );
      return el
        ? {
            className: el.className,
            tagName: el.tagName,
            id: el.id,
            pointerEvents: window.getComputedStyle(el).pointerEvents
          }
        : null;
    });
    console.log('Element at viewport center:', elementAtPoint);

    // In a conflict, elementAtPoint might be the wall header message.
    // If it is, its pointer-events should be 'none'.
    if (
      elementAtPoint &&
      elementAtPoint.className.includes('jp-jupyterlab-wall')
    ) {
      expect(elementAtPoint.pointerEvents).toBe('none');
    }
  });
});

async function trigger_alert(name = 'shutdown_test') {
  let fh;
  try {
    fh = await open(name, 'w');
    await fh.write('Trigger alert: ' + name);
  } finally {
    await fh?.close();
  }
}

async function cleanup_trigger(name = 'shutdown_test') {
  try {
    await rm(name);
  } catch (e) {
    // ignore
  }
}
