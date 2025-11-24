# Cockpit Container Apps - Technical Specification

**Version:** 1.0
**Last Updated:** 2025-11-23

## Project Overview

Cockpit Container Apps is a Cockpit module for the HaLOS distribution that provides a web-based interface for browsing, installing, and configuring container applications. It serves as the dedicated container app management interface, separated from the general-purpose APT package manager (cockpit-apt).

### Goals

- Provide a user-friendly interface for discovering and installing container apps from curated stores
- Enable configuration of container apps through dynamically generated forms based on app-defined schemas
- Maintain clear separation between system package management (APT) and container app management
- Support the HaLOS container app ecosystem built on Debian packages containing Docker Compose configurations

### Target Users

- HaLOS device owners who want to install and configure marine or other specialized applications
- System administrators managing HaLOS deployments
- Users who prefer web-based configuration over command-line tools

## Core Features

### 1. Container Store Browsing

The module displays container apps organized by stores. Each store represents a curated collection of apps (e.g., "Marine Apps", "Home Automation").

**Capabilities:**
- List available container app stores
- Browse apps within a store by category
- Display app metadata: name, description, icon, version
- Show installation status (installed, available, upgradable)

**Data Source:**
- Store definitions from YAML configuration files in `/etc/container-apps/stores/`
- Package information from APT cache (container apps are distributed as Debian packages)
- Category information from Debian package tags (debtags)

### 2. App Search

Users can search for apps within the container store context.

**Capabilities:**
- Search by app name
- Search by description keywords
- Filter results by category
- Filter results by installation status

### 3. App Installation and Removal

Install and uninstall container app packages.

**Capabilities:**
- Install a container app package via APT
- Remove a container app package via APT
- Display installation progress
- Handle installation errors gracefully

**Behavior:**
- Installation triggers APT package installation
- Package post-install scripts handle Docker Compose setup
- Removal cleans up the container and associated resources

### 4. App Configuration

The primary new feature: configure installed container apps through a web interface.

**Capabilities:**
- Read configuration schema from the app's `config.yml` file
- Generate dynamic forms based on the schema
- Display configuration organized by groups
- Support all defined field types
- Validate user input according to field constraints
- Save configuration changes
- Indicate when restart is required for changes to take effect

**Supported Field Types:**
- **string**: Text input with optional min/max length validation
- **integer**: Numeric input with optional min/max value validation
- **boolean**: Toggle switch
- **enum**: Dropdown selection from predefined options
- **password**: Masked text input for secrets
- **path**: File/directory path input

**Configuration Schema Structure:**
- Apps define their configuration in `config.yml` with version, groups, and fields
- Each group has an id, label, optional description, and list of fields
- Each field has id (environment variable name), label, type, default, required flag, and optional constraints

**Configuration Storage:**
- Configuration values are stored as environment variables for Docker Compose
- The configuration file location follows the container-apps standard path structure

## Technical Requirements

### Platform Requirements

- Debian-based Linux (specifically Raspberry Pi OS / HaLOS)
- Cockpit 276 or later
- Python 3.11 or later
- Docker and Docker Compose installed
- Container apps installed as Debian packages

### Integration Requirements

- Must integrate with Cockpit's authentication and authorization system
- Must use Cockpit's privilege escalation for package operations
- Must work alongside cockpit-apt without conflicts
- Must read store configurations in the same format as cockpit-apt previously used

## Key Constraints

### Architectural Constraints

- Backend implemented in Python using cockpit.spawn() communication pattern
- Frontend implemented in React with PatternFly components
- No persistent daemon process; all operations are stateless command executions
- Configuration changes require explicit save action (no auto-save)

### Compatibility Constraints

- Must support the existing container app package format
- Must support the existing config.yml schema (version 1.0)
- Must work with existing store configuration files
- Must not interfere with cockpit-apt operation

### Security Constraints

- All package operations require appropriate Cockpit privileges
- Configuration values must be validated before saving
- Password fields must not be logged or exposed in error messages
- File path inputs must be validated to prevent path traversal

## Non-Functional Requirements

### Performance

- Store listing should load within 2 seconds
- Category browsing should feel responsive (under 500ms for filtering)
- Configuration form generation should be instant for typical app schemas
- Installation progress should update in real-time

### Usability

- Interface should be consistent with other Cockpit modules
- Configuration forms should provide clear labels and help text
- Error messages should be user-friendly and actionable
- Required fields should be clearly indicated

### Reliability

- Failed operations should not leave the system in an inconsistent state
- Configuration save failures should preserve user input
- Network interruptions during installation should be handled gracefully

### Maintainability

- Code should follow established patterns from cockpit-apt
- Backend commands should be independently testable
- Frontend components should be modular and reusable

## Out of Scope (MVP)

The following features are explicitly excluded from the initial release:

### Container Lifecycle Management
- Starting/stopping containers
- Restarting containers after configuration changes
- Viewing container logs
- Container health monitoring

### Advanced Configuration
- CPU/memory resource limits
- Network configuration beyond what's in config.yml
- Volume management beyond what's in config.yml
- Multi-container app orchestration settings

### Container Updates
- Checking for container image updates
- Pulling new container images
- Automated update scheduling

### Advanced Store Features
- Adding custom stores via UI
- Store authentication
- Private/enterprise stores

These features may be added in future releases based on user feedback and requirements.

## Success Criteria

The MVP is considered successful when:

1. Users can browse available container apps organized by store and category
2. Users can search for apps by name or description
3. Users can install and uninstall container app packages
4. Users can view and edit configuration for installed apps
5. Configuration forms correctly render all supported field types
6. Configuration changes are persisted and available to the container
7. The module integrates seamlessly with Cockpit's look and feel
8. All operations work reliably on HaLOS target hardware (Raspberry Pi)

## Glossary

- **Container App**: A Docker-based application packaged as a Debian package with Docker Compose configuration
- **Store**: A curated collection of container apps defined by filter criteria
- **config.yml**: The configuration schema file that defines what settings an app exposes
- **metadata.yaml**: The package metadata file containing app information and default configuration values
- **debtags**: Debian package tags used for categorization
