"""
Unit tests for service_journal command.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from cockpit_container_apps.commands import service_journal
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError


def _make_mock_process(lines: list[str]) -> MagicMock:
    """Create a mock Popen process with given stdout lines."""
    mock_process = MagicMock()
    mock_stdout = MagicMock()
    mock_stdout.__iter__ = MagicMock(return_value=iter(lines))
    mock_process.stdout = mock_stdout
    mock_process.stderr = MagicMock()
    mock_process.terminate = MagicMock()
    mock_process.wait = MagicMock()
    return mock_process


class TestServiceJournal:
    """Tests for service_journal command."""

    def test_validate_package_name(self):
        """Test that invalid package names are rejected."""
        with pytest.raises(APTBridgeError):
            service_journal.execute("../evil")

    def test_empty_package_name(self):
        """Test that empty package names are rejected."""
        with pytest.raises(APTBridgeError):
            service_journal.execute("")

    def test_invalid_line_count_zero(self):
        """Test that zero line count is rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            service_journal.execute("test-package", lines=0)
        assert exc_info.value.code == "INVALID_INPUT"

    def test_invalid_line_count_negative(self):
        """Test that negative line count is rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            service_journal.execute("test-package", lines=-1)
        assert exc_info.value.code == "INVALID_INPUT"

    def test_invalid_line_count_too_large(self):
        """Test that excessively large line count is rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            service_journal.execute("test-package", lines=10001)
        assert exc_info.value.code == "INVALID_INPUT"

    @patch("cockpit_container_apps.commands.service_journal.subprocess.Popen")
    def test_streams_journal_lines(self, mock_popen, capsys):
        """Test that journal lines are streamed as JSON."""
        mock_popen.return_value = _make_mock_process([
            "Starting test-package.service\n",
            "Container test  Created\n",
        ])

        service_journal.execute("test-package", lines=10)

        captured = capsys.readouterr()
        lines = [json.loads(entry) for entry in captured.out.strip().split("\n")]

        assert len(lines) == 2
        assert lines[0] == {"type": "journal", "line": "Starting test-package.service"}
        assert lines[1] == {"type": "journal", "line": "Container test  Created"}

    @patch("cockpit_container_apps.commands.service_journal.subprocess.Popen")
    def test_strips_erase_line_ansi(self, mock_popen, capsys):
        """Test that erase-line ANSI codes are stripped."""
        mock_popen.return_value = _make_mock_process([
            "\x1b[2Ktraefik | Starting\n",
        ])

        service_journal.execute("test-package")

        captured = capsys.readouterr()
        result = json.loads(captured.out.strip())
        assert result["line"] == "traefik | Starting"

    @patch("cockpit_container_apps.commands.service_journal.subprocess.Popen")
    def test_preserves_color_ansi(self, mock_popen, capsys):
        """Test that color ANSI codes are preserved."""
        mock_popen.return_value = _make_mock_process([
            "\x1b[32minfo\x1b[0m message\n",
        ])

        service_journal.execute("test-package")

        captured = capsys.readouterr()
        result = json.loads(captured.out.strip())
        assert "\x1b[32m" in result["line"]
        assert "\x1b[0m" in result["line"]

    @patch("cockpit_container_apps.commands.service_journal.subprocess.Popen")
    def test_builds_correct_command(self, mock_popen):
        """Test that journalctl is called with correct arguments."""
        mock_popen.return_value = _make_mock_process([])

        service_journal.execute("halos-core-containers", lines=100)

        mock_popen.assert_called_once()
        cmd = mock_popen.call_args[0][0]
        assert cmd == [
            "journalctl",
            "-u", "halos-core-containers.service",
            "-o", "cat",
            "-n", "100",
            "-f",
            "--no-pager",
        ]

    @patch("cockpit_container_apps.commands.service_journal.subprocess.Popen")
    def test_terminates_process_on_exit(self, mock_popen):
        """Test that journalctl process is cleaned up."""
        mock_process = _make_mock_process([])
        mock_popen.return_value = mock_process

        service_journal.execute("test-package")

        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once()

    @patch("cockpit_container_apps.commands.service_journal.subprocess.Popen")
    def test_terminates_process_on_error(self, mock_popen):
        """Test that journalctl process is cleaned up even on error."""
        mock_process = _make_mock_process([])
        mock_process.stdout.__iter__ = MagicMock(side_effect=RuntimeError("read failed"))
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError):
            service_journal.execute("test-package")

        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once()

    @patch(
        "cockpit_container_apps.commands.service_journal.subprocess.Popen",
        side_effect=FileNotFoundError(),
    )
    def test_journalctl_not_found(self, mock_popen):
        """Test error when journalctl is not installed."""
        with pytest.raises(APTBridgeError) as exc_info:
            service_journal.execute("test-package")
        assert exc_info.value.code == "JOURNAL_ERROR"


class TestStripNonvisualAnsi:
    """Tests for _strip_nonvisual_ansi helper."""

    def test_strips_erase_line(self):
        assert service_journal._strip_nonvisual_ansi("\x1b[2Kfoo") == "foo"

    def test_strips_erase_line_no_number(self):
        assert service_journal._strip_nonvisual_ansi("\x1b[Kfoo") == "foo"

    def test_strips_cursor_up(self):
        assert service_journal._strip_nonvisual_ansi("\x1b[1Afoo") == "foo"

    def test_strips_cursor_movement(self):
        assert service_journal._strip_nonvisual_ansi("\x1b[5Gfoo") == "foo"

    def test_strips_carriage_return(self):
        assert service_journal._strip_nonvisual_ansi("foo\rbar") == "foobar"

    def test_preserves_sgr_colors(self):
        text = "\x1b[32mgreen\x1b[0m"
        assert service_journal._strip_nonvisual_ansi(text) == text

    def test_no_escape_codes(self):
        assert service_journal._strip_nonvisual_ansi("plain text") == "plain text"

    def test_mixed_codes(self):
        text = "\x1b[2K\x1b[32mgreen\x1b[0m rest"
        assert service_journal._strip_nonvisual_ansi(text) == "\x1b[32mgreen\x1b[0m rest"

    def test_cursor_up_and_erase(self):
        """Common docker compose pattern: move up + erase to overwrite progress."""
        text = "\x1b[1A\x1b[2KDone"
        assert service_journal._strip_nonvisual_ansi(text) == "Done"
