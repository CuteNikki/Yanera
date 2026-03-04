import { Doc, Id } from '@yanera/database';

const hosts = ['yanera-01', 'yanera-02', 'yanera-03', 'yanera-04', 'yanera-05', 'yanera-06'];
const GATEWAYS_PER_HOST = 6;
const SHARDS_PER_GATEWAY = 64;
const GUILDS_PER_SHARD = 1600;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateContainerHash(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length })
    .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
    .join('');
}

function generateMockSnowflake(shardId: number, guildIndex: number): string {
  const base = BigInt('110000000000000000');
  const shardPart = BigInt(shardId) * BigInt('10000000');
  const indexPart = BigInt(guildIndex);
  return (base + shardPart + indexPart).toString();
}

let isInitialized = false;
let mockNodes: Doc<'nodes'>[] = [];

const nodeHealth = new Map<string, 'healthy' | 'unresponsive' | 'offline'>();

export function getMockNodes(): Doc<'nodes'>[] {
  const now = Date.now();

  if (!isInitialized) {
    let globalShardId = 0;

    for (const host of hosts) {
      for (let g = 1; g <= GATEWAYS_PER_HOST; g++) {
        const shardData = [];
        const gatewayHash = generateContainerHash(9);
        const gatewayStartedAt = now - randomBetween(1000 * 60 * 60 * 2, 1000 * 60 * 60 * 24 * 7);
        const gatewayId = `gateway-${host}-${g}` as Id<'nodes'>;

        const gwRoll = Math.random();
        nodeHealth.set(gatewayId, gwRoll > 0.95 ? 'offline' : gwRoll > 0.9 ? 'unresponsive' : 'healthy');

        for (let s = 0; s < SHARDS_PER_GATEWAY; s++) {
          const activeGuildIds: string[] = [];
          const unavailableGuildIds: string[] = [];

          const hasOutage = Math.random() > 0.9;
          const numUnavailable = hasOutage ? randomBetween(1, 5) : 0;

          for (let i = 0; i < GUILDS_PER_SHARD; i++) {
            const snowflake = generateMockSnowflake(globalShardId, i);
            if (i < numUnavailable) {
              unavailableGuildIds.push(snowflake);
            } else {
              activeGuildIds.push(snowflake);
            }
          }

          const initialEps = parseFloat((randomBetween(40, 79) + Math.random()).toFixed(2));
          const initialEvents = randomBetween(500000, 2000000);

          shardData.push({
            id: globalShardId,
            ping: randomBetween(20, 60),
            totalEvents: initialEvents,
            eventsPerSecond: initialEps,
            activeGuildIds,
            unavailableGuildIds,
          });

          const workerStartedAt = now - randomBetween(1000 * 60 * 30, 1000 * 60 * 60 * 24 * 3);
          const workerId = `worker-shard-${globalShardId}` as Id<'nodes'>;

          const workerRoll = Math.random();
          nodeHealth.set(workerId, workerRoll > 0.98 ? 'offline' : workerRoll > 0.95 ? 'unresponsive' : 'healthy');

          mockNodes.push({
            _id: workerId,
            _creationTime: workerStartedAt,
            nodeId: `worker-${generateContainerHash(7)}`,
            type: 'worker',
            hostName: host,
            startedAt: workerStartedAt,
            lastHeartbeat: now - randomBetween(100, 5000),
            memoryUsage: randomBetween(128, 256),
            totalEvents: initialEvents,
            eventsPerSecond: initialEps,
            shardData: undefined,
          });

          globalShardId++;
        }

        mockNodes.push({
          _id: gatewayId,
          _creationTime: gatewayStartedAt,
          nodeId: `gateway-${gatewayHash}`,
          type: 'gateway',
          hostName: host,
          startedAt: gatewayStartedAt,
          lastHeartbeat: now - randomBetween(100, 5000),
          memoryUsage: randomBetween(1024, 2048),
          totalEvents: 0,
          eventsPerSecond: 0,
          shardData,
        });
      }
    }
    isInitialized = true;
    console.log(`[Mock] Initialized ${mockNodes.length} nodes with failure states!`);
  }

  mockNodes = mockNodes.map((node) => {
    const health = nodeHealth.get(node._id) || 'healthy';

    if (health === 'offline') {
      return {
        ...node,
        eventsPerSecond: 0,
        shardData: node.shardData?.map((s) => ({ ...s, eventsPerSecond: 0, ping: 0 })),
      };
    }

    const jitteredHeartbeat = health === 'unresponsive' ? now - randomBetween(21000, 29000) : now - randomBetween(100, 2500);

    if (node.type === 'gateway' && node.shardData) {
      const updatedShardData = node.shardData.map((shard) => {
        if (health === 'unresponsive') {
          return {
            ...shard,
            ping: randomBetween(2000, 9000), // Massive lag
            eventsPerSecond: parseFloat((Math.random() * 2).toFixed(2)), // Barely processing
          };
        }

        let newEps = (shard.eventsPerSecond || 0) + (Math.random() * 6 - 3);
        newEps = Math.max(40, Math.min(85, newEps));
        const eventsProcessed = Math.floor(newEps * 15);
        const newPing = Math.random() > 0.985 ? randomBetween(400, 900) : randomBetween(20, 70);

        return {
          ...shard,
          ping: newPing,
          eventsPerSecond: parseFloat(newEps.toFixed(2)),
          totalEvents: shard.totalEvents + eventsProcessed,
        };
      });

      return {
        ...node,
        lastHeartbeat: jitteredHeartbeat,
        memoryUsage: Math.max(500, node.memoryUsage + randomBetween(-10, 10)),
        shardData: updatedShardData,
      };
    } else {
      if (health === 'unresponsive') {
        return {
          ...node,
          lastHeartbeat: jitteredHeartbeat,
          eventsPerSecond: parseFloat((Math.random() * 2).toFixed(2)),
        };
      }

      let newEps = (node.eventsPerSecond || 0) + (Math.random() * 6 - 3);
      newEps = Math.max(40, Math.min(85, newEps));
      const eventsProcessed = Math.floor(newEps * 15);

      return {
        ...node,
        lastHeartbeat: jitteredHeartbeat,
        memoryUsage: Math.max(100, node.memoryUsage + randomBetween(-5, 5)),
        eventsPerSecond: parseFloat(newEps.toFixed(2)),
        totalEvents: (node.totalEvents || 0) + eventsProcessed,
      };
    }
  });

  return mockNodes;
}
