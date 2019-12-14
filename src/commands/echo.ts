import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message } from "discord.js";

export class EchoCommand extends Command {
    info: CommandInfo = {
        name: "echo",
        syntax: [["string", "message"]],
        description: "бот пишет сообщение `message`",
        permission: "everyone"
    };

    private readonly regex = /(^")|("$)/g;

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let message: string;
        message = this.readNextToken(argEnumerator, "string", "ожидалось сообщение");
        await msg.channel.send(message.replace(this.regex, ""));
        if (msg.deletable) {
            await msg.delete();
        }
    }
}