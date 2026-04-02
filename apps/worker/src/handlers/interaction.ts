import { type GatewayInteractionCreateDispatchData, InteractionType } from 'discord-api-types/v10';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { type Command } from '../types';

const commands = new Map<string, Command>();

const commandsPath = path.join(__dirname, '../commands');
const files = readdirSync(commandsPath).filter((f) => f.endsWith('.ts'));

for (const file of files) {
  const command = (await import(`../commands/${file}`)).default;
  commands.set(command.name, command);
}

export async function handleInteraction(payload: GatewayInteractionCreateDispatchData) {
  if (payload.type !== InteractionType.ApplicationCommand) return;

  const command = commands.get(payload.data.name);
  if (!command) return;

  return await command.execute(payload);
}
