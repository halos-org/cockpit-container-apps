"""
Command-line interface for cockpit-container-apps.

This module provides the main entry point for the cockpit-container-apps CLI tool.
It uses argparse with subcommands to parse arguments and dispatch to appropriate
command handlers, outputting results as JSON.

Exit Codes:
    0 - Success
    1 - Expected error (validation, package not found, etc.)
    2 - Unexpected error

Output Format:
    - Success: JSON to stdout, exit 0
    - Error: JSON error to stderr, exit non-zero
"""

import argparse
import json
import sys
from typing import Any, NoReturn

from cockpit_container_apps.commands import (
    filter_packages,
    get_config,
    get_config_schema,
    get_store_data,
    install,
    list_categories,
    list_packages_by_category,
    list_store_packages,
    list_stores,
    remove,
    set_config,
)
from cockpit_container_apps.utils.formatters import to_json
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError, format_error


def cmd_version(_args: argparse.Namespace) -> dict[str, Any]:
    """Return version information."""
    from cockpit_container_apps import __version__

    return {"version": __version__, "name": "cockpit-container-apps"}


def cmd_list_stores(_args: argparse.Namespace) -> list[dict[str, Any]]:
    """List available container app stores."""
    return list_stores.execute()


def cmd_list_store_packages(_args: argparse.Namespace) -> dict[str, Any]:
    """List available container store packages (installed and not installed)."""
    return list_store_packages.execute()


def cmd_get_store_data(args: argparse.Namespace) -> dict[str, Any]:
    """Get consolidated store data."""
    return get_store_data.execute(args.store_id)


def cmd_list_categories(args: argparse.Namespace) -> list[dict[str, Any]]:
    """List all categories."""
    return list_categories.execute(args.store)


def cmd_list_packages_by_category(args: argparse.Namespace) -> list[dict[str, Any]]:
    """List packages in a category."""
    return list_packages_by_category.execute(args.category_id, args.store)


def cmd_filter_packages(args: argparse.Namespace) -> dict[str, Any]:
    """Filter packages with various criteria."""
    return filter_packages.execute(
        store_id=args.store,
        repository_id=args.repo,
        category_id=args.category,
        tab=args.tab,
        search_query=args.search,
        limit=args.limit,
    )


def cmd_install(args: argparse.Namespace) -> dict[str, Any] | None:
    """Install a package."""
    return install.execute(args.package)


def cmd_remove(args: argparse.Namespace) -> dict[str, Any] | None:
    """Remove a package."""
    return remove.execute(args.package)


def cmd_get_config_schema(args: argparse.Namespace) -> dict[str, Any]:
    """Get configuration schema for a package."""
    return get_config_schema.execute(args.package)


def cmd_get_config(args: argparse.Namespace) -> dict[str, Any]:
    """Get current configuration for a package."""
    return get_config.execute(args.package)


def cmd_set_config(args: argparse.Namespace) -> dict[str, Any]:
    """Set configuration for a package."""
    try:
        config_dict = json.loads(args.config_json)
        if not isinstance(config_dict, dict):
            raise APTBridgeError("Config must be a JSON object", code="INVALID_ARGUMENTS")
    except json.JSONDecodeError as e:
        raise APTBridgeError(f"Invalid JSON: {e}", code="INVALID_JSON") from None

    return set_config.execute(args.package, config_dict)


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser with all subcommands."""
    parser = argparse.ArgumentParser(
        prog="cockpit-container-apps",
        description="Container apps management for Cockpit",
        # Don't add -h/--help to avoid breaking JSON output on errors
        add_help=False,
    )

    subparsers = parser.add_subparsers(dest="command", metavar="<command>")

    # version
    p_version = subparsers.add_parser("version", help="Show version information", add_help=False)
    p_version.set_defaults(func=cmd_version)

    # list-stores
    p_list_stores = subparsers.add_parser(
        "list-stores", help="List available container app stores", add_help=False
    )
    p_list_stores.set_defaults(func=cmd_list_stores)

    # list-store-packages
    p_list_store_packages = subparsers.add_parser(
        "list-store-packages",
        help="List available container store packages (installed and not installed)",
        add_help=False,
    )
    p_list_store_packages.set_defaults(func=cmd_list_store_packages)

    # get-store-data
    p_get_store_data = subparsers.add_parser(
        "get-store-data",
        help="Get consolidated store data (config + packages + categories)",
        add_help=False,
    )
    p_get_store_data.add_argument("store_id", help="Store ID")
    p_get_store_data.set_defaults(func=cmd_get_store_data)

    # list-categories
    p_list_categories = subparsers.add_parser(
        "list-categories", help="List all categories (auto-discovered from tags)", add_help=False
    )
    p_list_categories.add_argument("--store", help="Filter by store ID")
    p_list_categories.set_defaults(func=cmd_list_categories)

    # list-packages-by-category
    p_list_by_cat = subparsers.add_parser(
        "list-packages-by-category", help="List all packages in a category", add_help=False
    )
    p_list_by_cat.add_argument("category_id", help="Category ID")
    p_list_by_cat.add_argument("--store", help="Filter by store ID")
    p_list_by_cat.set_defaults(func=cmd_list_packages_by_category)

    # filter-packages
    p_filter = subparsers.add_parser(
        "filter-packages",
        help="Filter packages by store, repo, category, tab, search, limit",
        add_help=False,
    )
    p_filter.add_argument("--store", help="Filter by store ID")
    p_filter.add_argument("--repo", help="Filter by repository ID")
    p_filter.add_argument("--category", help="Filter by category ID")
    p_filter.add_argument("--tab", choices=["installed", "upgradable"], help="Filter by tab")
    p_filter.add_argument("--search", help="Search query")
    p_filter.add_argument("--limit", type=int, default=1000, help="Maximum results (default: 1000)")
    p_filter.set_defaults(func=cmd_filter_packages)

    # install
    p_install = subparsers.add_parser(
        "install", help="Install a package (with progress)", add_help=False
    )
    p_install.add_argument("package", help="Package name")
    p_install.set_defaults(func=cmd_install)

    # remove
    p_remove = subparsers.add_parser(
        "remove", help="Remove a package (with progress)", add_help=False
    )
    p_remove.add_argument("package", help="Package name")
    p_remove.set_defaults(func=cmd_remove)

    # get-config-schema
    p_get_schema = subparsers.add_parser(
        "get-config-schema", help="Get configuration schema for a package", add_help=False
    )
    p_get_schema.add_argument("package", help="Package name")
    p_get_schema.set_defaults(func=cmd_get_config_schema)

    # get-config
    p_get_config = subparsers.add_parser(
        "get-config", help="Get current configuration values for a package", add_help=False
    )
    p_get_config.add_argument("package", help="Package name")
    p_get_config.set_defaults(func=cmd_get_config)

    # set-config
    p_set_config = subparsers.add_parser(
        "set-config", help="Set configuration values for a package", add_help=False
    )
    p_set_config.add_argument("package", help="Package name")
    p_set_config.add_argument("config_json", help="Configuration as JSON string")
    p_set_config.set_defaults(func=cmd_set_config)

    # help (manual handling)
    subparsers.add_parser("help", help="Show help message", add_help=False)

    return parser


def print_usage() -> None:
    """Print usage information to stderr."""
    usage = """
Usage: cockpit-container-apps <command> [arguments]

Commands:
  version                               Show version information
  list-stores                           List available container app stores
  list-store-packages                   List available store packages
  get-store-data STORE_ID               Get consolidated store data
  list-categories [--store=ID]          List all categories
  list-packages-by-category CAT [--store=ID]
                                        List all packages in a category
  filter-packages [OPTIONS]             Filter packages
    --store=ID                          Filter by store ID
    --repo=ID                           Filter by repository ID
    --category=ID                       Filter by category ID
    --tab=TAB                           Filter by tab (installed|upgradable)
    --search=QUERY                      Search query
    --limit=N                           Maximum results (default: 1000)
  install PACKAGE                       Install a package (with progress)
  remove PACKAGE                        Remove a package (with progress)
  get-config-schema PACKAGE             Get configuration schema
  get-config PACKAGE                    Get current configuration
  set-config PACKAGE JSON               Set configuration

Examples:
  cockpit-container-apps version
  cockpit-container-apps list-stores
  cockpit-container-apps get-store-data marine
  cockpit-container-apps list-categories --store=marine
  cockpit-container-apps filter-packages --store=marine --tab=installed --limit=50
  cockpit-container-apps install cowsay
"""
    print(usage, file=sys.stderr)


def main() -> NoReturn:
    """
    Main entry point for the CLI.

    Parses arguments, dispatches to command handler, and outputs JSON.
    Exits with code 0 on success, non-zero on error.
    """
    parser = create_parser()

    try:
        # Handle help commands before parsing to avoid argparse errors
        if len(sys.argv) < 2 or sys.argv[1] in ("--help", "-h", "help"):
            print_usage()
            sys.exit(0 if len(sys.argv) >= 2 else 1)

        # Check for unknown command before argparse parsing
        # (argparse outputs non-JSON errors for unknown subcommands)
        known_commands = {
            "version",
            "list-stores",
            "list-store-packages",
            "get-store-data",
            "list-categories",
            "list-packages-by-category",
            "filter-packages",
            "install",
            "remove",
            "get-config-schema",
            "get-config",
            "set-config",
            "help",
        }
        if sys.argv[1] not in known_commands:
            raise APTBridgeError(f"Unknown command: {sys.argv[1]}", code="UNKNOWN_COMMAND")

        # Parse arguments
        try:
            args = parser.parse_args()
        except SystemExit:
            # argparse calls sys.exit on error - convert to our error format
            raise APTBridgeError(
                "Invalid arguments. Use 'cockpit-container-apps help' for usage.",
                code="INVALID_ARGUMENTS",
            ) from None

        if not hasattr(args, "func"):
            raise APTBridgeError(f"Unknown command: {args.command}", code="UNKNOWN_COMMAND")

        # Execute command
        result = args.func(args)

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
