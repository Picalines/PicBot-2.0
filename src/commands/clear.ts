import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message } from "discord.js";

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
            if (m?.deletable) {
                try {
                    await m.delete(5000);
                }
                catch (err) {
                    console.log(`${this.info.name} command error on deleting a message (not saved)`);
                }
            }
        }
        else {
            throw new Error("Либо этот канал пуст, либо он мёртв уже как 2 недели");
        }
    }
}