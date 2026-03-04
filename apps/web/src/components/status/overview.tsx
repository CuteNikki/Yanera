import { Doc } from '@yanera/database';
import { useMemo } from 'react';

import {
  CpuIcon,
  GlobeIcon,
  GlobeOffIcon,
  HardDriveIcon,
  HashIcon,
  LucideIcon,
  MemoryStickIcon,
  RadioIcon,
  ServerIcon,
  SignalIcon,
  ZapIcon,
} from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusOverviewCardProps {
  rawNumber: number;
  formattedNumber: string;
  label: string;
  Icon: LucideIcon;
}

function StatusOverviewCard({ rawNumber, formattedNumber, label, Icon }: StatusOverviewCardProps) {
  return (
    <Card title={`${rawNumber.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${label}`}>
      <CardHeader className='flex items-center gap-4'>
        <Icon className='text-muted-foreground size-6 shrink-0' />
        <div>
          <CardDescription className='text-sm'>{label}</CardDescription>
          <CardTitle className='font-mono text-xl font-bold'>{formattedNumber}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}

export function StatusOverview({ nodes }: { nodes: Doc<'nodes'>[] }) {
  const stats = useMemo(() => {
    const hosts = new Set<string>();
    let gatewayCount = 0;
    let workerCount = 0;

    let totalGuilds = 0;
    let totalUnavailableGuilds = 0;

    let totalEps = 0;
    let totalEventsProcessed = 0;

    let totalMemory = 0;

    let gatewaysWithPing = 0;
    let pingSum = 0;
    let pingCount = 0;

    for (const node of nodes) {
      hosts.add(node.hostName);
      totalMemory += node.memoryUsage;
      totalEps += node.eventsPerSecond || 0;
      totalEventsProcessed += node.totalEvents || 0;

      if (node.type === 'gateway') {
        gatewayCount++;

        if (node.shardData && node.shardData.length > 0) {
          let hasPing = false;

          for (const shard of node.shardData) {
            totalGuilds += shard.activeGuildIds.length;
            totalUnavailableGuilds += shard.unavailableGuildIds.length;

            if (shard.ping > 0) {
              pingSum += shard.ping;
              pingCount++;
              hasPing = true;
            }
          }
          if (hasPing) gatewaysWithPing++;
        }
      } else if (node.type === 'worker') {
        workerCount++;
      }
    }

    const avgMemory = nodes.length > 0 ? totalMemory / nodes.length : 0;
    const avgPing = gatewaysWithPing > 0 ? Math.round(pingSum / pingCount) : 0;

    return {
      totalHosts: hosts.size,
      gatewayCount,
      workerCount,
      totalGuilds,
      totalUnavailableGuilds,
      globalEps: totalEps,
      totalEventsProcessed,
      totalMemory,
      totalMemoryGB: totalMemory / 1024,
      avgMemory,
      avgPing,
    };
  }, [nodes]);

  return (
    <section>
      <h2 className='text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase'>Overview</h2>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
        <StatusOverviewCard
          rawNumber={stats.totalHosts}
          formattedNumber={stats.totalHosts > 0 ? stats.totalHosts.toLocaleString() : 'N/A'}
          label='Total Hosts'
          Icon={ServerIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.gatewayCount}
          formattedNumber={stats.gatewayCount > 0 ? stats.gatewayCount.toLocaleString() : 'N/A'}
          label='Total Gateways'
          Icon={RadioIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.workerCount}
          formattedNumber={stats.workerCount > 0 ? stats.workerCount.toLocaleString() : 'N/A'}
          label='Total Workers'
          Icon={CpuIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.avgMemory}
          formattedNumber={stats.avgMemory > 0 ? `${stats.avgMemory.toLocaleString(undefined, { maximumFractionDigits: 2 })} MB` : 'N/A'}
          label='Average Memory'
          Icon={MemoryStickIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.totalMemoryGB}
          formattedNumber={stats.totalMemoryGB > 0 ? `${stats.totalMemoryGB.toLocaleString(undefined, { maximumFractionDigits: 2 })} GB` : 'N/A'}
          label='Total Memory'
          Icon={HardDriveIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.avgPing}
          formattedNumber={stats.avgPing > 0 ? `${stats.avgPing.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })} ms` : 'N/A'}
          label='Average Ping'
          Icon={SignalIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.totalEventsProcessed}
          formattedNumber={
            stats.totalEventsProcessed > 0 ? stats.totalEventsProcessed.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }) : 'N/A'
          }
          label='Events Processed'
          Icon={HashIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.globalEps}
          formattedNumber={stats.globalEps > 0 ? stats.globalEps.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 }) : 'N/A'}
          label='Events per Second'
          Icon={ZapIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.totalGuilds}
          formattedNumber={stats.totalGuilds > 0 ? stats.totalGuilds.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }) : 'N/A'}
          label='Total Guilds'
          Icon={GlobeIcon}
        />
        <StatusOverviewCard
          rawNumber={stats.totalUnavailableGuilds}
          formattedNumber={
            stats.totalUnavailableGuilds > 0 ? stats.totalUnavailableGuilds.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }) : '0'
          }
          label='Unavailable Guilds'
          Icon={GlobeOffIcon}
        />
      </div>
    </section>
  );
}
