'use client';

import { Doc, api } from '@yanera/database';
import { useQuery } from 'convex/react';
import { ActivityIcon, BoxIcon, ClockIcon, GlobeIcon, GlobeOffIcon, MemoryStickIcon, RadioIcon, ServerIcon, SignalIcon, WaypointsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

function getNodeStatus(lastHeartbeat: number, now: number) {
  const diff = now - lastHeartbeat;
  if (diff > 30_000) return { label: 'Offline', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
  if (diff > 20_000) return { label: 'Dying', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
  return { label: 'Online', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (nodes === undefined) return <div className='p-8 text-neutral-400'>Loading cluster status...</div>;

  const gateways = nodes.filter((n) => n.type === 'gateway');
  const workers = nodes.filter((n) => n.type === 'worker');

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
    <div className='p-8 max-w-7xl mx-auto space-y-12'>
      <header>
        <h1 className='text-3xl font-bold tracking-tight'>System Status</h1>
        <p className='text-neutral-500 mt-2'>Real-time health of the Yanera distributed network.</p>
      </header>

      {/* --- SUMMARY SECTION --- */}

      <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2'>
        {/* Total Hosts */}
        <div className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800 flex items-center gap-4'>
          <ServerIcon className='w-6 h-6 text-neutral-400' />
          <div>
            <p className='text-sm text-neutral-500'>Total Hosts</p>
            <p className='text-xl font-bold font-mono'>{Object.keys(groupByHost(nodes)).length > 0 ? Object.keys(groupByHost(nodes)).length : 'N/A'}</p>
          </div>
        </div>
        <div className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800 flex items-center gap-4'>
          <WaypointsIcon className='w-6 h-6 text-blue-500' />
          <div>
            <p className='text-sm text-neutral-500'>Total Gateways</p>
            <p className='text-xl font-bold font-mono'>{gateways.length > 0 ? gateways.length : 'N/A'}</p>
          </div>
        </div>
        <div className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800 flex items-center gap-4'>
          <BoxIcon className='w-6 h-6 text-purple-500' />
          <div>
            <p className='text-sm text-neutral-500'>Total Workers</p>
            <p className='text-xl font-bold font-mono'>{workers.length > 0 ? workers.length : 'N/A'}</p>
          </div>
        </div>
        <div className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800 flex items-center gap-4'>
          <SignalIcon className='w-6 h-6 text-yellow-500' />
          <div>
            <p className='text-sm text-neutral-500'>Average Latency</p>
            <p className='text-xl font-bold font-mono'>
              {gateways.length > 0 ? `${Math.round(gateways.reduce((sum, n) => sum + (n.ping ?? 0), 0) / gateways.length)} ms` : 'N/A'}
            </p>
          </div>
        </div>
        <div className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800 flex items-center gap-4'>
          <MemoryStickIcon className='w-6 h-6 text-emerald-500' />
          <div>
            <p className='text-sm text-neutral-500'>Average Memory</p>
            <p className='text-xl font-bold font-mono'>
              {nodes.length > 0 ? `${Math.round(nodes.reduce((sum, n) => sum + n.memoryUsage, 0) / nodes.length)} MB` : 'N/A'}
            </p>
          </div>
        </div>
      </section>

      {/* --- GATEWAY SECTION --- */}
      <section className='space-y-6'>
        <div className='flex items-center gap-2 text-blue-500 mb-4'>
          <WaypointsIcon className='w-6 h-6' />
          <h2 className='text-2xl font-bold'>Gateway Infrastructure</h2>
        </div>

        {Object.entries(groupByHost(gateways)).map(([host, hostNodes]) => (
          <div key={host} className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800'>
            <div className='flex items-center gap-2 mb-6 text-neutral-400'>
              <ServerIcon className='w-4 h-4' />
              <span className='text-sm font-mono uppercase tracking-widest'>{host}</span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {hostNodes.map((node) => (
                <NodeCard key={node._id} node={node} now={now} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <hr className='border-neutral-800' />

      {/* --- WORKER SECTION --- */}
      <section className='space-y-6'>
        <div className='flex items-center gap-2 text-purple-500 mb-4'>
          <BoxIcon className='w-6 h-6' />
          <h2 className='text-2xl font-bold'>Worker Fleet</h2>
        </div>

        {Object.entries(groupByHost(workers)).map(([host, hostNodes]) => (
          <div key={host} className='border rounded-xl bg-card p-6 shadow-sm border-neutral-800'>
            <div className='flex items-center gap-2 mb-6 text-neutral-400'>
              <ServerIcon className='w-4 h-4' />
              <span className='text-sm font-mono uppercase tracking-widest'>{host}</span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {hostNodes.map((node) => (
                <NodeCard key={node._id} node={node} now={now} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function NodeCard({ node, now }: { node: Doc<'nodes'>; now: number }) {
  const status = getNodeStatus(node.lastHeartbeat, now);

  const uptimeStr = formatDuration(now - node.startedAt);
  const lastSeenStr = formatDuration(now - node.lastHeartbeat);

  return (
    <div className='border border-neutral-800 rounded-lg p-4 bg-neutral-900/50 flex flex-col gap-4'>
      <div className='flex justify-between items-start sm:flex-row flex-col-reverse gap-2'>
        <span className='font-mono text-xs text-neutral-400'>{node.nodeId}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${status.color}`}>{status.label}</span>
      </div>

      <div className='sm:grid grid-cols-2 gap-y-2 text-xs'>
        <div className='flex items-center gap-2 text-neutral-500' title={node.type === 'gateway' ? 'Latency' : 'Events Processed per Second'}>
          {node.type === 'gateway' ? (
            <>
              <SignalIcon className='w-3 h-3' />
              <span className='font-mono'>{node.ping} ms</span>
            </>
          ) : (
            <>
              <RadioIcon className='w-3 h-3' />
              <span className='font-mono'>{node.ping < 1 && node.ping > 0 ? node.ping.toFixed(2) : node.ping.toLocaleString()} / s</span>
            </>
          )}
        </div>
        <div className='flex items-center gap-2 text-neutral-500 sm:justify-self-end sm:flex-row-reverse' title='Memory Usage'>
          <MemoryStickIcon className='w-3 h-3' />
          <span className='font-mono'>{node.memoryUsage} MB</span>
        </div>
        <div className='flex items-center gap-2 text-neutral-500' title='Uptime'>
          <ClockIcon className='w-3 h-3' />
          <span className='font-mono'>{uptimeStr}</span>
        </div>
        <div className='flex items-center gap-2 text-neutral-500 sm:justify-self-end sm:flex-row-reverse' title='Last Heartbeat'>
          <ActivityIcon className='w-3 h-3' />
          <span className='font-mono'>{lastSeenStr}</span>
        </div>
        {node.type === 'gateway' && (
          <>
            <div className='flex items-center gap-2 text-neutral-500' title='Guild Count'>
              <GlobeIcon className='w-3 h-3' />
              <span className='font-mono'>{node.guildCount}</span>
            </div>
            <div className='flex items-center gap-2 text-neutral-500 sm:justify-self-end sm:flex-row-reverse' title='Unavailable Guilds'>
              <GlobeOffIcon className='w-3 h-3' />
              <span className='font-mono'>{node.unavailableGuilds}</span>
            </div>
          </>
        )}
      </div>

      {node.type === 'gateway' && node.shards && (
        <div className='pt-3 border-t border-neutral-800'>
          <span className='text-neutral-400 text-xs'>Shard IDs:</span>
          <div className='flex flex-wrap gap-1 pt-2'>
            {node.shards.map((s: number) => (
              <div
                key={s}
                title={`Shard ${s}`}
                className='w-5 h-5 flex items-center justify-center bg-blue-500/20 text-blue-400 text-[9px] rounded font-mono border border-blue-500/20'
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
