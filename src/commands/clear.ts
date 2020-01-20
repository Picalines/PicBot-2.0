import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message } from "discord.js";
import { delay } from "../utils";

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

        const channel = msg.channel;
        const messages = await msg.channel.bulkDelete(n);

        if (messages.size > 0) {
            const id = ((await msg.channel.send(`**${msg.member.displayName}** замял чьи-то сообщения (${messages.size - 1})`)) as Message).id;
            await delay(2500);
            const m = await channel.fetchMessage(id);
            if (m?.deletable) {
                await m.delete();
            }
        }
        else {
            throw new Error("Либо этот канал пуст, либо он мёртв уже как 2 недели");
        }
    }
}