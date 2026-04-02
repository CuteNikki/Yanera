import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { redis } from './coordinator';
import { availableGuilds, unavailableGuilds } from './state';

export function handleDispatch(event: any, shardId: number) {
  const { t: type, d: data } = event;

  switch (type) {
    case GatewayDispatchEvents.Ready:
      const available = new Set<string>();
      const unavailable = new Set<string>();
      data.guilds.forEach((g: any) => (g.unavailable ? unavailable.add(g.id) : available.add(g.id)));
      availableGuilds.set(shardId, available);
      unavailableGuilds.set(shardId, unavailable);
      break;

    case GatewayDispatchEvents.GuildCreate:
      if (data.unavailable) {
        unavailableGuilds.get(shardId)?.add(data.id);
        availableGuilds.get(shardId)?.delete(data.id);
      } else {
        availableGuilds.get(shardId)?.add(data.id);
        unavailableGuilds.get(shardId)?.delete(data.id);
      }
      break;

    case GatewayDispatchEvents.GuildDelete:
      availableGuilds.get(shardId)?.delete(data.id);
      unavailableGuilds.get(shardId)?.delete(data.id);
      break;
  }

  redis.publish('discord-events', JSON.stringify({ event: type, data, shardId }));
}
