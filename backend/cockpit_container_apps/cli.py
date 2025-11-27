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

from cockpit_container_apps.commands import (
    filter_packages,
    get_config,
    get_config_schema,
    get_store_data,
    install,
    list_categories,
    list_packages_by_category,
    list_stores,
    remove,
    set_config,
)
from cockpit_container_apps.utils.formatters import to_json
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError, format_error


def print_usage() -> None:
    """Print usage information to stderr."""
    usage = """
Usage: cockpit-container-apps <command> [arguments]

Commands:
  version                               Show version information
  list-stores                           List available container app stores
  get-store-data STORE_ID               Get consolidated store data (config + packages + categories)
  list-categories [--store ID] [--tab TAB]
                                        List all categories (auto-discovered from tags)
  list-packages-by-category CATEGORY [--store ID]
                                        List all packages in a category
  filter-packages [OPTIONS]             Filter packages by store, repo, category, tab, search, limit
                                        OPTIONS: [--store ID] [--repo ID] [--category ID]
                                                 [--tab TAB] [--search QUERY] [--limit N]
  install PACKAGE                       Install a package (with progress)
  remove PACKAGE                        Remove a package (with progress)
  get-config-schema PACKAGE             Get configuration schema for a package
  get-config PACKAGE                    Get current configuration values for a package
  set-config PACKAGE JSON               Set configuration values for a package

Examples:
  cockpit-container-apps version
  cockpit-container-apps list-stores
  cockpit-container-apps get-store-data marine
  cockpit-container-apps list-categories --store marine
  cockpit-container-apps list-packages-by-category navigation --store marine
  cockpit-container-apps filter-packages --store marine --tab installed --limit 50
  cockpit-container-apps install cowsay
  cockpit-container-apps remove cowsay
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
        result: dict[str, Any] | list[dict[str, Any]] | None = None

        if command == "version":
            result = cmd_version()

        elif command == "list-stores":
            result = list_stores.execute()

        elif command == "get-store-data":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Get-store-data command requires a store ID argument",
                    code="INVALID_ARGUMENTS",
                )
            store_id = sys.argv[2]
            result = get_store_data.execute(store_id)

        elif command == "list-categories":
            # Parse optional --store parameter
            store_id = None
            i = 2
            while i < len(sys.argv):
                if sys.argv[i] == "--store":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError("--store requires a value", code="INVALID_ARGUMENTS")
                    store_id = sys.argv[i + 1]
                    i += 2
                else:
                    raise APTBridgeError(
                        f"Unknown parameter: {sys.argv[i]}",
                        code="INVALID_ARGUMENTS",
                    )
            result = list_categories.execute(store_id)

        elif command == "list-packages-by-category":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "List-packages-by-category command requires a category ID argument",
                    code="INVALID_ARGUMENTS",
                )
            category_id = sys.argv[2]
            # Optional --store parameter
            store_id = None
            if len(sys.argv) > 3:
                if sys.argv[3] == "--store":
                    if len(sys.argv) < 5:
                        raise APTBridgeError(
                            "List-packages-by-category --store requires a store ID",
                            code="INVALID_ARGUMENTS",
                        )
                    store_id = sys.argv[4]
                else:
                    raise APTBridgeError(
                        f"Unknown parameter: {sys.argv[3]}",
                        code="INVALID_ARGUMENTS",
                    )
            result = list_packages_by_category.execute(category_id, store_id)

        elif command == "filter-packages":
            # Parse optional parameters
            store_id = None
            repository_id = None
            category_id = None
            tab = None
            search_query = None
            limit = 1000

            i = 2
            while i < len(sys.argv):
                if sys.argv[i] == "--store":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError("--store requires a value", code="INVALID_ARGUMENTS")
                    store_id = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--repo":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError("--repo requires a value", code="INVALID_ARGUMENTS")
                    repository_id = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--category":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError(
                            "--category requires a value", code="INVALID_ARGUMENTS"
                        )
                    category_id = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--tab":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError("--tab requires a value", code="INVALID_ARGUMENTS")
                    tab = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--search":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError("--search requires a value", code="INVALID_ARGUMENTS")
                    search_query = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--limit":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError("--limit requires a value", code="INVALID_ARGUMENTS")
                    try:
                        limit = int(sys.argv[i + 1])
                        if limit < 0:
                            raise APTBridgeError(
                                "--limit must be non-negative", code="INVALID_ARGUMENTS"
                            )
                    except ValueError:
                        raise APTBridgeError(
                            f"Invalid limit value: {sys.argv[i + 1]}", code="INVALID_ARGUMENTS"
                        ) from None
                    i += 2
                else:
                    raise APTBridgeError(
                        f"Unknown filter-packages parameter: {sys.argv[i]}",
                        code="INVALID_ARGUMENTS",
                    )

            result = filter_packages.execute(
                store_id=store_id,
                repository_id=repository_id,
                category_id=category_id,
                tab=tab,
                search_query=search_query,
                limit=limit,
            )

        elif command == "install":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Install command requires a package name argument",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            result = install.execute(package_name)

        elif command == "remove":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Remove command requires a package name argument",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            result = remove.execute(package_name)

        elif command == "get-config-schema":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Get-config-schema command requires a package name argument",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            result = get_config_schema.execute(package_name)

        elif command == "get-config":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Get-config command requires a package name argument",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            result = get_config.execute(package_name)

        elif command == "set-config":
            if len(sys.argv) < 4:
                raise APTBridgeError(
                    "Set-config command requires package name and config JSON arguments",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            config_json = sys.argv[3]
            result = set_config.execute(package_name, config_json)

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
