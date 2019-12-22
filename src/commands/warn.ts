import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { getMemberFromMention } from "../utils";
import { getGuildData } from "../guildData";
import { MemberIsBotError } from "../error";
import { Message } from "discord.js";
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
        let memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера");

        let member = getMemberFromMention(msg.guild, memberMention);
        if (member.user.bot) {
            throw new MemberIsBotError(memberMention);
        } else if (member.permissions.has("ADMINISTRATOR")) {
            throw new Error("нельзя кинуть предупреждение администратору");
        }

        let guildData = getGuildData(msg);

        let maxWarns = guildData.getProperty("maxWarns", 3).value;
        let memberWarns = guildData.getAccount(member).getProperty("warns", 0);
        memberWarns.value += 1;

        await msg.channel.send(`${msg.member} кинул предупреждение ${member} (${memberWarns.value}/${maxWarns})`);

        if (memberWarns.value >= maxWarns) {
            let banCommand = findCommand(c => c instanceof BanCommand) as BanCommand;
            if (banCommand == undefined) {
                throw new Error("в данный момент бот не имеет доступа к команде `ban`. Админы, делайте всё руками");
            }

            await banCommand.banMember(msg, member, msg.member, `Слишком много предупреждений (${memberWarns.value}/${maxWarns})`, 10);
        }
    }
}

export class UnwarnCommand extends Command {
    info: CommandInfo = {
        name: "unwarn",
        syntax: [["user", "mention"]],
        description: "снимает предупреждение с участника сервера `mention`",
        permission: "admin",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание извинившегося участника сервера");

        let member = getMemberFromMention(msg.guild, memberMention);
        if (member.user.bot) {
            throw new MemberIsBotError(memberMention);
        }
        else if (member == msg.member) {
            throw new Error("нельзя снять предупреждение с самого себя");
        }

        let guildData = getGuildData(msg);
        let acc = guildData.getAccount(member);
        let warnsProperty = acc.getProperty<number>("warns");

        if (warnsProperty && warnsProperty.value > 0) {
            warnsProperty.value -= 1;
            let maxWarns = guildData.getProperty("maxWarns", 3).value;
            await msg.channel.send(`${msg.member} снял предупреждение с ${member} (${warnsProperty.value}/${maxWarns})`);
        }
        else {
            await msg.reply(`${member.displayName} чист!`);
        }

        if (warnsProperty && warnsProperty.value <= 0) {
            acc.removeProperty("warns");
        }
    }
}