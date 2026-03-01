import Image from 'next/image';

import { auth, signIn, signOut } from '@/auth';

export default async function Dashboard() {
  const session = await auth();

  return (
    <main className='flex flex-col items-center justify-center min-h-screen'>
      <h1 className='text-2xl font-bold mb-4'>Welcome to Yanera</h1>
      {session ? (
        <form
          action={async () => {
            'use server';
            await signOut();
          }}
        >
          <p className='text-sm text-muted-foreground'>{session.user?.name}</p>
          {session.user?.image && <Image src={session.user.image} alt='Avatar' width={40} height={40} className='rounded-full' />}
          <button type='submit' className='px-4 py-2 bg-red-600 text-white rounded mt-2'>
            Logout
          </button>
        </form>
      ) : (
        <form
          action={async () => {
            'use server';
            await signIn('discord', { redirectTo: '/dashboard' });
          }}
        >
          <button type='submit' className='px-4 py-2 bg-indigo-600 text-white rounded'>
            Login with Discord
          </button>
        </form>
      )}
    </main>
  );
}
