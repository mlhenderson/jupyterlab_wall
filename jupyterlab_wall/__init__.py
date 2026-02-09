import logging

try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings
    warnings.warn("Importing 'jupyterlab_wall' outside a proper installation.")
    __version__ = "dev"
from .config import AlertsConfig
from .handlers import setup_handlers

logger = logging.getLogger(__file__)

def _jupyter_labextension_paths():
    return [{
        'src': 'labextension',
        'dest': 'jupyterlab_wall'
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
    server_app: jupyterlab.labapp.LabApp
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
