/** Friends + Challenge invites — codes + Realtime push, no SQL required. */

export type Friend = {
  /** 8-char share code */
  c: string;
  n: string;
  id?: string;
};

export type ChallengeInvite = {
  tableId: string;
  fromCode: string;
  fromName: string;
  at: number;
};

const FRIENDS_KEY = "pi_river_friends_v1";
const INBOX_KEY = "pi_river_invite_inbox_v1";

export function friendCodeFromUserId(userId: string) {
  return userId.replace(/-/g, "").slice(-8).toUpperCase();
}

export function normalizeFriendCode(raw: string) {
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
}

export function readFriends(): Friend[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Friend[];
    return Array.isArray(parsed)
      ? parsed.filter((f) => f && typeof f.c === "string").slice(0, 40)
      : [];
  } catch {
    return [];
  }
}

export function writeFriends(friends: Friend[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends.slice(0, 40)));
    window.dispatchEvent(new Event("pi-river-friends"));
  } catch {
    // ignore
  }
}

export function upsertFriend(friend: Friend) {
  const code = normalizeFriendCode(friend.c);
  if (code.length < 4) return readFriends();
  const prev = readFriends().filter((f) => f.c !== code);
  const next = [{ ...friend, c: code, n: friend.n || "Friend" }, ...prev].slice(0, 40);
  writeFriends(next);
  return next;
}

export function removeFriend(code: string) {
  const next = readFriends().filter((f) => f.c !== normalizeFriendCode(code));
  writeFriends(next);
  return next;
}

export function readInviteInbox(): ChallengeInvite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChallengeInvite[];
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && i.tableId && i.at > cutoff).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

export function pushInviteInbox(invite: ChallengeInvite) {
  if (typeof window === "undefined") return;
  const prev = readInviteInbox().filter((i) => i.tableId !== invite.tableId);
  const next = [invite, ...prev].slice(0, 12);
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pi-river-inbox"));
  } catch {
    // ignore
  }
}

export function dismissInvite(tableId: string) {
  const next = readInviteInbox().filter((i) => i.tableId !== tableId);
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pi-river-inbox"));
  } catch {
    // ignore
  }
}

export function friendChannel(code: string) {
  return `river-friend-${normalizeFriendCode(code)}`;
}

export function ladderPresenceChannel() {
  return "river-ladder-live";
}
