/**
 * Entry point for the Cockpit Container Apps module.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Import both PatternFly CSS files
// patternfly-base.css contains design tokens (--pf-t--global--* variables)
// patternfly.css contains component styles that reference those tokens
// Both are required for proper styling!
import '@patternfly/patternfly/patternfly-base.css';
import '@patternfly/patternfly/patternfly.css';
// Import dark theme support (must be after PatternFly CSS)
import './dark-theme';
// Import our custom CSS overrides LAST so they take precedence over PatternFly defaults
import './app.css';

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
