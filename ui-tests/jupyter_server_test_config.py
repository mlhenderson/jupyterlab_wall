"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""
from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)

c.AlertsConfig.alerts = {
    "shutdown_alert": {
        "message": "This node is about to be shut down.  Save your work and start a new server from the hub now.",
        "watch_file": "shutdown_test",
        "priority": 1
    },
    "job_ending_alert": {
        "message": "Your job is ending.",
        "watch_file": "job_test",
        "priority": 2
    },
    "disk_quota_alert": {
        "message": "Your disk quota is almost full.",
        "watch_file": "quota_test",
        "priority": 3
    }
}

# Uncomment to set server log level to debug level
c.ServerApp.log_level = "DEBUG"
c.ServerApp.token = ''
