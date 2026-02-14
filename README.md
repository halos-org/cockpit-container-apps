# Cockpit Container Apps

Cockpit module for browsing, installing, and configuring container applications in HaLOS.

## Status

**In Development** - See [docs/SPEC.md](docs/SPEC.md) for the technical specification and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture details.

## Features (Planned)

- Browse container app stores by category
- Search for container apps
- Install and uninstall container app packages
- Configure installed apps through dynamically generated forms

## Development

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Git

### Quick Start

```bash
# 1. Vendor utilities from cockpit-apt
./run vendor

# 2. Build development container
./run build-devtools

# 3. Run backend tests
./run test

# 4. Open development shell
./run backend shell
```

### Project Structure

```
cockpit-container-apps/
├── backend/                       # Python backend
│   ├── cockpit_container_apps/    # Main package
│   │   ├── cli.py                 # CLI entry point
│   │   ├── commands/              # Command handlers
│   │   └── vendor/                # Vendored utilities
│   │       └── cockpit_apt_utils/ # Utils from cockpit-apt
│   ├── tests/                     # Backend tests
│   └── pyproject.toml             # Python dependencies
├── frontend/                      # React frontend
│   ├── src/                       # Source files
│   └── package.json               # Node dependencies
├── docker/                        # Docker configurations
├── debian/                        # Debian packaging
├── docs/                          # Documentation
│   ├── SPEC.md                    # Technical specification
│   └── ARCHITECTURE.md            # Architecture documentation
├── run                            # Development commands
└── VERSION                        # Package version
```

### Development Commands

```bash
# Vendoring
./run vendor              # Vendor utilities from cockpit-apt
./run vendor-check        # Check vendored version

# Backend
./run test                # Run backend tests
./run lint                # Run linter
./run typecheck           # Run type checker
./run backend shell       # Open development shell

# Frontend
cd frontend && npm install
./run frontend build      # Build frontend
./run frontend test       # Run frontend tests

# Docker
./run build-devtools      # Build dev container
./run build-debtools      # Build packaging container

# Packaging
./run build-deb           # Build Debian package
```

### Vendored Utilities

This project vendors utilities from [cockpit-apt](https://github.com/halos-org/cockpit-apt) to avoid a package dependency. The vendoring is done at build time:

```bash
# Update vendored utilities
./run vendor

# Or specify a version
./run vendor v0.2.0+1
```

The vendored utilities include:
- Error handling and formatting
- Input validation
- Store configuration loading
- Store filter matching
- Debtag parsing
- Repository metadata parsing

## Part of HaLOS

This module is part of the [HaLOS](https://github.com/halos-org/halos-distro) distribution.

## License

LGPL-2.1-or-later
