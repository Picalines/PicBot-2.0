import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getMemberFromMention } from "../utils";
import { Message } from "discord.js";

export class KickCommand extends Command {
    info: CommandInfo = {
        name: "kick",
        syntax: [["user", "mention"], ["string", "reason", false]],
        description: "кикает участника сервера `mention`",
        permission: "admin",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание неугодного участника сервера");

        let member = getMemberFromMention(msg.guild, memberMention, false);
        if (member == msg.member) {
            throw new Error("нельзя кикнуть самого себя");
        }

        if (!member.kickable) {
            throw new Error(`я не могу кикнуть ${member}`);
        }

        let reason = this.readNextToken(argEnumerator, "string", "ожидалась причина кика", "Не указана :/");

        await member.kick(reason);
        await msg.reply(`${member.displayName} успешно сослан в Сибирь`);
    }
}