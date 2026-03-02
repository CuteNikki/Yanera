import { REST } from '@discordjs/rest';
import { Routes, type RESTGetAPIGatewayBotResult } from 'discord-api-types/v10';
import type { createClient } from 'redis';

type ExactRedisClient = ReturnType<typeof createClient>;
const SHARDS_PER_NODE = parseInt(process.env.SHARDS_PER_NODE || '16');

function formatMs(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

export async function claimShards(redis: ExactRedisClient, token: string, nodeId: string): Promise<{ shards: number[]; renewLock: () => Promise<void> }> {
  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`[Coordinator] Node ${nodeId} is asking Discord for recommended shards...`);
  const gatewayInfo = (await rest.get(Routes.gatewayBot())) as RESTGetAPIGatewayBotResult;
  const totalShards = gatewayInfo.shards;
  const { remaining, total, reset_after, max_concurrency } = gatewayInfo.session_start_limit;

  const totalChunks = Math.ceil(totalShards / SHARDS_PER_NODE);
  console.log(
    [
      `[Coordinator] --- Discord Gateway Info ---`,
      `[Coordinator] Total Shards: ${totalShards} (${totalChunks} chunks of ${SHARDS_PER_NODE})`,
      `[Coordinator] Session Limit: ${remaining}/${total} remaining`,
      `[Coordinator] Resets after: ${formatMs(reset_after)}`,
      `[Coordinator] Max Concurrency: ${max_concurrency}`,
      `[Coordinator] ---------------------------`,
    ].join('\n'),
  );

  while (true) {
    for (let chunkId = 0; chunkId < totalChunks; chunkId++) {
      const lockKey = `yanera:gateway:chunk:${chunkId}`;

      const acquired = await redis.set(lockKey, nodeId, {
        NX: true,
        EX: 20,
      });

      if (acquired) {
        const startShard = chunkId * SHARDS_PER_NODE;
        const endShard = Math.min((chunkId + 1) * SHARDS_PER_NODE - 1, totalShards - 1);

        const shards: number[] = [];
        for (let i = startShard; i <= endShard; i++) {
          shards.push(i);
        }

        console.log(`[Coordinator] Claimed Chunk ${chunkId} (Shards: ${startShard} to ${endShard})`);

        const renewLock = async () => {
          await redis.set(lockKey, nodeId, { EX: 20 });
        };

        return { shards, renewLock };
      }
    }

    console.log(`[Coordinator] All chunks are currently locked. Waiting 10 seconds to check for crashed nodes...`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}
