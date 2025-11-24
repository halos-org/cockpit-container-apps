/**
 * Vitest test setup file.
 */
import '@testing-library/jest-dom';

// Mock cockpit API
const mockCockpit = {
    spawn: vi.fn(),
    file: vi.fn(),
    dbus: vi.fn(),
    user: { name: 'testuser' },
    location: { go: vi.fn() },
};

// @ts-expect-error - cockpit is a global
globalThis.cockpit = mockCockpit;
