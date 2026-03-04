import { SearchIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FilterStatus, FilterType } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

interface StatusFiltersProps {
  guildSearch: string;
  setGuildSearch: (value: string) => void;
  highlightedShardId: number | null;
  typeFilters: { value: FilterType; label: string }[];
  filterType: FilterType;
  setFilterType: (value: FilterType) => void;
  statusFilters: { value: FilterStatus; label: string; count: number; color: string }[];
  filterStatus: FilterStatus;
  setFilterStatus: (value: FilterStatus) => void;
}

export function StatusFilters({
  guildSearch,
  setGuildSearch,
  highlightedShardId,
  typeFilters,
  filterType,
  setFilterType,
  statusFilters,
  filterStatus,
  setFilterStatus,
}: StatusFiltersProps) {
  const [inputValue, setInputValue] = useState(guildSearch);
  const [prevSearchProp, setPrevSearchProp] = useState(guildSearch);

  if (guildSearch !== prevSearchProp) {
    setPrevSearchProp(guildSearch);
    setInputValue(guildSearch);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setGuildSearch(inputValue);
    }, 300);

    return () => clearTimeout(timeout);
  }, [inputValue, setGuildSearch]);

  return (
    <section className='flex flex-col gap-2'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-muted-foreground text-sm font-medium tracking-wider uppercase'>Hosts & Nodes</h2>

        <div className='relative'>
          <SearchIcon className='text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2' />
          <input
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Search guild ID...'
            className='bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-8 w-full rounded-lg border pr-8 pl-8 text-xs focus:ring-1 focus:outline-none sm:w-56'
          />
          {inputValue && (
            <button onClick={() => setInputValue('')} className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2'>
              <XIcon className='size-4 shrink-0' />
              <span className='sr-only'>Clear search</span>
            </button>
          )}
        </div>
      </div>

      {highlightedShardId !== null && (
        <div className='border-primary/20 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-xs'>
          <SearchIcon className='text-primary size-4 shrink-0' />
          <span>
            Guild <span className='font-mono font-semibold'>{guildSearch.trim()}</span> is on <span className='font-semibold'>Shard {highlightedShardId}</span>
          </span>
        </div>
      )}

      {/* Note: We check 'guildSearch' here, not 'inputValue', so the warning only flashes AFTER the debounce */}
      {guildSearch.trim() && highlightedShardId === null && (
        <div className='flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500'>
          <TriangleAlertIcon className='size-4 shrink-0' />
          <span>Enter a valid guild ID (numeric snowflake) to find its shard.</span>
        </div>
      )}

      <div className='flex flex-wrap items-center gap-2'>
        {/* Type filter */}
        <div className='bg-card flex items-center rounded-lg border p-0.5'>
          {typeFilters.map((filter) => (
            <Button
              variant='ghost'
              size='sm'
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={cn('h-7 px-3 text-xs font-medium', filterType === filter.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Status filter */}
        <div className='flex flex-wrap items-center gap-1'>
          {statusFilters.map((filter) => (
            <Button
              variant='outline'
              size='sm'
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={cn('h-7 rounded-lg px-3 text-xs font-medium', filterStatus === filter.value ? filter.color : 'text-muted-foreground')}
            >
              {filter.label}
              <span className='ml-1.5 tabular-nums'>{filter.count}</span>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
