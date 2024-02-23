import json
import os

async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("jupyterlab-wall", "get-example")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": "This is /jupyterlab-wall/get-example endpoint!"
    }


async def test_get_shutdown_status_no_file(jp_fetch):
    response = await jp_fetch("jupyterlab-wall", "will_shutdown")

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": False
        }


async def test_get_shutdown_status_has_file(jp_fetch):
    shutdown_filepath = 'shutdown_test'

    assert not os.path.exists(shutdown_filepath)

    response = await jp_fetch("jupyterlab-wall", "will_shutdown")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": False
        }

    with open(shutdown_filepath, 'w') as f:
        f.write("Node will shutdown!\n")

    response = await jp_fetch("jupyterlab-wall", "will_shutdown")

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": True
        }
    os.remove(shutdown_filepath)
