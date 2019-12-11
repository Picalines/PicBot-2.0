import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { SyntaxError, MemberNotFound, MemberIsBot } from "../error";
import { getMemberFromMention } from "../utils";
import { Message, RichEmbed } from "discord.js";
import { getGuildData } from "../guildData";
import { BanCommand } from "./ban";

export class WarnCommand extends Command {
    info: CommandInfo = {
        name: "warn",
        syntax: [["user", "member"]],
        description: "даёт предупреждение участнику сервера",
        permission: "admin",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        if (!argEnumerator.moveNext() || argEnumerator.current().type != "user") {
            throw new SyntaxError(argEnumerator, `ожидалось упоминание участника сервера`);
        }

        let member = getMemberFromMention(msg.guild, argEnumerator.current());
        if (member == null) {
            throw new MemberNotFound(argEnumerator.current().value);
        } else if (member.user.bot) {
            throw new MemberIsBot(argEnumerator.current().value);
        }

        if (member.permissions.has("ADMINISTRATOR")) {
            throw new Error("нельзя кинуть предупреждение администратору");
        }

        let guildData = getGuildData(msg);

        let maxWarns = guildData.getProperty("maxWarns", 3).value;
        let memberWarns = guildData.getAccount(member).getProperty("warns", 0);
        memberWarns.value += 1;

        await msg.channel.send(`${msg.member} кинул предупреждение ${member} (${memberWarns.value}/${maxWarns})`);

        if (memberWarns.value >= maxWarns) {
            let banCommand = findCommand(c => c.info.name == "ban") as BanCommand;
            if (banCommand == undefined) {
                throw new Error("в данный момент бот не имеет доступа к команде `ban`. Админы, делайте всё руками");
            }

            await banCommand.banMember(msg, member, msg.member, `Слишком много предупреждений (${memberWarns.value}/${maxWarns})`, 10);
        }
    }
}