"""
Tests for the CLI module.

Verifies that the CLI correctly parses arguments and routes to handlers.
"""

import json
import subprocess
import sys
import os

import pytest


class TestCLIVersion:
    """Tests for the version command."""

    def test_version_command(self):
        """Test that version command returns valid JSON."""
        # Use /workspace/backend as cwd when running in Docker container
        cwd = "/workspace/backend"
        if not os.path.exists(cwd):
            cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        result = subprocess.run(
            [sys.executable, "-m", "cockpit_container_apps", "version"],
            capture_output=True,
            text=True,
            cwd=cwd,
        )

        assert result.returncode == 0
        output = json.loads(result.stdout)
        assert "version" in output
        assert output["name"] == "cockpit-container-apps"


class TestCLIHelp:
    """Tests for help display."""

    def test_no_command_shows_help(self):
        """Test that running without a command shows help."""
        # Use /workspace/backend as cwd when running in Docker container
        cwd = "/workspace/backend"
        if not os.path.exists(cwd):
            cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        result = subprocess.run(
            [sys.executable, "-m", "cockpit_container_apps"],
            capture_output=True,
            text=True,
            cwd=cwd,
        )

        # Should exit with code 1 and show help
        assert result.returncode == 1
        assert "usage" in result.stderr.lower() or "usage" in result.stdout.lower()


class TestCLIUnknownCommand:
    """Tests for unknown command handling."""

    def test_unknown_command_error(self):
        """Test that unknown commands return an error."""
        # Use /workspace/backend as cwd when running in Docker container
        cwd = "/workspace/backend"
        if not os.path.exists(cwd):
            cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        result = subprocess.run(
            [sys.executable, "-m", "cockpit_container_apps", "nonexistent"],
            capture_output=True,
            text=True,
            cwd=cwd,
        )

        # argparse returns exit code 2 for invalid arguments
        assert result.returncode == 2
        assert "invalid choice" in result.stderr.lower() or "error" in result.stderr.lower()
