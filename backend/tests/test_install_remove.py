"""
Unit tests for install and remove commands.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_container_apps.commands import install, remove
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError


class TestInstall:
    """Tests for install command."""

    def test_validate_package_name(self):
        """Test that invalid package names are rejected."""
        with pytest.raises(APTBridgeError):
            install.execute("../evil")

    def test_empty_package_name(self):
        """Test that empty package names are rejected."""
        with pytest.raises(APTBridgeError):
            install.execute("")

    @patch("cockpit_container_apps.commands.install.subprocess.Popen")
    @patch("cockpit_container_apps.commands.install.os.pipe")
    def test_successful_install(self, mock_pipe, mock_popen):
        """Test successful package installation."""
        # Set up mocks
        mock_pipe.return_value = (10, 11)

        mock_process = MagicMock()
        mock_process.poll.side_effect = [None, None, 0]
        mock_process.returncode = 0
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process

        # Mock os.close and os.fdopen
        with patch("cockpit_container_apps.commands.install.os.close"):
            with patch("cockpit_container_apps.commands.install.os.fdopen") as mock_fdopen:
                mock_file = MagicMock()
                mock_file.read.return_value = ""
                mock_fdopen.return_value = mock_file

                with patch(
                    "cockpit_container_apps.commands.install.select.select"
                ) as mock_select:
                    mock_select.return_value = ([], [], [])

                    result = install.execute("test-package")

        # Install command returns None (streams output)
        assert result is None


class TestRemove:
    """Tests for remove command."""

    def test_validate_package_name(self):
        """Test that invalid package names are rejected."""
        with pytest.raises(APTBridgeError):
            remove.execute("../evil")

    def test_empty_package_name(self):
        """Test that empty package names are rejected."""
        with pytest.raises(APTBridgeError):
            remove.execute("")

    def test_essential_package_blocked(self):
        """Test that essential packages cannot be removed."""
        with pytest.raises(APTBridgeError) as exc_info:
            remove.execute("dpkg")

        assert exc_info.value.code == "ESSENTIAL_PACKAGE"

    @patch("cockpit_container_apps.commands.remove.subprocess.Popen")
    @patch("cockpit_container_apps.commands.remove.os.pipe")
    def test_successful_remove(self, mock_pipe, mock_popen):
        """Test successful package removal."""
        mock_pipe.return_value = (10, 11)

        mock_process = MagicMock()
        mock_process.poll.side_effect = [None, None, 0]
        mock_process.returncode = 0
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process

        with patch("cockpit_container_apps.commands.remove.os.close"):
            with patch("cockpit_container_apps.commands.remove.os.fdopen") as mock_fdopen:
                mock_file = MagicMock()
                mock_file.read.return_value = ""
                mock_fdopen.return_value = mock_file

                with patch(
                    "cockpit_container_apps.commands.remove.select.select"
                ) as mock_select:
                    mock_select.return_value = ([], [], [])

                    result = remove.execute("test-package")

        assert result is None
