import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { Message, RichEmbed } from "discord.js";
import { SyntaxError, MemberNotFound, MemberIsBot } from "../error";
import { getMemberFromMention } from "../utils";
import { getGuildData } from "../guildData";

export class WarnCommand extends Command {
    info: CommandInfo = {
        name: "warn",
        syntax: [["user"]],
        description: "даёт предупреждение участнику сервера",
        permission: "admin"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        if (!argEnumerator.moveNext() || argEnumerator.current.type != "user") {
            throw new SyntaxError(argEnumerator, `ожидалось упоминание участника сервера`);
        }

        let member = getMemberFromMention(msg.guild, argEnumerator.current);
        if (member == null) {
            throw new MemberNotFound(argEnumerator.current.value);
        }
        if (member.user.bot) {
            throw new MemberIsBot(argEnumerator.current.value);
        }

        let guildData = getGuildData(msg);

        let maxWarns = guildData.getProperty("maxWarns", 3).value;
        let memberWarns = guildData.getAccount(member).getProperty("warns", 0);
        memberWarns.value += 1;

        await msg.channel.send(`${msg.member} кинул предупреждение ${member} (${memberWarns.value}/${maxWarns})`);

        if (memberWarns.value >= maxWarns) {
            
        }
        else {

        }
    }
}