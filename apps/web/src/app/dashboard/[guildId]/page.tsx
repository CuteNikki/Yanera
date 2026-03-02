import { PingCounter } from '@/components/dashboard/ping-counter';

export default async function DashboardPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  return (
    <div className='flex h-full flex-col items-center justify-center gap-6'>
      <h1 className='text-2xl font-bold'>Dashboard</h1>
      <p className='text-muted-foreground text-sm'>Dashboard for guild id: {guildId}</p>
      <PingCounter guildId={guildId} />
    </div>
  );
}
