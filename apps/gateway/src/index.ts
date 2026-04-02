import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';

import { GATEWAY_ID, getClaimKey, getShardConfiguration, redis, waitForIdentifyLock } from './coordinator';
import { handleDispatch } from './events';
import { shardPings } from './state';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const SHARDS_PER_NODE = 64;

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function bootstrap() {
  const { nodeShards, totalShards } = await getShardConfiguration(rest, SHARDS_PER_NODE);

  const manager = new WebSocketManager({
    token: DISCORD_TOKEN,
    intents: 1, // @todo: specify intents
    rest,
    shardCount: totalShards,
    shardIds: nodeShards,
  });

  manager.on(WebSocketShardEvents.HeartbeatComplete, ({ latency }, shardId) => {
    shardPings.set(shardId, latency);
    console.log(`[Shard ${shardId}] Latency: ${latency}ms`);
  });

  manager.on(WebSocketShardEvents.Dispatch, (event, shardId) => {
    handleDispatch(event, shardId);
  });

  setInterval(async () => {
    for (const id of nodeShards) {
      await redis.expire(getClaimKey(id), 30);
    }
  }, 15000);

  console.log(`[Gateway] [${GATEWAY_ID}] Claimed ${nodeShards.length} shards. Connecting...`);
  await waitForIdentifyLock();
  await manager.connect();
  console.log(`[Gateway] [${GATEWAY_ID}] Online.`);
}

bootstrap().catch(console.error);
