import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message } from "discord.js";

export class EchoCommand extends Command {
    info: CommandInfo = {
        name: "echo",
        syntax: [["string", "message"]],
        description: "бот пишет сообщение `message`",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const message = msg.content.split(this.info.name, 2)[1].slice(1);

        await msg.channel.send(message);

        if (msg.deletable) {
            await msg.delete();
        }
    }
}