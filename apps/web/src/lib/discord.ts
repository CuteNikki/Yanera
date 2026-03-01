export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

const isGuildsResponse = (data: unknown): data is DiscordGuild[] => {
  return Array.isArray(data) && data.every((guild) => 'id' in guild && 'name' in guild);
};

export async function getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
