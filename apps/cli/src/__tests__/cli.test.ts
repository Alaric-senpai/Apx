import { describe, it, expect } from 'vitest';
import { createProgram } from '../index.js';

describe('apx cli interface', () => {
  it('registers all core commands with proper descriptions', () => {
    const program = createProgram();

    expect(program.name()).toBe('apx');
    expect(program.version()).toBe('0.1.0');

    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('setup');
    expect(commandNames).toContain('create');
    expect(commandNames).toContain('update');
    expect(commandNames).toContain('init');
    expect(commandNames).toContain('list');
    expect(commandNames).toContain('doctor');
  });

  it('configures options for create command', () => {
    const program = createProgram();
    const createCmd = program.commands.find((c) => c.name() === 'create');

    expect(createCmd).toBeDefined();
    const optionFlags = createCmd!.options.map((o) => o.flags);
    expect(optionFlags.some((f) => f.includes('--version'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--offline'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--yes'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--packages'))).toBe(true);
  });

  it('configures options for setup command', () => {
    const program = createProgram();
    const setupCmd = program.commands.find((c) => c.name() === 'setup');

    expect(setupCmd).toBeDefined();
    const optionFlags = setupCmd!.options.map((o) => o.flags);
    expect(optionFlags.some((f) => f.includes('--version'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--force'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--packages'))).toBe(true);
  });

  it('configures options for update command', () => {
    const program = createProgram();
    const updateCmd = program.commands.find((c) => c.name() === 'update');

    expect(updateCmd).toBeDefined();
    const optionFlags = updateCmd!.options.map((o) => o.flags);
    expect(optionFlags.some((f) => f.includes('--version'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--offline'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--dry-run'))).toBe(true);
  });
});
