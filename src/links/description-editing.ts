const editing = new Set<string>();

export function setDescriptionEditing(id: string, active: boolean) {
  if (active) editing.add(id);
  else editing.delete(id);
}

export function isDescriptionEditing(id: string) {
  return editing.has(id);
}
