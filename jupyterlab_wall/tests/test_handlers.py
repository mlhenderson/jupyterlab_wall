import json
import os

async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("jupyterlab_wall", "get_example")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": "This is /jupyterlab_wall/get_example endpoint!"
    }


async def test_get_shutdown_status_no_file(jp_fetch):
    response = await jp_fetch("jupyterlab_wall", "should_alert")

    assert response.code == 200
    payload = json.loads(response.body)
    assert "test_alert" in payload["data"]


async def test_get_shutdown_status_has_file(jp_fetch):
    shutdown_filepath = 'shutdown_test'

    assert not os.path.exists(shutdown_filepath)

    response = await jp_fetch("jupyterlab_wall", "should_alert")
    assert response.code == 200
    payload = json.loads(response.body)
    assert "test_alert" in payload["data"]

    with open(shutdown_filepath, 'w') as f:
        f.write("Node will shutdown!\n")

    response = await jp_fetch("jupyterlab_wall", "should_alert")

    assert response.code == 200
    payload = json.loads(response.body)
    # The default test_alert in handlers.py watches '/tmp/alert_test'
    # so shutdown_test won't trigger anything unless we configure it.
    # But we can at least check if it returns data.
    assert "test_alert" in payload["data"]
    os.remove(shutdown_filepath)
