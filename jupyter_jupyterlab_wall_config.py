c.AlertsConfig.alerts = {
    "shutdown_alert": {
        "message": "This node is about to be shut down.  Save your work and start a new server from the hub now.",
        "watch_file": "/tmp/shutdown_test",
        "priority": 1
    },
    "job_ending_alert": {
        "message": "Your job is ending.",
        "watch_file": "/tmp/job_test",
        "priority": 2
    },
    "disk_quota_alert": {
        "message": "Your disk quota is almost full.",
        "watch_file": "/tmp/quota_test",
        "priority": 3
    }
}
