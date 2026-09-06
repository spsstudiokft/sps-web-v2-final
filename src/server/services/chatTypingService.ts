type ChatKind = "client" | "staff";

const activeTyping = new Map<string, { actorId: string; actorRole: string; expiresAt: number }>();
const keyFor = (kind: ChatKind, conversationId: string, actorId: string) => `${kind}:${conversationId}:${actorId}`;

export function setChatTyping(kind: ChatKind, conversationId: string, actorId: string, actorRole: string, typing: boolean) {
  const key = keyFor(kind, conversationId, actorId);
  if (!typing) return activeTyping.delete(key);
  activeTyping.set(key, { actorId, actorRole, expiresAt: Date.now() + 5_500 });
}

export function getChatTyping(kind: ChatKind, conversationId: string, viewerId: string) {
  const now = Date.now();
  const actors: Array<{ role: string }> = [];
  for (const [key, value] of activeTyping) {
    if (value.expiresAt <= now) { activeTyping.delete(key); continue; }
    if (key.startsWith(`${kind}:${conversationId}:`) && value.actorId !== viewerId) actors.push({ role: value.actorRole });
  }
  return actors;
}
