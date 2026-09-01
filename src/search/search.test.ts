// search.test.ts
//
// Unit tests for the pure search orchestration module (search.ts): bookmark
// flattening and ranking, web fallback URL building, and the grouped
// Bookmarks → Notes → Tasks → Web orchestration.

import { describe, expect, it } from 'vitest';
import {
  buildWebSearchUrl,
  flattenBookmarks,
  orchestrateSearch,
  searchBookmarks,
} from './search';
import type { BookmarkNode } from '../hooks/useBookmarks';
import type { NoteEntry } from '../types/notes';
import type { Task } from '../tasks/tasks-model';
import type { WebSearchEngine } from '../hooks/useConfig';

const ENGINE: WebSearchEngine = { name: 'Google', urlTemplate: 'https://www.google.com/search?q={query}' };

function bookmark(id: string, title: string, url?: string, children?: BookmarkNode[]): BookmarkNode {
  return { id, title, url, children };
}

function note(id: string, title: string, content: string): NoteEntry {
  return { id, title, content, folder: '', modifiedAt: '2026-01-01T00:00:00.000Z' };
}

function task(id: string, title: string, description = ''): Task {
  return { id, title, description, status: 'todo', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', noteIds: [], bookmarkIds: [] };
}

describe('flattenBookmarks', () => {
  it('returns leaf bookmarks in depth-first order and skips folders', () => {
    const tree = [
      bookmark('f1', 'Folder A', undefined, [
        bookmark('b1', 'One', 'https://one.example'),
        bookmark('f2', 'Nested', undefined, [bookmark('b2', 'Two', 'https://two.example')]),
      ]),
      bookmark('b3', 'Three', 'https://three.example'),
    ];
    expect(flattenBookmarks(tree).map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('returns an empty list for an empty tree', () => {
    expect(flattenBookmarks([])).toEqual([]);
  });
});

describe('searchBookmarks', () => {
  const bookmarks = [
    bookmark('b1', 'TypeScript Handbook', 'https://typescriptlang.org/docs'),
    bookmark('b2', 'News', 'https://typescript-news.example'),
    bookmark('b3', 'Handbook of Chess', 'https://chess.example'),
  ];

  it('matches by title case-insensitively', () => {
    const results = searchBookmarks(bookmarks, 'handbook of');
    expect(results.map((r) => r.bookmark.id)).toEqual(['b3']);
    expect(results[0]?.matchType).toBe('title');
  });

  it('matches by URL when the title does not match', () => {
    const results = searchBookmarks(bookmarks, 'chess.example');
    expect(results.map((r) => r.bookmark.id)).toEqual(['b3']);
    expect(results[0]?.matchType).toBe('url');
  });

  it('ranks title matches above URL matches', () => {
    // 'typescript' matches b1 by title and b2 by URL — title must come first
    // regardless of input order.
    const results = searchBookmarks([...bookmarks].reverse(), 'typescript');
    expect(results.map((r) => r.bookmark.id)).toEqual(['b1', 'b2']);
    expect(results.map((r) => r.matchType)).toEqual(['title', 'url']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchBookmarks(bookmarks, '   ')).toEqual([]);
  });
});

describe('buildWebSearchUrl', () => {
  it('substitutes the URL-encoded query into the template', () => {
    expect(buildWebSearchUrl(ENGINE, 'hello world?')).toBe(
      'https://www.google.com/search?q=hello%20world%3F',
    );
  });

  it('returns null for an empty query', () => {
    expect(buildWebSearchUrl(ENGINE, '  ')).toBeNull();
  });
});

describe('orchestrateSearch', () => {
  const input = {
    bookmarkTree: [bookmark('f1', 'Folder', undefined, [bookmark('b1', 'React Docs', 'https://react.dev')])],
    notes: [note('react.md', 'React notes', 'hooks and components'), note('other.md', 'Other', 'react is mentioned here')],
    tasks: [task('t1', 'Learn React'), task('t2', 'Buy milk')],
    engine: ENGINE,
  };

  it('returns grouped results in Bookmarks → Notes → Tasks order plus the web URL', () => {
    const results = orchestrateSearch(input, 'react');
    expect(results.bookmarks.map((r) => r.bookmark.id)).toEqual(['b1']);
    expect(results.notes.map((r) => r.note.id)).toEqual(['react.md', 'other.md']);
    expect(results.tasks.map((t) => t.id)).toEqual(['t1']);
    expect(results.webUrl).toBe('https://www.google.com/search?q=react');
    expect(results.engine).toBe(ENGINE);
  });

  it('returns empty groups and a null webUrl for an empty query', () => {
    const results = orchestrateSearch(input, '  ');
    expect(results).toEqual({ bookmarks: [], notes: [], tasks: [], webUrl: null, engine: ENGINE });
  });

  it('still provides the web fallback when nothing matches locally', () => {
    const results = orchestrateSearch(input, 'nonexistent');
    expect(results.bookmarks).toEqual([]);
    expect(results.notes).toEqual([]);
    expect(results.tasks).toEqual([]);
    expect(results.webUrl).toBe('https://www.google.com/search?q=nonexistent');
  });

  it('caps each group at the given limit', () => {
    const manyNotes = Array.from({ length: 8 }, (_, i) => note(`n${i}.md`, `react ${i}`, ''));
    const results = orchestrateSearch({ ...input, notes: manyNotes }, 'react', 3);
    expect(results.notes).toHaveLength(3);
  });
});
