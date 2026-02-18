"""Tests for the pocketbot WebSocket chat endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from nanobot.bus.queue import MessageBus
from nanobot.config.schema import Config, WebAuthConfig, WebConfig
from nanobot.web.server import create_app


def _make_config(auth_enabled: bool = False, token: str = "secret") -> Config:
    cfg = Config()
    cfg.web = WebConfig(
        enabled=True,
        host="localhost",
        port=8080,
        auth=WebAuthConfig(enabled=auth_enabled, token=token),
    )
    return cfg


def _make_client(config: Config | None = None) -> TestClient:
    bus = MessageBus()
    app = create_app(bus, agent_loop=None, config=config)
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# WebSocket connection tests
# ---------------------------------------------------------------------------

class TestWebSocketConnect:
    def test_ws_connects_and_receives_welcome(self):
        client = _make_client(_make_config())
        with client.websocket_connect("/ws/chat") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "connected"
            assert "session_id" in msg

    def test_ws_session_id_is_short_string(self):
        client = _make_client(_make_config())
        with client.websocket_connect("/ws/chat") as ws:
            msg = ws.receive_json()
            sid = msg["session_id"]
            assert isinstance(sid, str)
            assert len(sid) > 0

    def test_ws_no_auth_required_when_disabled(self):
        client = _make_client(_make_config(auth_enabled=False))
        with client.websocket_connect("/ws/chat") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "connected"

    def test_ws_auth_with_valid_token(self):
        client = _make_client(_make_config(auth_enabled=True, token="tok123"))
        with client.websocket_connect("/ws/chat?token=tok123") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "connected"

    def test_ws_auth_rejected_with_wrong_token(self):
        from starlette.websockets import WebSocketDisconnect
        client = _make_client(_make_config(auth_enabled=True, token="correct"))
        # TestClient is non-local, so wrong token → close(4001)
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect("/ws/chat?token=wrong"):
                pass
        assert exc_info.value.code == 4001

    def test_ws_no_config(self):
        client = _make_client(config=None)
        with client.websocket_connect("/ws/chat") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "connected"


# ---------------------------------------------------------------------------
# WebSocket message sending
# ---------------------------------------------------------------------------

class TestWebSocketMessages:
    def test_ws_send_ping_no_crash(self):
        client = _make_client(_make_config())
        with client.websocket_connect("/ws/chat") as ws:
            ws.receive_json()  # welcome
            ws.send_json({"type": "ping"})
            # Server may or may not send a pong — just verify no crash
            # We close cleanly
            ws.close()

    def test_ws_send_message_type(self):
        """Sending a message should not crash the server."""
        client = _make_client(_make_config())
        with client.websocket_connect("/ws/chat") as ws:
            ws.receive_json()  # welcome
            ws.send_json({"type": "message", "content": "hello"})
            # The agent loop is None so no response is expected,
            # but the server should not crash
            ws.close()

    def test_ws_send_invalid_json_no_crash(self):
        """Invalid JSON from client should be handled gracefully."""
        client = _make_client(_make_config())
        with client.websocket_connect("/ws/chat") as ws:
            ws.receive_json()  # welcome
            ws.send_text("not json at all")
            ws.close()

    def test_ws_multiple_sessions_independent(self):
        """Two concurrent WS connections should get different session IDs."""
        client = _make_client(_make_config())
        with client.websocket_connect("/ws/chat") as ws1:
            with client.websocket_connect("/ws/chat") as ws2:
                msg1 = ws1.receive_json()
                msg2 = ws2.receive_json()
                assert msg1["session_id"] != msg2["session_id"]


# ---------------------------------------------------------------------------
# WebSocket connection count
# ---------------------------------------------------------------------------

class TestWebSocketConnectionCount:
    def test_status_shows_connection_count(self):
        client = _make_client(_make_config())
        # Before connecting
        r0 = client.get("/api/status")
        count_before = r0.json()["connections"]

        with client.websocket_connect("/ws/chat") as ws:
            ws.receive_json()  # welcome
            r1 = client.get("/api/status")
            count_during = r1.json()["connections"]
            assert count_during == count_before + 1

        # After disconnect
        r2 = client.get("/api/status")
        assert r2.json()["connections"] == count_before
