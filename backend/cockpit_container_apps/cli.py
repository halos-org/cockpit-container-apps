"""
Command-line interface for cockpit-container-apps.

This module provides the main entry point for the cockpit-container-apps CLI.
It parses command-line arguments, routes to appropriate command handlers,
and formats output as JSON.

Usage:
    cockpit-container-apps <command> [options]

Commands:
    version     Show version information
    list-stores List available container app stores
    list-apps   List apps in a store

All output is formatted as JSON for consumption by the Cockpit frontend.
"""

import argparse
import json
import sys
from typing import Any, NoReturn

from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError, format_error


def cmd_version(_args: argparse.Namespace) -> dict[str, Any]:
    """Return version information."""
    from cockpit_container_apps import __version__

    return {"version": __version__, "name": "cockpit-container-apps"}


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser with all subcommands."""
    parser = argparse.ArgumentParser(
        prog="cockpit-container-apps",
        description="Container app management backend for Cockpit",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # version command
    subparsers.add_parser("version", help="Show version information")

    # list-stores command (placeholder for future implementation)
    subparsers.add_parser("list-stores", help="List available container app stores")

    # list-apps command (placeholder for future implementation)
    list_apps = subparsers.add_parser("list-apps", help="List apps in a store")
    list_apps.add_argument("store", help="Store identifier")

    return parser


def main() -> NoReturn:
    """Main entry point for the CLI."""
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Route to command handler
    handlers: dict[str, Any] = {
        "version": cmd_version,
        # Future commands will be added here
    }

    try:
        handler = handlers.get(args.command)
        if handler is None:
            raise APTBridgeError(
                f"Unknown command: {args.command}",
                code="UNKNOWN_COMMAND",
            )

        result = handler(args)
        print(json.dumps(result, indent=2))
        sys.exit(0)

    except APTBridgeError as e:
        print(format_error(e), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error = APTBridgeError(str(e), code="UNKNOWN_ERROR")
        print(format_error(error), file=sys.stderr)
        sys.exit(2)
