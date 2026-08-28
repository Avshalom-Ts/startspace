export const MAX_NOTE_NAME_LENGTH = 100;
export const FORBIDDEN_NAME_PATTERN = /[\\/\\\\]|\0|\.\./;

export function slugifyNoteName(title: string): string {
  const cleaned = title.trim().replace(/[^\p{L}\p{N}\s._\-/]/gu, '-');
  const collapsed = cleaned.replace(/[-\s]+/g, '-').replace(/^-+|-+$/g, '');
  const segmented = collapsed.replace(/(\d)([A-Za-z])/g, '$1-$2').replace(/([A-Za-z])(\d)/g, '$1-$2');
  return segmented.length > 0 ? segmented.toLowerCase() : 'untitled';
}

export function noteFolder(id: string): string {
  const idx = id.lastIndexOf('/');
  return idx >= 0 ? id.slice(0, idx) : '';
}

export function noteDisplayName(id: string): string {
  const base = id.endsWith('.md') ? id.slice(0, -3) : id;
  return base.split('/').pop() ?? base;
}

export function replaceNameComponent(id: string, newName: string): string {
  const idx = id.lastIndexOf('/');
  return idx >= 0 ? id.slice(0, idx + 1) + newName : newName;
}

export function parentFolder(id: string): string {
  const idx = id.lastIndexOf('/');
  return idx >= 0 ? id.slice(0, idx) : '';
}

export function extractTitleFromMarkdown(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

export function nextDefaultName(existingNames: string[]): string {
  const used = new Set(existingNames.map(name => name.toLowerCase()));
  if (!used.has('note')) {
    const seed = existingNames[0];
    return seed ? `${seed} 2` : 'Note';
  }
  let number = 2;
  while (used.has(`note ${number}`)) number++;
  return `Note ${number}`;
}
