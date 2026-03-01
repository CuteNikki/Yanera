'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

export function SignOut({ session }: { session: Session }) {
  return (
    <form
      onSubmit={() => {
        signOut();
      }}
    >
      <p className='text-sm text-muted-foreground'>{session.user?.name}</p>
      {session.user?.image && <Image src={session.user.image} alt='Avatar' width={40} height={40} className='rounded-full' />}
      <button className='px-4 py-2 bg-red-600 text-white rounded mt-2'>Logout</button>
    </form>
  );
}
