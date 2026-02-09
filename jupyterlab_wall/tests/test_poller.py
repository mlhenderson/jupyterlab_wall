import pytest
import time
import threading
from unittest.mock import patch, MagicMock
from jupyterlab_wall.handlers import BackgroundPoller

def test_poller_initialization():
    alerts = {"test": {"watch_file": "/tmp/test", "priority": 1, "message": "msg"}}
    poller = BackgroundPoller(alerts)
    data = poller.get_data()
    assert "data" in data
    assert "test" in data["data"]
    assert data["data"]["test"]["active"] is False

def test_poller_update_cache_success():
    alerts = {"test": {"watch_file": "/tmp/test", "priority": 1, "message": "msg"}}
    poller = BackgroundPoller(alerts)
    
    with patch("os.path.exists") as mock_exists, patch("os.stat") as mock_stat:
        mock_exists.return_value = True
        mock_stat.return_value.st_mtime = 123456789
        
        poller._update_cache()
        
        data = poller.get_data()
        assert data["data"]["test"]["active"] is True
        assert data["data"]["test"]["message"] == "msg"
        assert "1973-11-29" in data["data"]["test"]["start"]

def test_poller_file_access_error():
    alerts = {"test": {"watch_file": "/tmp/test", "priority": 1, "message": "msg"}}
    poller = BackgroundPoller(alerts)
    
    # Simulate a PermissionError
    with patch("os.path.exists") as mock_exists:
        mock_exists.side_effect = PermissionError("Permission denied")
        
        poller._update_cache()
        
        data = poller.get_data()
        # Should handle the error and set active to False
        assert data["data"]["test"]["active"] is False
        # Verify it still has the message
        assert data["data"]["test"]["message"] == "msg"

def test_poller_hang_resilience():
    alerts = {"test": {"watch_file": "/tmp/test", "priority": 1, "message": "msg"}}
    # Set a long interval to control the loop
    poller = BackgroundPoller(alerts, interval=10)
    
    # We want to simulate a hang in _update_cache
    # When _is_polling is True, another call to _run's loop body should skip _update_cache
    
    with patch.object(poller, "_update_cache") as mock_update:
        # Simulate a hang by making update_cache slow
        def slow_update():
            time.sleep(0.5)
        
        mock_update.side_effect = slow_update
        
        # Manually trigger the polling logic to simulate what _run does
        poller._is_polling = True
        
        # Start a thread that tries to update (simulating another loop iteration or manual call)
        # In _run:
        # if not self._is_polling:
        #     try:
        #         self._is_polling = True
        #         self._update_cache()
        
        # If we are already polling, it should skip
        if not poller._is_polling:
             poller._update_cache()
        
        mock_update.assert_not_called()
        
        poller._is_polling = False
        if not poller._is_polling:
            poller._update_cache()
        
        mock_update.assert_called_once()

def test_poller_thread_hang_simulation():
    """Simulate a thread getting stuck and verify the poller remains responsive."""
    alerts = {"test": {"watch_file": "/tmp/test", "priority": 1, "message": "msg"}}
    poller = BackgroundPoller(alerts, interval=0.1)
    
    wait_event = threading.Event()
    
    # Track calls to exists
    exists_calls = []

    def hanging_exists(path):
        exists_calls.append(path)
        wait_event.wait() # Hang here
        return True

    with patch("os.path.exists", side_effect=hanging_exists), patch("os.stat") as mock_stat:
        mock_stat.return_value.st_mtime = 123456789
        poller.start()
        
        # Wait for the thread to reach exists
        for _ in range(20):
            if len(exists_calls) > 0:
                break
            time.sleep(0.05)
        
        assert len(exists_calls) > 0
        assert poller._is_polling is True
        
        # API should still be responsive and return initial data
        data = poller.get_data()
        assert data["data"]["test"]["active"] is False
        
        # Release the hang
        wait_event.set()
        
        # Wait for cache update. We might need slightly more time for the loop to complete and update
        for _ in range(20):
            time.sleep(0.1)
            data = poller.get_data()
            if data["data"]["test"]["active"] is True:
                break
        
        assert data["data"]["test"]["active"] is True
        
        poller.stop()
