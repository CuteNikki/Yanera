import { REST } from '@discordjs/rest';
import { Routes, type RESTGetAPIGatewayBotResult } from 'discord-api-types/v10';
import Redis from 'ioredis';

export const redis = new Redis({ host: '127.0.0.1', port: 6379 });
export const GATEWAY_ID = `gateway-${process.env.HOSTNAME || 'local'}`;

export const getClaimKey = (shardId: number) => `shard_claim:${shardId}`;

export async function getShardConfiguration(rest: REST, shardsPerNode: number) {
  const gatewayInfo = (await rest.get(Routes.gatewayBot())) as RESTGetAPIGatewayBotResult;
  const totalShards = gatewayInfo.shards;

  const nodeShards: number[] = [];
  for (let id = 0; id < totalShards; id++) {
    if (nodeShards.length >= shardsPerNode) break;

    const acquired = await redis.set(getClaimKey(id), GATEWAY_ID, 'EX', 60, 'NX');
    if (acquired === 'OK') {
      nodeShards.push(id);
    }
  }

  return { nodeShards, totalShards, gatewayInfo };
}

export async function waitForIdentifyLock() {
  while (true) {
    const lock = await redis.set('discord:identify-lock', GATEWAY_ID, 'EX', 5, 'NX');
    if (lock === 'OK') return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
