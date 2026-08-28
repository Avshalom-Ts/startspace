// notes-path.test.ts
//
// Unit tests for the pure Notes feature helpers (path manipulation, title
// extraction, name generation).
//
// These test logic that does not depend on browser APIs, so they can run in
// Vitest without a real browser (see .rule/testing-rules.md).

import { describe, it, expect } from 'vitest';
import { slugifyNoteName, noteFolder, noteDisplayName, replaceNameComponent, parentFolder, extractTitleFromMarkdown, nextDefaultName, MAX_NOTE_NAME_LENGTH, FORBIDDEN_NAME_PATTERN } from '../types/notes-path';

describe('slugifyNoteName', () => {
  it('returns "untitled" for empty input', () => {
    expect(slugifyNoteName('')).toBe('untitled');
    expect(slugifyNoteName('   ')).toBe('untitled');
  });

  it('keeps ASCII letters, digits, spaces, and a small punctuation set', () => {
    expect(slugifyNoteName('Hello World')).toBe('hello-world');
    expect(slugifyNoteName('note 1')).toBe('note-1');
    expect(slugifyNoteName('a.b_c-d')).toBe('a.b_c-d');
  });

  it('replaces non-allowed characters with "-", collapsing runs', () => {
    expect(slugifyNoteName('Hello, World!')).toBe('hello-world');
    expect(slugifyNoteName('foo   bar')).toBe('foo-bar');
    expect(slugifyNoteName('a---b')).toBe('a-b');
  });

  it('trims leading/trailing whitespace and punctuation', () => {
    expect(slugifyNoteName('  hello ')).toBe('hello');
    expect(slugifyNoteName('---hello---')).toBe('hello');
  });

  it('lowercases the result', () => {
    expect(slugifyNoteName('My Note')).toBe('my-note');
  });

  it('inserts a hyphen between digits and letters and vice versa', () => {
    expect(slugifyNoteName('note1')).toBe('note-1');
    expect(slugifyNoteName('1note')).toBe('1-note');
  });
});

describe('noteFolder', () => {
  it('returns "" for top-level notes', () => {
    expect(noteFolder('hello.md')).toBe('');
  });

  it('returns the relative folder for nested notes', () => {
    expect(noteFolder('ideas/plans.md')).toBe('ideas');
    expect(noteFolder('a/b/c.md')).toBe('a/b');
  });
});

describe('noteDisplayName', () => {
  it('returns the filename without ".md" for top-level notes', () => {
    expect(noteDisplayName('hello.md')).toBe('hello');
  });

  it('returns the last segment for nested notes', () => {
    expect(noteDisplayName('ideas/plans.md')).toBe('plans');
    expect(noteDisplayName('a/b/c.md')).toBe('c');
  });

  it('returns the id as-is when it does not end with ".md"', () => {
    expect(noteDisplayName('hello.txt')).toBe('hello.txt');
  });
});

describe('replaceNameComponent', () => {
  it('replaces the last segment for top-level ids', () => {
    expect(replaceNameComponent('hello.md', 'goodbye.md')).toBe('goodbye.md');
  });

  it('replaces the last segment for nested ids', () => {
      expect(replaceNameComponent('ideas/plans.md', 'goals.md')).toBe('ideas/goals.md');
    });
});

describe('parentFolder', () => {
  it('returns "" for top-level ids', () => {
    expect(parentFolder('hello.md')).toBe('');
  });

  it('returns the parent folder for nested ids', () => {
    expect(parentFolder('ideas/plans.md')).toBe('ideas');
    expect(parentFolder('a/b/c.md')).toBe('a/b');
  });
});

describe('extractTitleFromMarkdown', () => {
  it('returns the first H1 heading text', () => {
    expect(extractTitleFromMarkdown('# Welcome')).toBe('Welcome');
    expect(extractTitleFromMarkdown('#  Hello World  ')).toBe('Hello World');
  });

  it('returns "" when no H1 is present', () => {
    expect(extractTitleFromMarkdown('No heading here')).toBe('');
    expect(extractTitleFromMarkdown('## Not an H1')).toBe('');
    expect(extractTitleFromMarkdown('')).toBe('');
  });

  it('returns the first H1 even when other headings follow', () => {
    expect(extractTitleFromMarkdown('# First\n\n## Second')).toBe('First');
  });

  it('handles multiline content', () => {
    expect(extractTitleFromMarkdown('# Title\n\nSome content here.')).toBe('Title');
  });
});

describe('nextDefaultName', () => {
  it('returns "Note" when no notes exist', () => {
    expect(nextDefaultName([])).toBe('Note');
  });

  it('returns "Note 2" when "Note" is taken', () => {
    expect(nextDefaultName(['Note'])).toBe('Note 2');
  });

  it('returns "Note 3" when "Note" and "Note 2" are taken', () => {
    expect(nextDefaultName(['Note', 'Note 2'])).toBe('Note 3');
  });

  it('is case-insensitive', () => {
    expect(nextDefaultName(['note'])).toBe('Note 2');
  });

  it('skips gaps when existing names have numbers', () => {
    expect(nextDefaultName(['Note', 'Note 3'])).toBe('Note 2');
  });

  it('handles non-"Note" seed names', () => {
    expect(nextDefaultName(['Todo'])).toBe('Todo 2');
  });
});

describe('FORBIDDEN_NAME_PATTERN', () => {
  it('matches slashes and backslashes', () => {
    expect(FORBIDDEN_NAME_PATTERN.test('/')).toBe(true);
    expect(FORBIDDEN_NAME_PATTERN.test('\\')).toBe(true);
    expect(FORBIDDEN_NAME_PATTERN.test('a/b')).toBe(true);
  });

  it('matches null bytes', () => {
    expect(FORBIDDEN_NAME_PATTERN.test('\0')).toBe(true);
  });

  it('matches ".."', () => {
    expect(FORBIDDEN_NAME_PATTERN.test('..')).toBe(true);
  });
});

describe('MAX_NOTE_NAME_LENGTH', () => {
  it('is a positive integer', () => {
    expect(typeof MAX_NOTE_NAME_LENGTH).toBe('number');
    expect(MAX_NOTE_NAME_LENGTH).toBeGreaterThan(0);
  });
});
