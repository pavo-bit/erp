import { describe, it, expect } from 'vitest';
import { createWorld } from '../helpers/world';

describe('world builder smoke test', () => {
  it('exports a createWorld factory function', () => {
    expect(typeof createWorld).toBe('function');
  });
});