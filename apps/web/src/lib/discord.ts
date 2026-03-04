'use server';

import { auth } from '@/auth';

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean; // Requires email scope // Whether email is verified
  email?: string | null; // Requires email scope
  flags?: number;
  premium_type?: PremiumType;
  public_flags?: number;
  avatar_decoration_data?: {
    asset: string;
    sku_id: string;
    expires_at?: number | null;
  } | null;
  collectibles?: {
    nameplate?: {
      sku_id: string;
      asset: string;
      label: string;
      palette: string;
    } | null;
  } | null;
  primary_guild?: {
    identity_guild_id: string | null;
    identity_enabled: boolean | null;
    tag: string | null;
    badge: string | null;
  } | null;
}

enum PremiumType {
  None = 0,
  NitroClassic = 1,
  Nitro = 2,
  NitroBasic = 3,
}

export enum UserFlags {
  None = 0,
  DiscordEmployee = 1 << 0,
  PartneredServerOwner = 1 << 1,
  HypeSquadEvents = 1 << 2,
  BugHunterLevel1 = 1 << 3,
  HouseBravery = 1 << 6,
  HouseBrilliance = 1 << 7,
  HouseBalance = 1 << 8,
  EarlySupporter = 1 << 9,
  TeamUser = 1 << 10,
  System = 1 << 12,
  BugHunterLevel2 = 1 << 14,
  VerifiedBot = 1 << 16,
  VerifiedDeveloper = 1 << 17,
  CertifiedModerator = 1 << 18,
  BotHTTPInteractions = 1 << 19,
}

const isDiscordProfile = (data: unknown): data is DiscordProfile => {
  return typeof data === 'object' && data !== null && 'id' in data && 'username' in data && 'discriminator' in data && 'avatar' in data;
};

const isGuildsResponse = (data: unknown): data is DiscordGuild[] => {
  return Array.isArray(data) && data.every((guild) => 'id' in guild && 'name' in guild);
};

export async function getUserGuilds(): Promise<DiscordGuild[]> {
  const session = await auth();

  if (!session?.accessToken) {
    throw new Error('No access token found in session');
  }

  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guilds from Discord: ${response.status} ${response.statusText}`);
  }

  const guilds = await response.json();

  if (!isGuildsResponse(guilds)) {
    throw new Error(`Invalid guilds response from Discord: ${JSON.stringify(guilds)}`);
  }

  return guilds;
}

export async function getBotGuilds(): Promise<string[]> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bot ${process.env.AUTH_DISCORD_TOKEN}`,
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guilds from Discord: ${response.status} ${response.statusText}`);
  }

  const guilds = await response.json();

  if (!isGuildsResponse(guilds)) {
    throw new Error(`Invalid guilds response from Discord: ${JSON.stringify(guilds)}`);
  }

  return guilds.map((g) => g.id);
}

export async function getUserProfile(): Promise<DiscordProfile> {
  const session = await auth();

  if (!session?.accessToken) {
    throw new Error('No access token found in session');
  }

  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile from Discord: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!isDiscordProfile(data)) {
    throw new Error(`Invalid user profile response from Discord: ${JSON.stringify(data)}`);
  }

  return data;
}
