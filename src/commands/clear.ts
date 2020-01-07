import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, DiscordAPIError } from "discord.js";
import { Debug } from "../debug";

export class ClearCommand extends Command {
    info: CommandInfo = {
        name: "clear",
        syntax: [["int", "n"]],
        description: "бот удаляет n сообщений",
        permission: "admin",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const n = Number(this.readNextToken(argEnumerator, 'int', 'ожидалось целое число сообщений')) + 1;

        const messages = await msg.channel.bulkDelete(n);

        if (messages.size > 0) {
            const m = (await msg.channel.send(`**${msg.member.displayName}** замял чьи-то сообщения (${messages.size - 1})`)) as Message;
            if (m.deletable) {
                try {
                    m.delete(5000);
                }
                catch (err) {
                    if (err instanceof DiscordAPIError) {
                        Debug.Log("clear command msg.delete -> discord api error");
                    }
                }
            }
        }
        else {
            throw new Error("Либо этот канал пуст, либо он мёртв уже как 2 недели");
        }
    }
}