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
        const message = this.readText(argEnumerator, undefined, true);

        await msg.channel.send(message);

        if (msg.deletable) {
            await msg.delete();
        }
    }
}