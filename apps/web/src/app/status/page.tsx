'use client';

import { api, Doc } from '@yanera/database';
import { useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';

import { FilterStatus, FilterType } from '@/lib/types';
import { getNodeStatus } from '@/lib/utils';

import { StatusFilters } from '@/components/status/filter';
import { StatusHeader } from '@/components/status/header';
import { StatusHostGroup } from '@/components/status/host-group';
import { StatusOverview } from '@/components/status/overview';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatusPage() {
  const nodes = useQuery(api.nodes.getAll);

  // const [nodes, setMockNodes] = useState<Doc<'nodes'>[]>(getMockNodes());
  const [now, setNow] = useState(() => Date.now());
  const [guildSearch, setGuildSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>(FilterType.All);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(FilterStatus.All);
  useEffect(() => {
    // let tickCount = 0;

    const interval = setInterval(() => {
      setNow(Date.now());
      // tickCount++;

      // if (tickCount % 15 === 0) {
      //   setNodes(getMockNodes());
      // }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredNodes = useMemo(() => {
    return nodes?.filter((node) => {
      if (filterType !== FilterType.All && node.type !== filterType) return false;
      if (filterStatus !== FilterStatus.All && getNodeStatus(node.lastHeartbeat, now) !== filterStatus) return false;
      return true;
    });
  }, [nodes, filterType, filterStatus, now]);

  const hostGroups = useMemo(() => {
    const groups: Record<string, Doc<'nodes'>[]> = {};
    for (const node of filteredNodes || []) {
      if (!groups[node.hostName]) groups[node.hostName] = [];
      groups[node.hostName].push(node);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredNodes]);

  const highlightedShardId = useMemo(() => {
    const trimmed = guildSearch.trim();
    if (!trimmed) return null;

    for (const node of nodes || []) {
      if (node.type === 'gateway' && node.shardData) {
        for (const shard of node.shardData) {
          if (shard.activeGuildIds.includes(trimmed) || shard.unavailableGuildIds.includes(trimmed)) {
            return shard.id;
          }
        }
      }
    }
    return null;
  }, [guildSearch, nodes]);

  const statusSummary = useMemo(() => {
    const summary = { online: 0, unresponsive: 0, offline: 0 };
    for (const node of nodes || []) {
      const status = getNodeStatus(node.lastHeartbeat, now);
      summary[status]++;
    }
    return summary;
  }, [nodes, now]);

  const typeFilters: { value: FilterType; label: string }[] = [
    { value: FilterType.All, label: 'All Nodes' },
    { value: FilterType.Gateway, label: 'Gateways' },
    { value: FilterType.Worker, label: 'Workers' },
  ];

  const statusFilters: { value: FilterStatus; label: string; count: number; color: string }[] = [
    { value: FilterStatus.All, label: 'All', count: nodes?.length || 0, color: 'bg-primary/20! text-primary! border-primary/30!' },
    { value: FilterStatus.Online, label: 'Online', count: statusSummary.online, color: 'bg-green-500/10! text-green-500! border-green-500/30!' },
    {
      value: FilterStatus.Unresponsive,
      label: 'Unresponsive',
      count: statusSummary.unresponsive,
      color: 'bg-yellow-800/10! text-yellow-500! border-yellow-500/30!',
    },
    { value: FilterStatus.Offline, label: 'Offline', count: statusSummary.offline, color: 'bg-red-500/10! text-red-500! border-red-500/30!' },
  ];

  if (nodes === undefined) return <div className='p-8 text-neutral-400'>Loading cluster status...</div>;

  return (
    <main className='container mx-auto flex flex-col gap-8 p-4 py-8'>
      {/* --- HEADER --- */}
      <StatusHeader />

      {/* --- OVERVIEW --- */}
      <StatusOverview nodes={nodes} />

      {/* --- FILTERS --- */}
      <StatusFilters
        guildSearch={guildSearch}
        setGuildSearch={setGuildSearch}
        highlightedShardId={highlightedShardId}
        typeFilters={typeFilters}
        filterType={filterType}
        setFilterType={setFilterType}
        statusFilters={statusFilters}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      {/* --- HOSTS & NODES --- */}
      <div className='space-y-4'>
        {hostGroups.length > 0 ? (
          hostGroups.map(([hostName, hostNodes]) => (
            <StatusHostGroup key={hostName} hostName={hostName} nodes={hostNodes} highlightedShardId={highlightedShardId} now={now} />
          ))
        ) : (
          <Card>
            <CardHeader className='py-8 text-center'>
              <CardTitle>No nodes found</CardTitle>
              <CardDescription>Try adjusting your filters or search criteria.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
