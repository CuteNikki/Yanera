import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUserAvatarUrl = (userId: string, discriminator: string, avatarHash: string | null, size: number = 64) => {
  // If they have a custom avatar, return it immediately
  if (avatarHash) {
    const isAnimated = avatarHash.startsWith('a_');
    const format = isAnimated ? 'gif' : 'webp';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=${size}`;
  }

  // Handle Default Avatars
  if (discriminator === '0' || discriminator === '#0000') {
    // New system: Use User ID
    const index = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } else {
    // Legacy system: Use Discriminator
    const index = parseInt(discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
};

export const getUserBannerUrl = (userId: string, bannerHash: string, size: number = 64) => {

  const isAnimated = bannerHash.startsWith('a_');
  const format = isAnimated ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${format}?size=${size}`;
};

export const getGuildIconUrl = (guildId: string, hash: string, size: number = 64) => {
  const isAnimated = hash.startsWith('a_');
  const format = isAnimated ? 'gif' : 'webp';

  return `https://cdn.discordapp.com/icons/${guildId}/${hash}.${format}?size=${size}`;
};
