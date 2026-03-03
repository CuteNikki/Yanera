import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  guildSettings: defineTable({
    guildId: v.string(),
  }).index('by_guildId', ['guildId']),

  nodes: defineTable({
    hostName: v.string(),
    nodeId: v.string(),
    type: v.union(v.literal('gateway'), v.literal('worker')),
    memoryUsage: v.number(),
    startedAt: v.number(),
    lastHeartbeat: v.number(),
    
    // Gateway specific data
    shards: v.optional(v.array(v.number())),
    shardData: v.optional(
      v.array(
        v.object({
          id: v.number(),
          ping: v.number(),
          totalEvents: v.number(),
          eventsPerSecond: v.optional(v.number()),
          activeGuildIds: v.array(v.string()),
          unavailableGuildIds: v.array(v.string()),
        }),
      ),
    ),

    // Worker specific data
    totalEvents: v.optional(v.number()),
    eventsPerSecond: v.optional(v.number()),
  })
    .index('by_nodeId', ['nodeId'])
    .index('by_type_and_host', ['type', 'hostName']),
});
