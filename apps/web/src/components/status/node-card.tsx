import { Doc } from '@yanera/database';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ActivityIcon, ChevronDownIcon, ClockIcon, CpuIcon, RadioIcon, SignalIcon, ZapIcon } from 'lucide-react';

import { cn, formatDuration, getNodeStatus } from '@/lib/utils';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusNodeCardProps {
  node: Doc<'nodes'>;
  now: number;
  highlightedShardId?: number | null;
}

const formatCompact = (val: number) => val.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 });

export function StatusNodeCard({ node, highlightedShardId, now }: StatusNodeCardProps) {
  const hasHighlightedShard = highlightedShardId !== null && node.shardData?.some((s) => s.id === highlightedShardId);
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || !!hasHighlightedShard;

  const status = getNodeStatus(node.lastHeartbeat, now);
  const isGateway = node.type === 'gateway';

  const heartbeatAgo = formatDuration(now - node.lastHeartbeat);
  const uptime = formatDuration(now - node.startedAt);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasHighlightedShard && highlightRef.current) {
      const timeout = setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      return () => clearTimeout(timeout);
    }
  }, [hasHighlightedShard, highlightedShardId]);

  const stats = useMemo(() => {
    if (!isGateway || !node.shardData?.length) {
      return { totalGuilds: 0, unavailableGuilds: 0, eps: node.eventsPerSecond || 0, totalEvents: node.totalEvents || 0, ping: 0 };
    }

    let guilds = 0,
      unavail = 0,
      eps = 0,
      events = 0,
      pingSum = 0;

    for (const shard of node.shardData) {
      guilds += shard.activeGuildIds.length;
      unavail += shard.unavailableGuildIds.length;
      eps += shard.eventsPerSecond || 0;
      events += shard.totalEvents || 0;
      pingSum += shard.ping || 0;
    }

    return {
      totalGuilds: guilds,
      unavailableGuilds: unavail,
      eps,
      totalEvents: events,
      ping: Math.round(pingSum / node.shardData.length),
    };
  }, [isGateway, node.shardData, node.eventsPerSecond, node.totalEvents]);

  return (
    <Card
      className={cn(
        'h-fit transition-colors bg-accent/30 [content-visibility:auto]',
        status === 'offline' && 'bg-red-500/3 ring-1 ring-red-500/30',
        status === 'unresponsive' && 'bg-yellow-500/5 ring-1 ring-yellow-500/30',
      )}
    >
      {/* --- HEADER --- */}
      <CardHeader onClick={() => setExpanded(!isExpanded)} className='flex cursor-pointer items-center justify-between gap-4'>
        <div className='bg-secondary flex size-8 shrink-0 items-center justify-center rounded-md'>
          {isGateway ? <RadioIcon className='text-chart-4 size-4 shrink-0' /> : <CpuIcon className='text-chart-2 size-4 shrink-0' />}
        </div>

        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <CardTitle className='font-mono text-sm font-medium'>{node.nodeId}</CardTitle>
          <CardDescription className='xs:flex-row flex flex-col gap-1 space-x-2 text-xs'>
            <div className='flex items-center gap-1'>
              <ClockIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{uptime}</span>
            </div>
            <div className={cn('flex items-center gap-1', status === 'offline' ? 'text-red-500' : status === 'unresponsive' ? 'text-yellow-500' : '')}>
              <ActivityIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{heartbeatAgo}</span>
            </div>
            <div className='flex items-center gap-1'>
              <ZapIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{stats.eps > 0 ? `${formatCompact(stats.eps)} / s` : 'N/A'}</span>
            </div>
            {isGateway && stats.ping > 0 && (
              <div className='flex items-center gap-1'>
                <SignalIcon className='size-4 shrink-0' />
                <span className='tabular-nums'>{stats.ping} ms</span>
              </div>
            )}
          </CardDescription>
        </div>
        <ChevronDownIcon className={cn('text-muted-foreground size-4 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
      </CardHeader>

      {isExpanded && (
        <div className='border-t px-4 pt-4'>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-wrap gap-4 text-xs'>
              <div className='space-y-1'>
                <span className='text-muted-foreground'>Uptime</span>
                <div className='text-foreground font-medium'>{uptime}</div>
              </div>
              <div className='space-y-1'>
                <span className='text-muted-foreground'>Last Heartbeat</span>
                <div className='text-foreground font-medium'>{heartbeatAgo}</div>
              </div>
              <div className='space-y-1'>
                <span className='text-muted-foreground'>Events/s</span>
                <div className='text-foreground font-medium'>{stats.eps > 0 ? formatCompact(stats.eps) : 'N/A'}</div>
              </div>
              <div className='space-y-1'>
                <span className='text-muted-foreground'>Total Events</span>
                <div className='text-foreground font-medium'>{stats.totalEvents > 0 ? formatCompact(stats.totalEvents) : '0'}</div>
              </div>
              <div className='space-y-1'>
                <span className='text-muted-foreground'>Memory Usage</span>
                <div className='text-foreground font-medium'>{node.memoryUsage} MB</div>
              </div>

              {/* Gateway-Only Stats */}
              {isGateway && (
                <>
                  <div className='space-y-1'>
                    <span className='text-muted-foreground'>Total Guilds</span>
                    <div className='text-foreground font-medium'>{formatCompact(stats.totalGuilds)}</div>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-muted-foreground'>Unavailable</span>
                    <div className='text-foreground font-medium'>{formatCompact(stats.unavailableGuilds)}</div>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-muted-foreground'>Latency</span>
                    <div className='text-foreground font-medium'>{stats.ping} ms</div>
                  </div>
                </>
              )}
            </div>

            {/* Gateway Shards Grid */}
            {isGateway && node.shardData && node.shardData.length > 0 && (
              <div className='xs:grid-cols-6 grid grid-cols-3 gap-1 sm:grid-cols-8'>
                {node.shardData.map((shard) => {
                  const isHighlighted = highlightedShardId === shard.id;
                  return (
                    <Tooltip key={shard.id}>
                      <TooltipTrigger asChild>
                        <div
                          ref={isHighlighted ? highlightRef : undefined}
                          className={cn(
                            'flex flex-col items-center justify-center rounded border p-1 text-center transition-all',
                            isHighlighted ? 'shard-highlight' : 'bg-accent/50',
                          )}
                        >
                          <span className='text-foreground font-mono text-sm font-medium'>{shard.id}</span>
                          <span className='text-muted-foreground text-xs'>{shard.ping} ms</span>
                          <span className='text-muted-foreground text-xs'>{shard.eventsPerSecond} e/s</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className='flex flex-col text-xs'>
                          <div className='font-medium'>Shard {shard.id}</div>
                          <div>Ping: {shard.ping} ms</div>
                          <div>Events per Second: {shard.eventsPerSecond?.toLocaleString()}</div>
                          <div>Total Events: {shard.totalEvents?.toLocaleString()}</div>
                          <div>Total Guilds: {shard.activeGuildIds.length?.toLocaleString()} active</div>
                          <div>Guilds Unavailable: {shard.unavailableGuildIds.length?.toLocaleString()}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
