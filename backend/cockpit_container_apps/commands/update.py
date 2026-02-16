"""
Update command implementation.

Updates package lists using apt-get update.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

import json
import os
import re
import subprocess
from typing import Any

from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError

# 5-minute timeout for apt-get update (covers slow mirrors)
UPDATE_TIMEOUT_SECONDS = 300


def execute() -> dict[str, Any] | None:
    """
    Update package lists using apt-get update.

    Outputs progress as JSON lines to stdout:
    - Progress: {"type": "progress", "percentage": int, "message": str}
    - Final: {"success": bool, "message": str}

    Returns:
        None (output is streamed directly to stdout)

    Raises:
        APTBridgeError: If command fails
    """
    cmd = ["apt-get", "update"]

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env={**os.environ, "DEBIAN_FRONTEND": "noninteractive"},
        )

        total_repos = 0
        completed_repos = 0
        # Collect output for error diagnostics (stderr is merged into stdout)
        output_lines: list[str] = []

        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                if not line:
                    break

                line = line.strip()
                output_lines.append(line)

                if line.startswith(("Get:", "Hit:", "Ign:")):
                    match = re.match(r"(Get|Hit|Ign):(\d+)\s+(.+)", line)
                    if match:
                        repo_num = int(match.group(2))
                        repo_url = match.group(3)

                        if repo_num > total_repos:
                            total_repos = repo_num

                        if match.group(1) in ("Hit", "Get"):
                            completed_repos = repo_num

                        if total_repos > 0:
                            percentage = int((completed_repos / total_repos) * 100)
                            progress_json = {
                                "type": "progress",
                                "percentage": percentage,
                                "message": f"Updating: {repo_url[:60]}...",
                            }
                            print(json.dumps(progress_json), flush=True)

        try:
            process.wait(timeout=UPDATE_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            raise APTBridgeError(
                "Package list update timed out",
                code="TIMEOUT",
                details=f"apt-get update did not complete within {UPDATE_TIMEOUT_SECONDS}s",
            )

        if process.returncode != 0:
            output = "\n".join(output_lines)

            if "Could not resolve" in output:
                raise APTBridgeError(
                    "Network error: Unable to reach package repositories",
                    code="NETWORK_ERROR",
                    details=output,
                )
            elif "dpkg was interrupted" in output:
                raise APTBridgeError(
                    "Package manager is locked",
                    code="LOCKED",
                    details=output,
                )
            else:
                raise APTBridgeError(
                    "Failed to update package lists",
                    code="UPDATE_FAILED",
                    details=output,
                )

        final_progress = {"type": "progress", "percentage": 100, "message": "Package lists updated"}
        print(json.dumps(final_progress), flush=True)

        final_result = {"success": True, "message": "Successfully updated package lists"}
        print(json.dumps(final_result), flush=True)

        return None

    except APTBridgeError:
        raise
    except Exception as e:
        raise APTBridgeError(
            "Error updating package lists", code="INTERNAL_ERROR", details=str(e)
        ) from e
