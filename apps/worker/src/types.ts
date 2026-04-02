import type { CreateInteractionResponseOptions } from '@discordjs/core';
import type { APIInteraction, APIInteractionResponse } from 'discord-api-types/v10';

export interface Command {
  name: string;
  description: string;
  execute: (interaction: APIInteraction) => Promise<CreateInteractionResponseOptions | void>;
}
