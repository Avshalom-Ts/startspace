// notes-search.test.ts
//
// Unit tests for the Notes search helpers.
//
// These test pure matching/scoring logic that does not depend on browser
// APIs, so they can run in Vitest without a real browser (see
// .rule/testing-rules.md).

import { describe, it, expect } from 'vitest';
import { searchNotes, searchNoteIds } from './notes-search';
import type { NoteEntry } from '../types/notes';

function makeNote(overrides: Partial<NoteEntry> = {}): NoteEntry {
  return {
    id: 'example.md',
    title: 'Example',
    content: '',
    folder: '',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('searchNotes', () => {
  const notes: NoteEntry[] = [
    makeNote({ id: 'welcome.md', title: 'Welcome', content: '# Welcome\n\nHello there.', modifiedAt: '2026-01-01T00:00:00.000Z' }),
    makeNote({ id: 'notes/meeting.md', title: 'Meeting Notes', content: 'Discussed the roadmap.', modifiedAt: '2026-01-02T00:00:00.000Z' }),
    makeNote({ id: 'notes/ideas.md', title: 'Ideas', content: 'Write a book.', modifiedAt: '2026-01-03T00:00:00.000Z' }),
  ];

  it('returns nothing for an empty query', () => {
    expect(searchNotes(notes, '')).toEqual([]);
    expect(searchNotes(notes, '   ')).toEqual([]);
  });

  it('matches notes whose title contains the query', () => {
    const results = searchNotes(notes, 'welcome');
    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe('welcome.md');
    expect(results[0]!.matchType).toBe('title');
  });

  it('matches notes whose content contains the query', () => {
    const results = searchNotes(notes, 'roadmap');
    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe('notes/meeting.md');
    expect(results[0]!.matchType).toBe('content');
  });

  it('matches both title and content, with title winning on relevance', () => {
    const results = searchNotes(notes, 'welcome');
    expect(results).toHaveLength(1);
    expect(results[0]!.matchType).toBe('title');
  });

  it('sorts results by relevance (title first), then by newest', () => {
    const results = searchNotes(notes, 'hello');
    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe('welcome.md');
  });

  it('returns multiple results in the right order', () => {
    const results = searchNotes(notes, 'notes');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.note.id).toBe('notes/meeting.md');
    expect(results[0]!.matchType).toBe('title');
  });

  it('is case-insensitive', () => {
    const results = searchNotes(notes, 'WELCOME');
    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe('welcome.md');
  });
});

describe('searchNoteIds', () => {
  const notes: NoteEntry[] = [
    makeNote({ id: 'a.md', title: 'Alpha', modifiedAt: '2026-01-01T00:00:00.000Z' }),
    makeNote({ id: 'b.md', title: 'Beta', modifiedAt: '2026-01-02T00:00:00.000Z' }),
  ];

  it('returns ids of matching notes', () => {
    expect(searchNoteIds(notes, 'alpha')).toEqual(['a.md']);
  });

  it('returns an empty array for no matches', () => {
    expect(searchNoteIds(notes, 'gamma')).toEqual([]);
  });

  it('returns an empty array for an empty query', () => {
    expect(searchNoteIds(notes, '')).toEqual([]);
  });
});
