export function openTaskStack(id: string, parentId?: string): string[] {
  return parentId ? [parentId, id] : [id];
}

export function pushTaskStack(stack: string[], id: string): string[] {
  const idx = stack.indexOf(id);
  if (idx >= 0) return stack.slice(0, idx + 1);
  return [...stack, id];
}

export function popTaskStack(stack: string[]): string[] {
  return stack.slice(0, -1);
}

export function jumpTaskStack(stack: string[], index: number): string[] {
  return stack.slice(0, index + 1);
}
