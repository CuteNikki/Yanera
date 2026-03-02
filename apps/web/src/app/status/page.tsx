'use client';

import { api, Doc } from '@yanera/database';
import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';

import {
  ActivityIcon,
  BoxIcon,
  ChartBarIcon,
  ClockIcon,
  GlobeIcon,
  GlobeOffIcon,
  HardDriveIcon,
  MemoryStickIcon,
  RadioIcon,
  ServerIcon,
  SignalIcon,
  WaypointsIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function getNodeStatus(lastHeartbeat: number, now: number) {
  const diff = now - lastHeartbeat;
  if (diff > 30_000) return 'offline';
  if (diff > 20_000) return 'unresponsive';
  return 'online';
}

function formatDuration(ms: number) {
  if (ms < 1_000) return 'just now';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

export default function StatusPage() {
  const nodes = useQuery(api.nodes.getAll);
  const [now, setNow] = useState(() => Date.now());

  // Mock data heartbeat simulation
  // const [nodes, setNodes] = useState<typeof mockData>(mockData);
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      // Simulate heartbeats for mock data
      // setNodes((prev) =>
      //   prev.map((node) => ({
      //     ...node,
      //     lastHeartbeat: node.lastHeartbeat + 1000, // Simulate heartbeats every second
      //   })),
      // );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (nodes === undefined) return <div className='p-8 text-neutral-400'>Loading cluster status...</div>;

  const gateways = nodes.filter((n) => n.type === 'gateway');
  const gatewaysWithPing = gateways.filter((g) => g.shardData && g.shardData.some((s) => s.ping > 0));
  const workers = nodes.filter((n) => n.type === 'worker');

  const totalGuilds = gateways.reduce((sum, node) => sum + (node.shardData?.reduce((s, shard) => s + shard.activeGuildIds.length, 0) || 0), 0);
  const totalUnavailableGuilds = gateways.reduce((sum, node) => sum + (node.shardData?.reduce((s, shard) => s + shard.unavailableGuildIds.length, 0) || 0), 0);
  const globalEps = workers.reduce((sum, node) => sum + (node.eventsPerSecond || 0), 0);
  const totalEventsProcessed = workers.reduce((sum, node) => sum + (node.totalEvents || 0), 0);
  const totalMemory = nodes.reduce((sum, node) => sum + node.memoryUsage, 0);

  const groupByHost = (items: typeof nodes) => {
    return items.reduce(
      (acc, node) => {
        if (!acc[node.hostName]) acc[node.hostName] = [];
        acc[node.hostName].push(node);
        return acc;
      },
      {} as Record<string, typeof nodes>,
    );
  };

  return (
    <main className='container mx-auto flex flex-col gap-8 p-4'>
      <header>
        <h1 className='text-3xl font-bold tracking-tight'>System Status</h1>
        <p className='text-muted-foreground mt-2'>Real-time health of the Yanera distributed network.</p>
      </header>

      {/* --- SUMMARY SECTION --- */}
      <section className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5'>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <ServerIcon className='text-muted-foreground size-6 shrink-0' />
            <div>
              <CardDescription className='text-sm'>Total Hosts</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>
                {Object.keys(groupByHost(nodes)).length > 0 ? Object.keys(groupByHost(nodes)).length.toLocaleString() : 'N/A'}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <WaypointsIcon className='size-6 shrink-0 text-blue-500' />
            <div>
              <CardDescription className='text-sm'>Total Gateways</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{gateways.length > 0 ? gateways.length.toLocaleString() : 'N/A'}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <BoxIcon className='size-6 shrink-0 text-purple-500' />
            <div>
              <CardDescription className='text-sm'>Total Workers</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{workers.length > 0 ? workers.length.toLocaleString() : 'N/A'}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <MemoryStickIcon className='size-6 shrink-0 text-emerald-500' />
            <div>
              <CardDescription className='text-sm'>Average Memory</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>
                {nodes.length > 0 ? `${Math.round(nodes.reduce((sum, n) => sum + n.memoryUsage, 0) / nodes.length).toLocaleString()} MB` : 'N/A'}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <HardDriveIcon className='size-6 shrink-0 text-cyan-500' />
            <div>
              <CardDescription className='text-sm'>Total Memory</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{(totalMemory / 1024).toFixed(2)} GB</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <SignalIcon className='size-6 shrink-0 text-yellow-500' />
            <div>
              <CardDescription className='text-sm'>Average Latency</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>
                {gatewaysWithPing.length > 0
                  ? `${Math.round(gatewaysWithPing.reduce((sum, n) => sum + (n.shardData?.reduce((s, shard) => s + shard.ping, 0) || 0), 0) / (gatewaysWithPing.reduce((sum, n) => sum + (n.shardData?.length || 0), 0) || 1)).toLocaleString()} ms`
                  : 'N/A'}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <ChartBarIcon className='size-6 shrink-0 text-pink-500' />
            <div>
              <CardDescription className='text-sm'>Events Processed</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{totalEventsProcessed.toLocaleString()}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <RadioIcon className='size-6 shrink-0 text-orange-500' />
            <div>
              <CardDescription className='text-sm'>Global Throughput</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{globalEps > 0 ? `${globalEps.toFixed(2)} / s` : '0 / s'}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <GlobeIcon className='size-6 shrink-0 text-indigo-500' />
            <div>
              <CardDescription className='text-sm'>Total Guilds</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{totalGuilds > 0 ? totalGuilds.toLocaleString() : 'N/A'}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='flex items-center gap-4'>
            <GlobeOffIcon className='size-6 shrink-0 text-rose-500' />
            <div>
              <CardDescription className='text-sm'>Unavailable Guilds</CardDescription>
              <CardTitle className='font-mono text-xl font-bold'>{totalUnavailableGuilds > 0 ? totalUnavailableGuilds.toLocaleString() : '0'}</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </section>

      <hr />

      {/* --- GATEWAY SECTION --- */}
      <section className='space-y-4'>
        <div className='flex items-center gap-2'>
          <WaypointsIcon className='size-6 shrink-0 text-blue-500' />
          <h2 className='text-2xl font-bold'>Gateway Infrastructure</h2>
        </div>

        {Object.entries(groupByHost(gateways)).map(([host, hostNodes]) => (
          <Card key={host}>
            <CardHeader className='text-muted-foreground flex items-center gap-2'>
              <ServerIcon className='size-4 shrink-0' />
              <CardTitle className='font-mono text-sm tracking-widest uppercase'>{host}</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {hostNodes.map((node) => (
                <NodeCard key={node._id} node={node} now={now} />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <hr />

      {/* --- WORKER SECTION --- */}
      <section className='space-y-4'>
        <div className='flex items-center gap-2'>
          <BoxIcon className='size-6 shrink-0 text-purple-500' />
          <h2 className='text-2xl font-bold'>Worker Fleet</h2>
        </div>

        {Object.entries(groupByHost(workers)).map(([host, hostNodes]) => (
          <Card key={host}>
            <CardHeader className='text-muted-foreground flex items-center gap-2'>
              <ServerIcon className='size-4 shrink-0' />
              <CardTitle className='font-mono text-sm tracking-widest uppercase'>{host}</CardTitle>
            </CardHeader>

            <CardContent className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
              {hostNodes.map((node) => (
                <NodeCard key={node._id} node={node} now={now} />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

function NodeCard({ node, now }: { node: Doc<'nodes'>; now: number }) {
  const status = getNodeStatus(node.lastHeartbeat, now);
  const uptimeStr = formatDuration(now - node.startedAt);
  const lastSeenStr = formatDuration(now - node.lastHeartbeat);

  const totalEvents = node.type === 'gateway' ? node.shardData?.reduce((sum, shard) => sum + shard.totalEvents, 0) || 0 : node.totalEvents || 0;
  const eps = node.type === 'gateway' ? node.shardData?.reduce((sum, shard) => sum + (shard.eventsPerSecond || 0), 0) || 0 : node.eventsPerSecond || 0;

  return (
    <Card className='bg-accent/40'>
      {/* Header */}
      <CardHeader>
        <CardTitle className='font-mono text-xs'>{node.nodeId}</CardTitle>
        <CardAction>
          <Badge variant={status === 'online' ? 'success' : status === 'offline' ? 'destructive' : 'warning'} className='uppercase'>
            {status}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className='flex flex-col gap-2 text-xs'>
          {/* Row 1: Events & EPS (Combined) */}
          <div className='flex items-center justify-between'>
            <div className='text-muted-foreground flex items-center gap-2' title='Total Events'>
              <ChartBarIcon className='size-4 shrink-0' />
              <span className='font-mono'>{totalEvents.toLocaleString()}</span>
            </div>
            <div className='text-muted-foreground flex items-center gap-2' title='Events Per Second'>
              <span className='font-mono'>{eps > 0 ? eps.toFixed(2) : '0'} / s</span>
              <RadioIcon className='size-4 shrink-0' />
            </div>
          </div>

          {/* Row 2: Latency & Memory */}
          <div className='grid grid-cols-2 gap-y-2'>
            <div className='text-muted-foreground flex items-center gap-2' title='Average Latency'>
              {node.type === 'gateway' && (
                <>
                  <SignalIcon className='size-4 shrink-0' />
                  <span className='font-mono'>
                    {node.shardData?.length ? `${Math.round(node.shardData.reduce((sum, s) => sum + s.ping, 0) / node.shardData.length)}ms` : 'N/A'}
                  </span>
                </>
              )}
            </div>
            <div className='text-muted-foreground flex items-center gap-2 justify-self-end' title='Memory Usage'>
              <span className='font-mono'>{node.memoryUsage.toLocaleString()} MB</span>
              <MemoryStickIcon className='size-4 shrink-0' />
            </div>

            {/* Row 3: Uptime & Last Seen */}
            <div className='text-muted-foreground flex items-center gap-2' title='Uptime'>
              <ClockIcon className='size-4 shrink-0' />
              <span className='font-mono'>{uptimeStr}</span>
            </div>
            <div className='text-muted-foreground flex items-center gap-2 justify-self-end' title='Last Heartbeat'>
              <span className='font-mono'>{lastSeenStr}</span>
              <ActivityIcon className='size-4 shrink-0' />
            </div>

            {/* Row 4: Gateway Guild Stats */}
            {node.type === 'gateway' && (
              <>
                <div className='text-muted-foreground flex items-center gap-2' title='Total Active Guilds'>
                  <GlobeIcon className='size-4 shrink-0' />
                  <span className='font-mono'>{node.shardData?.reduce((sum, shard) => sum + shard.activeGuildIds.length, 0).toLocaleString()}</span>
                </div>
                <div className='text-muted-foreground flex items-center gap-2 justify-self-end' title='Total Unavailable Guilds'>
                  <span className='font-mono'>{node.shardData?.reduce((sum, shard) => sum + shard.unavailableGuildIds.length, 0).toLocaleString()}</span>
                  <GlobeOffIcon className='size-4 shrink-0' />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Shards Footer */}
        {node.type === 'gateway' && node.shardData && (
          <div>
            <hr className='my-4' />
            <div className='flex flex-wrap gap-1'>
              {node.shardData.map((shard) => (
                <Tooltip key={shard.id}>
                  <TooltipTrigger className='bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded border font-mono text-xs'>
                    {shard.id}
                  </TooltipTrigger>
                  <TooltipContent className='text-center whitespace-pre-line'>
                    <p>{`Shard ${shard.id}\nPing: ${shard.ping > 0 ? shard.ping : 'N/A'} ms\nTotal Events: ${shard.totalEvents.toLocaleString()}\nEvents per second: ${shard.eventsPerSecond?.toFixed(2) || '0'}\nActive Guilds: ${shard.activeGuildIds.length.toLocaleString()}\nUnavailable Guilds: ${shard.unavailableGuildIds.length.toLocaleString()}`}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
