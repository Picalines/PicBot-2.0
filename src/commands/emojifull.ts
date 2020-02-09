import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message } from "discord.js";

const emojiRegex = /<:\w+:(?<id>\d+)>/g

export class EmojiFullCommand extends Command {
    info: CommandInfo = {
        name: "emojifull",
        aliases: ["e"],
        syntax: [["word", "emoji"]],
        description: "бот кидает ссылку на картинку эмодзи",
        permission: "everyone",
        group: "Другое"
    };

    private readonly errMsg = "ожидался эмодзи";

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const emojiInput = this.readNextToken(argEnumerator, "word", this.errMsg);

        const res = emojiRegex.exec(emojiInput);
        if (!res || !res.groups || !res.groups.id) {
            throw new Error(this.errMsg);
        }

        const emojiId = res.groups.id;
        const emoji = msg.guild.emojis.find(e => e.id == emojiId);
        if (!emoji) {
            throw new Error("какой-то странный эмодзи .-.");
        }

        await msg.reply(emoji.url);
    }
}