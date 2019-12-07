import { Command, CommandInfo } from "../command";
import { Message, RichEmbed } from "discord.js";
import { getAccount } from "../account";
import { Enumerator } from "../utils";
import { Token } from "../tokenizer";

export class StatsCommand extends Command {
    info: CommandInfo = {
        name: "stats",
        description: "бот пишет вашу статистику на сервере",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: Enumerator<Token>) {
        let acc = getAccount(msg);
        let xp = acc.getProperty("xp", 0).value;
        await msg.reply(`Твой xp: ${xp}`);
    }
}