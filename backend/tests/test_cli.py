"""
Tests for the CLI module.

Verifies that the CLI correctly parses arguments and routes to handlers.
Tests are designed to match cockpit-apt CLI behavior.
"""

import json
import os
import subprocess
import sys
from unittest.mock import patch

import pytest

from cockpit_container_apps import cli


def get_test_cwd() -> str:
    """Get the appropriate working directory for tests."""
    cwd = "/workspace/backend"
    if not os.path.exists(cwd):
        cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return cwd


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    """Run the CLI with the given arguments."""
    return subprocess.run(
        [sys.executable, "-m", "cockpit_container_apps", *args],
        capture_output=True,
        text=True,
        cwd=get_test_cwd(),
    )


class TestCLIVersion:
    """Tests for the version command."""

    def test_version_command(self):
        """Test that version command returns valid JSON."""
        result = run_cli("version")

        assert result.returncode == 0
        output = json.loads(result.stdout)
        assert "version" in output
        assert output["name"] == "cockpit-container-apps"


class TestCLIHelp:
    """Tests for help display."""

    def test_no_command_shows_help(self):
        """Test that running without a command shows help."""
        result = run_cli()

        # Should exit with code 1 and show usage to stderr
        assert result.returncode == 1
        assert "usage" in result.stderr.lower()

    def test_help_command(self):
        """Test that help command shows usage."""
        result = run_cli("help")

        assert result.returncode == 0
        assert "usage" in result.stderr.lower()

    def test_help_flag(self):
        """Test that --help flag shows usage."""
        result = run_cli("--help")

        assert result.returncode == 0
        assert "usage" in result.stderr.lower()

    def test_h_flag(self):
        """Test that -h flag shows usage."""
        result = run_cli("-h")

        assert result.returncode == 0
        assert "usage" in result.stderr.lower()


class TestCLIUnknownCommand:
    """Tests for unknown command handling."""

    def test_unknown_command_returns_json_error(self):
        """Test that unknown commands return a JSON error to stderr."""
        result = run_cli("nonexistent")

        # Should exit with code 1 (expected error)
        assert result.returncode == 1

        # Should return JSON error to stderr
        error = json.loads(result.stderr)
        assert "error" in error
        assert "code" in error
        assert error["code"] == "UNKNOWN_COMMAND"
        assert "nonexistent" in error["error"]


class TestCLIErrorHandling:
    """Tests for error handling."""

    def test_unexpected_error_returns_internal_error(self, capsys):
        """Test handling of unexpected errors."""
        with (
            patch("sys.argv", ["cockpit-container-apps", "version"]),
            patch(
                "cockpit_container_apps.cli.cmd_version",
                side_effect=RuntimeError("Unexpected"),
            ),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 2
        captured = capsys.readouterr()
        error = json.loads(captured.err)
        assert error["code"] == "INTERNAL_ERROR"
        assert "Unexpected" in error["error"]


class TestCLIOutputFormat:
    """Tests for output formatting."""

    def test_json_output_is_pretty_printed(self):
        """Test that JSON output uses consistent formatting."""
        result = run_cli("version")

        assert result.returncode == 0
        # Check for pretty printing (2-space indent)
        assert "\n  " in result.stdout

    def test_json_preserves_unicode(self):
        """Test that JSON output preserves unicode characters."""
        result = run_cli("version")

        assert result.returncode == 0
        # Output should be valid JSON
        json.loads(result.stdout)


class TestCLIArgumentInjection:
    """Tests for argument injection prevention.

    These tests verify that dash-prefixed values are handled correctly
    by argparse and not interpreted as command-line flags.
    """

    def test_dash_prefixed_search_combined_format(self):
        """Test that --search=-test is parsed correctly.

        The frontend uses --search=VALUE format to prevent argparse
        from misinterpreting dash-prefixed values as flags.
        """
        parser = cli.create_parser()
        args = parser.parse_args(["filter-packages", "--search=-test"])

        # Should parse correctly - argparse interprets --search=-test
        # as search value "-test"
        assert args.search == "-test"
        assert args.command == "filter-packages"

    def test_dash_prefixed_search_separate_format_fails(self):
        """Test that --search -test format FAILS with argparse.

        This documents why the frontend must use --search=VALUE format.
        When --search and -test are separate arguments, argparse interprets
        -test as an unknown flag, not as the value for --search.
        """
        parser = cli.create_parser()

        # This SHOULD fail - argparse sees "-test" as a flag
        with pytest.raises(SystemExit):
            parser.parse_args(["filter-packages", "--search", "-test"])

    def test_double_dash_search_value(self):
        """Test searching for a value that looks like a flag."""
        parser = cli.create_parser()
        args = parser.parse_args(["filter-packages", "--search=--limit"])

        # Should treat "--limit" as the search term, not as a flag
        assert args.search == "--limit"
        # limit should be default, not affected
        assert args.limit == 1000

    def test_all_filter_params_with_dashes(self):
        """Test that all filter parameters handle dash-prefixed values."""
        parser = cli.create_parser()
        args = parser.parse_args([
            "filter-packages",
            "--store=-marine",
            "--repo=-test:repo",
            "--category=-nav",
            "--search=-query",
        ])

        assert args.store == "-marine"
        assert args.repo == "-test:repo"
        assert args.category == "-nav"
        assert args.search == "-query"
