import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, RichEmbed } from "discord.js";
import { getAccount } from "../account";

export class StatsCommand extends Command {
    info: CommandInfo = {
        name: "stats",
        description: "бот пишет вашу статистику на сервере",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let acc = getAccount(msg);
        let xp = acc.getProperty("xp", 0).value;
        await msg.reply(`Твой xp: ${xp}`);
    }
}