/**
 * Vitest test setup file.
 */
import '@testing-library/jest-dom';

// Create a chainable spawn mock that supports .stream().done().fail().close()
function createMockSpawn() {
    const spawn: Record<string, ReturnType<typeof vi.fn>> = {};
    spawn.stream = vi.fn(() => spawn);
    spawn.done = vi.fn(() => spawn);
    spawn.fail = vi.fn(() => spawn);
    spawn.close = vi.fn(() => spawn);
    return spawn;
}

// Mock cockpit API
const mockCockpit = {
    spawn: vi.fn(() => createMockSpawn()),
    file: vi.fn(),
    dbus: vi.fn(),
    user: { name: 'testuser' },
    location: { go: vi.fn() },
};

// @ts-expect-error - cockpit is a global
globalThis.cockpit = mockCockpit;
