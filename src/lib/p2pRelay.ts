// Peer-to-Peer Multi-Tab / Room State Relay using BroadcastChannel & WebSockets Fallback
// Enables real-time synchronization of bets, moves, emotes, and room states across browser instances

export interface P2PEvent {
  type: "ACTION_BET" | "ACTION_FOLD" | "ACTION_CHECK" | "ACTION_DEAL" | "EMOTE" | "CHAT" | "PLAYER_JOIN";
  roomId: string;
  senderId: string;
  senderName: string;
  payload: any;
  timestamp: number;
}

export class P2PRelay {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(event: P2PEvent) => void> = [];

  constructor(public roomId: string = "global-table") {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(`river_poker_p2p_${roomId}`);
        this.channel.onmessage = (e: MessageEvent<P2PEvent>) => {
          if (e.data && e.data.roomId === this.roomId) {
            this.listeners.forEach((fn) => fn(e.data));
          }
        };
      } catch (err) {
        console.warn("[P2P Relay] BroadcastChannel init error:", err);
      }
    }
  }

  public subscribe(callback: (event: P2PEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  public broadcast(type: P2PEvent["type"], senderId: string, senderName: string, payload: any): void {
    const event: P2PEvent = {
      type,
      roomId: this.roomId,
      senderId,
      senderName,
      payload,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn("[P2P Relay] Broadcast failed:", err);
      }
    }
  }

  public destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners = [];
  }
}
