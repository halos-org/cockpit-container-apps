"""
Unit tests for the update command.
"""

import json
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from cockpit_container_apps.commands import update
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError


class TestUpdate:
    """Tests for update command."""

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_successful_update(self, mock_popen, capsys):
        """Test successful apt-get update with progress output."""
        mock_process = MagicMock()
        mock_process.stdout.__iter__ = MagicMock(
            return_value=iter(
                [
                    "Hit:1 http://deb.debian.org/debian trixie InRelease\n",
                    "Get:2 http://deb.debian.org/debian trixie-updates InRelease\n",
                ]
            )
        )
        mock_process.stdout.readline = MagicMock(
            side_effect=[
                "Hit:1 http://deb.debian.org/debian trixie InRelease\n",
                "Get:2 http://deb.debian.org/debian trixie-updates InRelease\n",
                "",
            ]
        )
        mock_process.returncode = 0
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process

        result = update.execute()

        assert result is None
        captured = capsys.readouterr()
        lines = [json.loads(line) for line in captured.out.strip().split("\n") if line.strip()]

        # Should have progress lines + final progress + final result
        assert any(line.get("type") == "progress" for line in lines)
        assert lines[-1]["success"] is True

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_network_error(self, mock_popen):
        """Test error handling for network failures."""
        mock_process = MagicMock()
        mock_process.stdout.readline = MagicMock(
            side_effect=[
                "Err:1 http://deb.debian.org/debian trixie InRelease\n",
                "  Could not resolve 'deb.debian.org'\n",
                "",
            ]
        )
        mock_process.returncode = 100
        mock_process.wait.return_value = 100
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            update.execute()

        assert exc_info.value.code == "NETWORK_ERROR"

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_dpkg_interrupted(self, mock_popen):
        """Test error handling when dpkg is interrupted."""
        mock_process = MagicMock()
        mock_process.stdout.readline = MagicMock(
            side_effect=[
                "E: dpkg was interrupted\n",
                "",
            ]
        )
        mock_process.returncode = 100
        mock_process.wait.return_value = 100
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            update.execute()

        assert exc_info.value.code == "LOCKED"

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_generic_failure(self, mock_popen):
        """Test error handling for generic apt-get update failures."""
        mock_process = MagicMock()
        mock_process.stdout.readline = MagicMock(
            side_effect=[
                "E: Some unknown error\n",
                "",
            ]
        )
        mock_process.returncode = 1
        mock_process.wait.return_value = 1
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            update.execute()

        assert exc_info.value.code == "UPDATE_FAILED"
        assert "Some unknown error" in (exc_info.value.details or "")

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_timeout(self, mock_popen):
        """Test that subprocess timeout raises TIMEOUT error."""
        mock_process = MagicMock()
        mock_process.stdout.readline = MagicMock(return_value="")
        # First wait() call raises TimeoutExpired; second (after kill) succeeds
        mock_process.wait.side_effect = [
            subprocess.TimeoutExpired(cmd="apt-get update", timeout=300),
            None,
        ]
        mock_process.kill.return_value = None
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            update.execute()

        assert exc_info.value.code == "TIMEOUT"
        mock_process.kill.assert_called_once()

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_progress_percentage_calculation(self, mock_popen, capsys):
        """Test that progress percentages are calculated correctly."""
        mock_process = MagicMock()
        mock_process.stdout.readline = MagicMock(
            side_effect=[
                "Hit:1 http://repo1 trixie InRelease\n",
                "Get:2 http://repo2 trixie InRelease\n",
                "Hit:3 http://repo3 trixie InRelease\n",
                "Get:4 http://repo4 trixie InRelease\n",
                "",
            ]
        )
        mock_process.returncode = 0
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process

        update.execute()

        captured = capsys.readouterr()
        progress_lines = [
            json.loads(line)
            for line in captured.out.strip().split("\n")
            if line.strip() and json.loads(line).get("type") == "progress"
        ]

        # Last progress before final should be 100%
        assert progress_lines[-1]["percentage"] == 100

    @patch("cockpit_container_apps.commands.update.subprocess.Popen")
    def test_unexpected_exception(self, mock_popen):
        """Test that unexpected exceptions are wrapped in APTBridgeError."""
        mock_popen.side_effect = OSError("Permission denied")

        with pytest.raises(APTBridgeError) as exc_info:
            update.execute()

        assert exc_info.value.code == "INTERNAL_ERROR"
        assert "Permission denied" in (exc_info.value.details or "")
