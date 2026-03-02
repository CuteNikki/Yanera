import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { createClient } from 'redis';

import { claimShards } from './claimShards';
import { startGatewayHeartbeat } from './heartbeat';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error('DISCORD_TOKEN is not defined in the environment variables.');
}

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const HOST_NAME = process.env.PHYSICAL_HOSTNAME || process.env.COMPUTERNAME || 'unknown-host';
const NODE_ID = `gateway-${process.env.HOSTNAME}`;

console.log(`[Gateway] Starting ${NODE_ID} on ${HOST_NAME}`);

const { shards: claimedShards, renewLock } = await claimShards(redis, token, NODE_ID);

const rest = new REST({ version: '10' }).setToken(token);

const manager = new WebSocketManager({
  token,
  intents: 1,
  rest,
  shardIds: claimedShards,
});

const shardPings = new Map<number, number>();
const shardEvents = new Map<number, number>();
const activeGuildIds = new Map<number, Set<string>>();
const unavailableGuildIds = new Map<number, Set<string>>();

manager.on(WebSocketShardEvents.HeartbeatComplete, ({ latency }, shardId) => {
  shardPings.set(shardId, latency);
});

manager.on(WebSocketShardEvents.Dispatch, async (event, shardId) => {
  shardEvents.set(shardId, (shardEvents.get(shardId) || 0) + 1);

  if (event.t === GatewayDispatchEvents.Ready) {
    console.log(`[Gateway] Shard ${shardId} received READY event. User: ${event.d.user.username}#${event.d.user.discriminator}`);
    const shardActiveGuilds = new Set<string>();
    const shardUnavailableGuilds = new Set<string>();

    for (const guild of event.d.guilds) {
      if (guild.unavailable) {
        shardUnavailableGuilds.add(guild.id);
      } else {
        shardActiveGuilds.add(guild.id);
      }
    }
    activeGuildIds.set(shardId, shardActiveGuilds);
    unavailableGuildIds.set(shardId, shardUnavailableGuilds);
  } else if (event.t === GatewayDispatchEvents.GuildCreate) {
    const guildId = event.d.id;
    if (event.d.unavailable) {
      unavailableGuildIds.get(shardId)?.add(guildId);
      activeGuildIds.get(shardId)?.delete(guildId);
    } else {
      activeGuildIds.get(shardId)?.add(guildId);
      unavailableGuildIds.get(shardId)?.delete(guildId);
    }
  } else if (event.t === GatewayDispatchEvents.GuildDelete) {
    const guildId = event.d.id;
    activeGuildIds.get(shardId)?.delete(guildId);
    unavailableGuildIds.get(shardId)?.delete(guildId);
  }

  redis.rPush('discord_events_queue', JSON.stringify({ event: event.t, data: event.d })).catch((err) => {
    console.error(`[Gateway] Failed to push event to Redis queue:`, err);
  });
});

await startGatewayHeartbeat(manager, shardPings, shardEvents, activeGuildIds, unavailableGuildIds, NODE_ID, HOST_NAME, renewLock);
await manager.connect();
console.log(`[Gateway] ${NODE_ID} is online and listening for shards: ${claimedShards.join(', ')}`);
