/**
 * Entry point for the Cockpit Container Apps module.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

import '@patternfly/patternfly/patternfly.css';
import '@patternfly/patternfly/patternfly-addons.css';

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
