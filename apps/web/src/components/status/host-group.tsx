import { Doc } from '@yanera/database';
import { useMemo, useState } from 'react';

import { ChevronDownIcon, CpuIcon, MemoryStickIcon, RadioIcon, ServerIcon, SignalIcon, ZapIcon } from 'lucide-react';

import { cn, getNodeStatus } from '@/lib/utils';

import { StatusNodeCard } from '@/components/status/node-card';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusHostGroupProps {
  hostName: string;
  nodes: Doc<'nodes'>[];
  now: number;
  highlightedShardId: number | null;
}

export function StatusHostGroup({ hostName, nodes, now, highlightedShardId }: StatusHostGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const stats = useMemo(() => {
    let gatewayCount = 0;
    let workerCount = 0;

    let totalEps = 0;
    let totalMemory = 0;

    let pingSum = 0;
    let pingCount = 0;

    let hasHighlightedShard = false;

    for (const node of nodes) {
      totalEps += node.eventsPerSecond || 0;
      totalMemory += node.memoryUsage || 0;

      if (node.type === 'gateway') {
        gatewayCount++;
        if (node.shardData && node.shardData.length > 0) {
          let gatewayPingSum = 0;
          for (const shard of node.shardData) {
            gatewayPingSum += shard.ping;
            if (highlightedShardId !== null && shard.id === highlightedShardId) {
              hasHighlightedShard = true;
            }
          }
          pingSum += gatewayPingSum / node.shardData.length;
          pingCount++;
        }
      } else {
        workerCount++;
      }
    }

    return {
      gatewayCount,
      workerCount,
      totalEps,
      totalMemoryGB: totalMemory / 1024,
      avgPing: pingCount > 0 ? Math.round(pingSum / pingCount) : 0,
      hasHighlightedShard,
      gateways: nodes.filter((n) => n.type === 'gateway'),
      workers: nodes.filter((n) => n.type === 'worker'),
    };
  }, [nodes, highlightedShardId]);

  const statusCounts = nodes.reduce(
    (acc, node) => {
      acc[getNodeStatus(node.lastHeartbeat, now)]++;
      return acc;
    },
    { online: 0, offline: 0, unresponsive: 0 },
  );

  const hasIssues = statusCounts.offline > 0 || statusCounts.unresponsive > 0;
  const isExpanded = expanded || stats.hasHighlightedShard;

  return (
    <Card className={cn('transition-all [content-visibility:auto]', hasIssues && 'ring-1 ring-yellow-500/30')}>
      {/* --- HOST HEADER --- */}
      <CardHeader onClick={() => setExpanded(!isExpanded)} className='flex cursor-pointer items-center justify-between gap-4'>
        <div className='bg-secondary flex size-10 shrink-0 items-center justify-center rounded-lg'>
          <ServerIcon className='text-muted-foreground size-5 shrink-0' />
        </div>

        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <CardTitle className='font-mono uppercase'>{hostName}</CardTitle>
          <CardDescription className='flex flex-col gap-1 space-x-2 text-xs sm:flex-row'>
            <div className='flex items-center gap-1'>
              <RadioIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{stats.gatewayCount} gateways</span>
            </div>
            <div className='flex items-center gap-1'>
              <CpuIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{stats.workerCount} workers</span>
            </div>
            <div className='flex items-center gap-1'>
              <ZapIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>
                {stats.totalEps > 0 ? stats.totalEps.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }) : 'N/A'}
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <SignalIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{stats.avgPing} ms</span>
            </div>
            <div className='flex items-center gap-1'>
              <MemoryStickIcon className='size-4 shrink-0' />
              <span className='tabular-nums'>{stats.totalMemoryGB.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })} GB</span>
            </div>
          </CardDescription>
        </div>

        <div className='flex items-center gap-2 md:gap-4'>
          <div className='flex flex-col items-center gap-2 md:flex-row'>
            {statusCounts.online > 0 && (
              <span className='flex items-center gap-1 rounded-full border border-green-500 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500'>
                <span className='size-2 shrink-0 rounded-full bg-green-500' />
                {statusCounts.online}
              </span>
            )}
            {statusCounts.unresponsive > 0 && (
              <span className='flex items-center gap-1 rounded-full border border-yellow-500 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500'>
                <span className='size-2 shrink-0 rounded-full bg-yellow-500' />
                {statusCounts.unresponsive}
              </span>
            )}
            {statusCounts.offline > 0 && (
              <span className='flex items-center gap-1 rounded-full border border-red-500 bg-red-500/3 px-2 py-0.5 text-xs font-medium text-red-500'>
                <span className='size-2 shrink-0 rounded-full bg-red-500' />
                {statusCounts.offline}
              </span>
            )}
          </div>
          <ChevronDownIcon className={cn('text-muted-foreground size-4 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
        </div>
      </CardHeader>

      {/* --- EXPANDED NODES --- */}
      {isExpanded && (
        <div className='flex flex-col gap-4 border-t p-4'>
          {/* --- GATEWAYS --- */}
          {stats.gateways.length > 0 && (
            <div className='flex flex-col gap-2'>
              <h3 className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>Gateways</h3>
              <div className='grid grid-cols-1 gap-2 xl:grid-cols-2'>
                {stats.gateways.map((node) => (
                  <StatusNodeCard key={node._id} node={node} highlightedShardId={highlightedShardId} now={now} />
                ))}
              </div>
            </div>
          )}

          {/* --- WORKERS --- */}
          {stats.workers.length > 0 && (
            <div className='flex flex-col gap-2'>
              <h3 className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>Workers</h3>
              <div className='grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3'>
                {stats.workers.map((node) => (
                  <StatusNodeCard key={node._id} node={node} now={now} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
