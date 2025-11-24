"""
Pytest configuration and shared fixtures for cockpit-container-apps tests.
"""

from unittest.mock import MagicMock

import pytest


def pytest_configure(config):
    """Configure pytest to suppress OSError during capture cleanup.

    In container environments, pytest's capture plugin can encounter
    'Bad file descriptor' errors when closing temporary files during
    final cleanup. This happens after all tests pass and doesn't affect
    test results. We monkey-patch the cleanup to ignore this specific error.
    """
    from _pytest import capture

    original_done = capture.FDCapture.done

    def patched_done(self):
        try:
            original_done(self)
        except OSError as e:
            if e.errno == 9:  # Bad file descriptor
                pass  # Ignore in container environments
            else:
                raise

    capture.FDCapture.done = patched_done


@pytest.fixture(autouse=True)
def reset_apt_cache():
    """Ensure each test starts with clean state."""
    yield


class MockDependency:
    """Mock apt dependency for testing."""

    def __init__(self, name: str, relation: str = "", version: str = ""):
        self.name = name
        self.relation = relation
        self.version = version


class MockPackage:
    """Mock apt.Package for testing."""

    def __init__(
        self,
        name: str,
        summary: str = "Test package",
        description: str = "Test package description",
        version: str = "1.0.0",
        installed: bool = False,
        section: str = "utils",
        priority: str = "optional",
        homepage: str = "",
        maintainer: str = "Test Maintainer <test@example.com>",
        size: int = 1024,
        installed_size: int = 4096,
        dependencies: list[list[MockDependency]] | None = None,
        is_upgradable: bool = False,
    ):
        self.name = name
        self.is_installed = installed
        self.is_upgradable = is_upgradable

        # Candidate version (available for install)
        self.candidate = MagicMock()
        self.candidate.summary = summary
        self.candidate.description = description
        self.candidate.version = version
        self.candidate.section = section
        self.candidate.priority = priority
        self.candidate.homepage = homepage
        self.candidate.size = size
        self.candidate.installed_size = installed_size
        self.candidate.record = {"Maintainer": maintainer}

        # Set up dependencies
        if dependencies:
            self.candidate.dependencies = dependencies
        else:
            self.candidate.dependencies = []

        # Installed version (if package is installed)
        if installed:
            self.installed = MagicMock()
            self.installed.version = version
            self.installed.summary = summary
            self.installed.section = section
        else:
            self.installed = None


class MockCache:
    """Mock apt.Cache for testing."""

    def __init__(self, packages: list[MockPackage]):
        self._packages = packages
        self._dict = {pkg.name: pkg for pkg in packages}

    def __iter__(self):
        return iter(self._packages)

    def __contains__(self, key: str):
        return key in self._dict

    def __getitem__(self, key: str):
        if key not in self._dict:
            raise KeyError(key)
        return self._dict[key]

    def upgrade(self):
        """Mock the upgrade() method that marks packages for upgrade."""
        pass


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
