"""
Service journal command implementation.

Streams systemd journal entries for a container app's service unit.
Output is JSON lines to stdout for streaming to frontend.
"""

import json
import re
import subprocess

from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError
from cockpit_container_apps.vendor.cockpit_apt_utils.validators import validate_package_name

# Strip non-SGR CSI sequences (cursor movement, erase, scroll, etc.)
# but preserve SGR color/style codes (sequences ending with 'm').
# Also strip carriage returns from docker compose TTY output.
_NONVISUAL_CSI_RE = re.compile(r"\x1b\[[\d;]*[A-HJKSTf]|\r")

# Number of recent journal lines to show before following new output
DEFAULT_LINES = 50


def execute(package_name: str, lines: int = DEFAULT_LINES) -> None:
    """
    Stream journal entries for a container app's systemd service.

    Runs journalctl for the service unit corresponding to the package name
    and streams each line as a JSON object to stdout.

    Args:
        package_name: Name of the container app package
        lines: Number of recent lines to show (default: 50)

    Raises:
        APTBridgeError: If package name is invalid or command fails
    """
    validate_package_name(package_name)

    if lines < 1 or lines > 10000:
        raise APTBridgeError(
            "Line count must be between 1 and 10000",
            code="INVALID_INPUT",
            details=f"Got: {lines}",
        )

    service_name = f"{package_name}.service"
    cmd = [
        "journalctl",
        "-u", service_name,
        "-o", "cat",
        "-n", str(lines),
        "-f",
        "--no-pager",
    ]

    process = None
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )

        if process.stdout is None:
            raise APTBridgeError(
                "Failed to open journal stream",
                code="JOURNAL_ERROR",
            )

        for raw_line in process.stdout:
            line = _strip_nonvisual_ansi(raw_line.rstrip("\n"))
            entry = {"type": "journal", "line": line}
            print(json.dumps(entry), flush=True)

    except FileNotFoundError:
        raise APTBridgeError(
            "journalctl not found",
            code="JOURNAL_ERROR",
            details="systemd journal tools are not installed",
        )
    except APTBridgeError:
        raise
    except Exception as e:
        raise APTBridgeError(
            f"Error reading journal for '{package_name}'",
            code="INTERNAL_ERROR",
            details=str(e),
        ) from e
    finally:
        if process is not None:
            process.terminate()
            process.wait()


def _strip_nonvisual_ansi(text: str) -> str:
    """Strip non-visual ANSI escape sequences (cursor, erase, etc.) but keep SGR colors."""
    return _NONVISUAL_CSI_RE.sub("", text)
