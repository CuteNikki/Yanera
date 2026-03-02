'use client';

import { api } from '@yanera/database';
import { useMutation, useQuery } from 'convex/react';
import { MousePointerClickIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PingCounter({ guildId }: { guildId: string }) {
  const count = useQuery(api.guild.pingCounter.getPingCount, { guildId });

  const incrementPing = useMutation(api.guild.pingCounter.incrementPingCounter);

  return (
    <Card className='bg-accent/40 w-full max-w-sm'>
      <CardHeader className='text-center'>
        <CardTitle>Ping Counter</CardTitle>
        <CardDescription>Live sync between the Web Dashboard and Discord.</CardDescription>
      </CardHeader>

      <CardContent className='flex flex-col items-center'>
        {count === undefined ? (
          <Skeleton className='h-16 w-32' />
        ) : (
          <div className='font-mono text-6xl font-black tracking-tighter'>{count.toLocaleString()}</div>
        )}
      </CardContent>

      <CardFooter>
        <Button size='lg' className='w-full font-bold' onClick={() => incrementPing({ guildId })} disabled={count === undefined}>
          <MousePointerClickIcon className='mr-2 size-5' />
          Ping from Web
        </Button>
      </CardFooter>
    </Card>
  );
}
