import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ConnectionStatus } from '../types/poll';
import type { RealtimeEvent } from './room.protocol';
import { getSupabaseClient } from './supabase.client';
import { EventDeduplicator, parseAndValidateEvent } from './room.events';

export interface RoomChannelSubscription {
  broadcast: (event: RealtimeEvent) => Promise<boolean>;
  unsubscribe: () => void;
  getTransportType: () => 'supabase' | 'local';
}

export interface RoomChannelHandler {
  onEvent: (event: RealtimeEvent) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

// Global in-memory broadcast bus for fallback / local testing across tabs or windows
type LocalListener = (raw: unknown) => void;
const localTopicListeners = new Map<string, Set<LocalListener>>();

/**
 * Fallback local broadcaster using Window BroadcastChannel if available
 */
class LocalChannelTransport {
  private channelName: string;
  private bc: BroadcastChannel | null = null;
  private listeners = new Set<LocalListener>();

  constructor(topic: string) {
    this.channelName = `poll_local_${topic}`;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.bc = new BroadcastChannel(this.channelName);
        this.bc.onmessage = (ev) => {
          this.notify(ev.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel error, using memory fallback:', err);
      }
    }

    if (!localTopicListeners.has(topic)) {
      localTopicListeners.set(topic, new Set());
    }
    const memSet = localTopicListeners.get(topic)!;
    this.localMemCallback = (raw: unknown) => this.notify(raw);
    memSet.add(this.localMemCallback);
  }

  private localMemCallback: LocalListener;

  addListener(fn: LocalListener) {
    this.listeners.add(fn);
  }

  removeListener(fn: LocalListener) {
    this.listeners.delete(fn);
  }

  private notify(data: unknown) {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  broadcast(payload: unknown) {
    if (this.bc) {
      this.bc.postMessage(payload);
    }
    const memSet = localTopicListeners.get(this.channelName.replace('poll_local_', ''));
    if (memSet) {
      for (const cb of memSet) {
        if (cb !== this.localMemCallback) {
          cb(payload);
        }
      }
    }
  }

  destroy(topic: string) {
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    const memSet = localTopicListeners.get(topic);
    if (memSet) {
      memSet.delete(this.localMemCallback);
    }
    this.listeners.clear();
  }
}

/**
 * Subscribe to a room's realtime channel.
 * Uses Supabase Realtime Broadcast if configured, or in-memory/BroadcastChannel if unconfigured.
 */
export function subscribeToRoomChannel(
  roomId: string,
  handler: RoomChannelHandler
): RoomChannelSubscription {
  const deduplicator = new EventDeduplicator(300);
  const client = getSupabaseClient();
  const topic = `poll:${roomId}`;

  if (!client) {
    const local = new LocalChannelTransport(topic);

    const onRaw = (raw: unknown) => {
      const parsed = parseAndValidateEvent(raw);
      if (parsed) {
        if (!deduplicator.isDuplicate(parsed.eventId)) {
          handler.onEvent(parsed);
        }
      }
    };
    local.addListener(onRaw);

    const subscription: RoomChannelSubscription = {
      broadcast: async (event: RealtimeEvent): Promise<boolean> => {
        local.broadcast(event);
        return true;
      },
      unsubscribe: () => {
        local.removeListener(onRaw);
        local.destroy(topic);
        handler.onStatusChange('disconnected');
      },
      getTransportType: () => 'local',
    };

    // Asynchronously trigger connected so caller can finish assigning subscription variable
    queueMicrotask(() => {
      handler.onStatusChange('connected');
    });

    return subscription;
  }

  // Supabase is configured: create real Supabase channel
  queueMicrotask(() => {
    handler.onStatusChange('connecting');
  });

  const channel: RealtimeChannel = client.channel(topic, {
    config: {
      broadcast: {
        self: true, // receive own broadcasts
        ack: true,  // request ack
      },
    },
  });

  channel.on('broadcast', { event: 'poll_event' }, (message) => {
    const raw = message.payload;
    const parsed = parseAndValidateEvent(raw);
    if (parsed) {
      if (!deduplicator.isDuplicate(parsed.eventId)) {
        handler.onEvent(parsed);
      }
    }
  });

  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      handler.onStatusChange('connected');
    } else if (status === 'TIMED_OUT') {
      handler.onStatusChange('reconnecting');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[Supabase Realtime Error]', error);
      handler.onStatusChange('reconnecting');
    } else if (status === 'CLOSED') {
      handler.onStatusChange('disconnected');
    }
  });

  return {
    broadcast: async (event: RealtimeEvent): Promise<boolean> => {
      try {
        const resp = await channel.send({
          type: 'broadcast',
          event: 'poll_event',
          payload: event,
        });
        return resp === 'ok';
      } catch (err) {
        console.error('[Broadcast failed]', err);
        return false;
      }
    },
    unsubscribe: () => {
      channel.unsubscribe();
      client.removeChannel(channel);
      deduplicator.clear();
      handler.onStatusChange('disconnected');
    },
    getTransportType: () => 'supabase',
  };
}
