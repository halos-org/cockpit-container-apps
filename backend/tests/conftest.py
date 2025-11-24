"""
Pytest configuration and shared fixtures for cockpit-container-apps tests.
"""

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def mock_apt_cache():
    """
    Create a mock APT cache for testing.

    Returns a MagicMock configured to behave like an apt.Cache object.
    """
    cache = MagicMock()
    cache.__iter__ = lambda self: iter([])
    cache.__contains__ = lambda self, key: False
    return cache


@pytest.fixture
def mock_apt_package():
    """
    Create a mock APT package for testing.

    Returns a MagicMock configured to behave like an apt.Package object.
    """
    pkg = MagicMock()
    pkg.name = "test-package"
    pkg.is_installed = False
    pkg.is_upgradable = False

    # Candidate version
    pkg.candidate = MagicMock()
    pkg.candidate.version = "1.0.0"
    pkg.candidate.summary = "A test package"
    pkg.candidate.description = "This is a longer description of the test package."
    pkg.candidate.section = "utils"
    pkg.candidate.size = 1024
    pkg.candidate.installed_size = 2048
    pkg.candidate.priority = "optional"
    pkg.candidate.homepage = "https://example.com"
    pkg.candidate.origins = []

    # Mock dependencies
    pkg.candidate.dependencies = []
    pkg.candidate.get_dependencies = MagicMock(return_value=[])

    # Mock record for maintainer info
    pkg.candidate.record = {"Maintainer": "Test Maintainer <test@example.com>"}

    # Installed version (None if not installed)
    pkg.installed = None

    # For reverse dependencies
    pkg.candidate._cand = MagicMock()
    pkg.candidate._cand.rev_depends_list = []

    return pkg
