import { describe, it, expect } from 'vitest';
import { getNode, chooseOption, isTerminal } from '../src/systems/DialogueSystem.js';

const dialogue = {
  start: { speaker: 'mira', text: 'Hello.', choices: [{ label: 'Hi', next: 'end' }, { label: 'Bye', next: 'dismiss' }] },
  end: { speaker: 'mira', text: 'Good.', choices: [], setFlag: 'met_mira' },
  dismiss: { speaker: 'mira', text: 'Fine.', choices: [] }
};

describe('DialogueSystem', () => {
  it('getNode returns the node by id', () => {
    expect(getNode('start', dialogue).text).toBe('Hello.');
  });

  it('getNode returns null for missing id', () => {
    expect(getNode('missing', dialogue)).toBeNull();
  });

  it('isTerminal returns true when no choices', () => {
    expect(isTerminal('end', dialogue)).toBe(true);
  });

  it('isTerminal returns false when choices exist', () => {
    expect(isTerminal('start', dialogue)).toBe(false);
  });

  it('chooseOption returns next node id', () => {
    const result = chooseOption('start', 0, dialogue, {});
    expect(result.nextNodeId).toBe('end');
  });

  it('chooseOption sets flags from chosen node', () => {
    const flags = {};
    const result = chooseOption('start', 0, dialogue, flags);
    expect(result.flags.met_mira).toBe(true);
  });

  it('chooseOption returns null for out-of-range choice', () => {
    expect(chooseOption('start', 5, dialogue, {})).toBeNull();
  });
});
