import logging
import json
import os.path as osp

from ._version import __version__
from .config import AlertsConfig

logger = logging.getLogger(__file__)
HERE = osp.abspath(osp.dirname(__file__))

try:
    with open(osp.join(HERE, 'labextension', 'package.json')) as fid:
        data = json.load(fid)
except Exception as e:
    logger.exception(e)

def _jupyter_labextension_paths():
    return [{
        'src': 'labextension',
        'dest': data['name']
    }]

from .handlers import setup_handlers

def _jupyter_server_extension_points():
    return [{
        "module": "jupyterlab_wall"
    }]

def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    lab_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    try:
        logger.debug('jupyterlab_wall server extension loading\n')
        config = AlertsConfig(parent=server_app)
        data = config.get_alerts_config()
        server_app.web_app.settings.update({'alerts': data})
        setup_handlers(server_app.web_app, logger)
        name = "jupyterlab_wall"
        server_app.log.info(f"Registered {name} server extension")
    except Exception as e:
        logger.exception(e)
