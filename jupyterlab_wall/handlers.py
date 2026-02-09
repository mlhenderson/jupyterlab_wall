import datetime
import json
import logging
import os
import threading
import time

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

class BackgroundPoller:
    """A background poller that checks file status without blocking the main loop."""

    def __init__(self, alerts, log=None, interval=5):
        self._alerts = alerts
        self.logger = log or logging.getLogger(__name__)
        self._interval = interval
        self._cache = {"data": {}}
        self._running = False
        self._is_polling = False
        self._thread = None

        # Initialize cache with default state
        self._update_cache()

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        self.logger.info("Background poller started.")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=1)

    def get_data(self):
        return self._cache

    def _run(self):
        while self._running:
            if not self._is_polling:
                try:
                    self._is_polling = True
                    self._update_cache()
                except Exception as e:
                    self.logger.error(f"Error in background poller: {e}")
                finally:
                    self._is_polling = False
            time.sleep(self._interval)

    def _update_cache(self):
        new_data = {}
        for key, config in self._alerts.items():
            watch_file = config.get('watch_file')
            try:
                # Use a small timeout-like approach if possible, but os.path.exists is blocking.
                # The _is_polling flag ensures we don't stack up threads if one hangs.
                file_exists = os.path.exists(watch_file)
                start_time = datetime.datetime.fromtimestamp(0).isoformat()
                if file_exists:
                    try:
                        mtime = os.stat(watch_file).st_mtime
                        start_time = datetime.datetime.fromtimestamp(mtime).isoformat()
                    except Exception:
                        # File might have been deleted between exists and stat
                        file_exists = False

                new_data[key] = {
                    'priority': config.get('priority', 10),
                    'message': config.get('message', ''),
                    'active': file_exists,
                    'start': start_time
                }
            except Exception as e:
                # Log once per error type to avoid spamming if filesystem is down
                self.logger.debug(f"Failed to check alert file {watch_file}: {e}")
                new_data[key] = {
                    'priority': config.get('priority', 10),
                    'message': config.get('message', ''),
                    'active': False,
                    'start': datetime.datetime.fromtimestamp(0).isoformat()
                }
        self._cache = {"data": new_data}

class ExampleHandler(APIHandler):
    def initialize(self, log=None):
        super().initialize()
        self.logger = log
        if log is None:
            self.logger = logging.getLogger(__file__)

    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self, cache_buster=None):
        result = {
            "data": "This is /jupyterlab_wall/get_example endpoint!"
        }
        self.finish(json.dumps(result))


class AlertHandler(APIHandler):
    def initialize(self, poller, log=None) -> None:
        super().initialize()
        self.logger = log or logging.getLogger(__name__)
        self._poller = poller

    @tornado.web.authenticated
    def get(self, cache_buster=None):
        try:
            result = self._poller.get_data()
            self.finish(json.dumps(result))
        except Exception as e:
            self.logger.exception(e)
            self.finish(json.dumps({"data": {}}))

def setup_handlers(web_app, log=None):
    try:
        host_pattern = ".*$"

        if log is None:
            log = logging.getLogger(__file__)

        base_url = web_app.settings["base_url"]
        alerts = web_app.settings["alerts"]

        if len(alerts) == 0:
            log.warning('No alerts were configured! Adding sample test_alert config.')
            alerts = {
                "test_alert": {
                    "message": 'This is a test!', "watch_file": '/tmp/alert_test', "priority": 1}}

        log.info('Registered endpoint: {}'.format(url_path_join(base_url, "jupyterlab_wall", "get_example")))

        poller = BackgroundPoller(alerts, log=log)
        poller.start()
        # Store poller in settings so it can be shut down if needed
        web_app.settings['jupyterlab_wall_poller'] = poller

        handlers = [
            (url_path_join(base_url, "jupyterlab_wall", "get_example"), ExampleHandler, dict(log=log)),
            (url_path_join(base_url, "jupyterlab_wall", "should_alert"), AlertHandler,
             dict(poller=poller, log=log))
            ]
        web_app.add_handlers(host_pattern, handlers)
    except Exception as e:
        if log is None:
            log = logging.getLogger(__file__)
        log.exception(e)
        raise
