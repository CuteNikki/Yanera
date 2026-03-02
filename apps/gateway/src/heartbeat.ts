import { WebSocketManager } from '@discordjs/ws';
import { api } from '@yanera/database';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const STARTED_AT = Date.now();

const lastShardEventCounts = new Map<number, number>();

export async function startGatewayHeartbeat(
  manager: WebSocketManager,
  shardPings: Map<number, number>,
  shardEvents: Map<number, number>,
  activeGuildIds: Map<number, Set<string>>,
  unavailableGuildIds: Map<number, Set<string>>,
  nodeId: string,
  hostName: string,
  renewLock: () => Promise<void>,
) { 
  console.log(`[Heartbeat] Starting heartbeat for ${nodeId} on ${hostName}`);

  setInterval(async () => {
    try {
      await renewLock();
      const activeShards = await manager.getShardIds();

      const shardData = activeShards.map((shardId) => {
        const currentShardTotal = shardEvents.get(shardId) || 0;
        const lastShardTotal = lastShardEventCounts.get(shardId) || 0;

        const shardDelta = currentShardTotal - lastShardTotal;
        const shardRawEPS = shardDelta / 15;
        const shardEPS = shardRawEPS > 0 && shardRawEPS < 1 ? parseFloat(shardRawEPS.toFixed(2)) : Math.round(shardRawEPS);

        lastShardEventCounts.set(shardId, currentShardTotal);

        return {
          id: shardId,
          ping: shardPings.get(shardId) || 0,
          totalEvents: currentShardTotal,
          eventsPerSecond: shardEPS,
          activeGuildIds: Array.from(activeGuildIds.get(shardId) || []),
          unavailableGuildIds: Array.from(unavailableGuildIds.get(shardId) || []),
        };
      });

      const memoryUsage = Math.round(process.memoryUsage().rss / 1024 / 1024);

      await convex.mutation(api.nodes.heartbeat, {
        hostName: hostName,
        nodeId: nodeId,
        type: 'gateway',
        shards: activeShards,
        shardData: shardData,
        memoryUsage: memoryUsage,
        startedAt: STARTED_AT,
        lastHeartbeat: Date.now(),
      });
      const shardsWithPing = shardData.filter((shard) => shard.ping > 0);
      const averagePing = shardsWithPing.length > 0 ? shardsWithPing.reduce((sum, shard) => sum + shard.ping, 0) / shardsWithPing.length : 0;

      console.log(
        [
          `[Heartbeat] Sent heartbeat for ${nodeId}.`,
          `Memory Usage: ${memoryUsage}MB.`,
          `Shards: ${activeShards.length}.`,
          `Average Ping: ${averagePing > 0 ? Math.round(averagePing) + 'ms' : 'N/A'}.`,
          `Events/s: ${shardData.reduce((sum, shard) => sum + (shard.eventsPerSecond || 0), 0).toFixed(2)}.`,
          `Active Guilds: ${shardData.reduce((sum, shard) => sum + shard.activeGuildIds.length, 0)}.`,
          `Unavailable Guilds: ${shardData.reduce((sum, shard) => sum + shard.unavailableGuildIds.length, 0)}.`,
        ].join(' '),
      );
    } catch (error) {
      console.error('[Heartbeat] Failed to send gateway heartbeat to Convex:', error);
    }
  }, 15000);
}
