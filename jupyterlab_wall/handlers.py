import datetime
import json
import logging
import os

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

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
        self.finish(result)


class AlertHandler(APIHandler):
    def initialize(self, alerts, log=None) -> None:
        super().initialize()
        self.logger = log
        if log is None:
            self.logger = logging.getLogger(__file__)
        self._alerts = alerts

    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self, cache_buster=None):
        try:
            result = {"data": {}}
            for key in self._alerts:
                file_exists = os.path.exists(self._alerts[key]['watch_file'])
                start_time = datetime.datetime.fromtimestamp(0).isoformat()
                if file_exists:
                    start_time = (
                        datetime.datetime.fromtimestamp(os.stat(self._alerts[key]['watch_file']).st_mtime).isoformat())
                result["data"][key] = {
                    'priority': self._alerts[key]['priority'],
                    'message': self._alerts[key]['message'],
                    'active': file_exists,
                    'start': start_time
                }
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

        handlers = [
            (url_path_join(base_url, "jupyterlab_wall", "get_example"), ExampleHandler, dict(log=log)),
            (url_path_join(base_url, "jupyterlab_wall", "should_alert"), AlertHandler,
             dict(alerts=alerts, log=log))
            ]
        web_app.add_handlers(host_pattern, handlers)
    except Exception as e:
        if log is None:
            log = logging.getLogger(__file__)
        log.exception(e)
        raise
