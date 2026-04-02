import { API } from '@discordjs/core';
import { REST } from '@discordjs/rest';
import Redis from 'ioredis';

import { handleInteraction } from './handlers/interaction';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN environment variable is not set.');
  process.exit(1);
}

const redis = new Redis({ host: '127.0.0.1', port: 6379 });
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const api = new API(rest);

async function startWorker() {
  console.log('[Worker] Connecting to Redis firehose...');

  await redis.subscribe('discord-events');

  redis.on('message', async (channel, message) => {
    if (channel !== 'discord-events') return;

    const { event, data, shardId } = JSON.parse(message);

    console.log(`[Worker] [Shard ${shardId}] Received event: ${event}`);

    if (event === 'INTERACTION_CREATE') {
      try {
        const response = await handleInteraction(data);
        if (response) {
          await api.interactions.reply(data.id, data.token, response);
        }
      } catch (err) {
        console.error(`[Worker] [Shard ${shardId}] Error processing interaction:`, err);
      }
    }
  });

  console.log('[Worker] System online. Waiting for events...');
}

startWorker().catch(console.error);
