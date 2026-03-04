import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

import { getBotGuilds, getUserGuilds } from '@/lib/discord';
import { cn, getGuildIconUrl } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function getDeterministicColor(id: string) {
  const colors = [
    'bg-blue-600',
    'bg-indigo-600',
    'bg-purple-600',
    'bg-fuchsia-600',
    'bg-pink-600',
    'bg-rose-600',
    'bg-orange-600',
    'bg-amber-600',
    'bg-emerald-600',
    'bg-teal-600',
  ];

  const charSum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

export default async function Dashboard() {
  const session = await auth();

  if (!session?.accessToken) {
    return redirect('/');
  }

  const [userGuilds, botGuildIds] = await Promise.all([getUserGuilds(), getBotGuilds()]);

  const processedGuilds = userGuilds
    .map((guild) => {
      const isOwner = guild.owner; // This is a boolean field provided by Discord's API
      const isAdmin = (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8);
      const canManageServer = (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0x20);

      return {
        ...guild,
        isOwner: isOwner,
        isAdmin: isOwner || isAdmin,
        canManage: isOwner || isAdmin || canManageServer,
        botPresent: botGuildIds.includes(guild.id),
      };
    })
    .sort((a, b) => {
      // Priority 7: Bot is there AND I am Owner // Can directly edit
      // Priority 6: Bot is there AND I am Admin // Can directly edit
      // Priority 5: Bot is there AND I can Manage // Can directly edit
      // Priority 4: Bot is NOT there BUT I am Owner // Invite potential
      // Priority 3: Bot is NOT there BUT I am Admin // Invite potential
      // Priority 2: Bot is NOT there BUT I can Manage // Invite potential
      // Priority 1: Bot is there BUT I am just a user // Can view, but not edit
      // Priority 0: Bot is NOT there AND I am just a user // Can't do anything

      const getPriority = (g: typeof a) => {
        if (g.botPresent && g.isOwner) return 7;
        if (g.botPresent && g.isAdmin) return 6;
        if (g.botPresent && g.canManage) return 5;
        if (!g.botPresent && g.isOwner) return 4;
        if (!g.botPresent && g.isAdmin) return 3;
        if (!g.botPresent && g.canManage) return 2;
        if (g.botPresent) return 1;
        return 0;
      };

      const aPriority = getPriority(a);
      const bPriority = getPriority(b);

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return a.name.localeCompare(b.name);
    });

  return (
    <main className='container mx-auto p-8'>
      <header className='mb-8 flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Your Servers</h1>
      </header>

      <div className='grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
        {processedGuilds.map((guild) => (
          <Card key={guild.id} className='relative pt-0'>
            <div className='bg-background relative aspect-16/12 w-full overflow-hidden border-b'>
              {guild.icon ? (
                <Image
                  unoptimized
                  width={256}
                  height={256}
                  src={getGuildIconUrl(guild.id, guild.icon, 256)}
                  alt={guild.name}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div
                  className={cn('flex h-full w-full items-center justify-center text-center text-2xl font-black select-none', getDeterministicColor(guild.id))}
                >
                  {guild.name
                    .replace(/'s /g, ' ')
                    .replace(/\w+/g, (word) => word[0])
                    .replace(/\s/g, '')
                    .slice(0, 10)}
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle className='truncate' title={guild.name}>
                {guild.name}
              </CardTitle>
              <CardDescription className='flex flex-row gap-1 truncate'>
                <Badge variant='secondary'>{guild.isOwner ? 'Owner' : guild.isAdmin ? 'Admin' : guild.canManage ? 'Manageable' : 'User'}</Badge>
                {guild.botPresent && <Badge variant='secondary'>Mutual</Badge>}
              </CardDescription>

              <CardAction>
                {guild.canManage && guild.botPresent && (
                  <Button variant='default' size='lg' title='Edit Guild Settings' asChild>
                    <Link href={`/dashboard/${guild.id}`}>Edit</Link>
                  </Button>
                )}
                {guild.canManage && !guild.botPresent && (
                  <Button variant='default' size='lg' title='Add Bot' asChild>
                    <Link
                      // @todo: Update redirect_uri to production URL in .env when deploying
                      href={`https://discord.com/oauth2/authorize?client_id=${process.env.AUTH_DISCORD_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&redirect_uri=${encodeURIComponent(`http://localhost:3000/dashboard`)}&response_type=code`}
                    >
                      Setup
                    </Link>
                  </Button>
                )}
                {!guild.canManage && guild.botPresent && (
                  <Button variant='default' size='lg' title='View Dashboard' asChild>
                    <Link href={`/dashboard/${guild.id}`}>View</Link>
                  </Button>
                )}
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
