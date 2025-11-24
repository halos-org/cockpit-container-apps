"""
Command-line interface for cockpit-container-apps.

This module provides the main entry point for the cockpit-container-apps CLI tool.
It parses command-line arguments and dispatches to appropriate command handlers,
handling errors and formatting output as JSON.

Commands:
    version                           - Show version information
    list-stores                       - List available container app stores

Exit Codes:
    0 - Success
    1 - Expected error (validation, package not found, etc.)
    2 - Unexpected error

Output Format:
    - Success: JSON to stdout, exit 0
    - Error: JSON error to stderr, exit non-zero

Example Usage:
    $ cockpit-container-apps version
    $ cockpit-container-apps list-stores
"""

import sys
from typing import Any, NoReturn

from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError, format_error
from cockpit_container_apps.vendor.cockpit_apt_utils.formatters import to_json


def print_usage() -> None:
    """Print usage information to stderr."""
    usage = """
Usage: cockpit-container-apps <command> [arguments]

Commands:
  version                           Show version information
  list-stores                       List available container app stores

Examples:
  cockpit-container-apps version
  cockpit-container-apps list-stores
"""
    print(usage, file=sys.stderr)


def cmd_version() -> dict[str, Any]:
    """Return version information."""
    from cockpit_container_apps import __version__

    return {"version": __version__, "name": "cockpit-container-apps"}


def main() -> NoReturn:
    """
    Main entry point for the CLI.

    Parses arguments, dispatches to command handler, and outputs JSON.
    Exits with code 0 on success, non-zero on error.
    """
    try:
        # Parse command-line arguments
        if len(sys.argv) < 2:
            print_usage()
            sys.exit(1)

        command = sys.argv[1]

        # Dispatch to command handler
        result: dict[str, Any] | None = None

        if command == "version":
            result = cmd_version()

        elif command in ("--help", "-h", "help"):
            print_usage()
            sys.exit(0)

        else:
            raise APTBridgeError(f"Unknown command: {command}", code="UNKNOWN_COMMAND")

        # Output result as JSON to stdout (if not None)
        # Commands that stream progress may print results themselves and return None
        if result is not None:
            print(to_json(result))
        sys.exit(0)

    except APTBridgeError as e:
        # Expected errors - output formatted error to stderr
        print(format_error(e), file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        # Unexpected errors - output generic error to stderr
        error = APTBridgeError(
            f"Unexpected error: {str(e)}", code="INTERNAL_ERROR", details=type(e).__name__
        )
        print(format_error(error), file=sys.stderr)
        sys.exit(2)
