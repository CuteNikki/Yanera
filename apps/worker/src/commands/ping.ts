import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';

import { prisma } from '../services/database';
import { type Command } from '../types';

export default {
  name: 'ping',
  description: 'Increase the ping count for this server.',
  execute: async (interaction) => {
    const guildId = interaction.guild_id;

    if (!guildId) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        content: 'This command can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      };
    }
    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: { pingCount: { increment: 1 } },
      create: { guildId, pingCount: 1 },
    });

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      content: `This server has been pinged ${settings.pingCount ?? 1} times.`,
    };
  },
} satisfies Command;
