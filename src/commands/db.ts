import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getMemberFromMention, clearRoles } from "../utils";
import { getGuildData } from "../guildData";
import { Message, TextChannel } from "discord.js";
import { handleProgression } from "./progress";

export class DatabaseCommand extends Command {
    info: CommandInfo = {
        name: "db",
        syntax: [["word", "reset|move"], ["user", "member"], ["user", "target", false]],
        description: "Сбрасывает аккаунт `member` | 'Перекидывает' аккаунт `member` на `target` (аккаунт `member` сбрасывается)",
        permission: "owner",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const operation = this.readNextToken(argEnumerator, "word", "ожидалась операция `reset` | `move`");
        const memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера");

        const member = getMemberFromMention(msg.guild, memberMention, true);
        const guildData = getGuildData(msg);

        switch (operation) {
            default: throw new Error(`Неизвестная операция \`${operation}\``);

            case "reset":
                guildData.deleteAccount(member);
                await msg.reply("аккаунт успешно сброшен со скалы");

                if (msg.guild.me.hasPermission("MANAGE_ROLES")) {
                    await clearRoles(member, "сброс аккаунта");
                    await handleProgression(member, msg.channel as TextChannel, false);
                }

                break;
            
            case "move":
                const targetMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание другого участника сервера");
                const target = getMemberFromMention(msg.guild, targetMention, true);

                if (member.id == target.id) {
                    throw new Error("зачем?");
                }

                const memberAcc = guildData.getAccount(member);
                const targetAcc = guildData.getAccount(target);
                memberAcc.properties.forEach(prop => targetAcc.setProperty(prop.name, prop.value));

                guildData.deleteAccount(member);

                if (msg.guild.me.hasPermission("MANAGE_ROLES")) {
                    await Promise.all([clearRoles(member), clearRoles(target)]);
                    const ch = msg.channel as TextChannel;
                    await Promise.all([handleProgression(member, ch), handleProgression(target, ch, false)]);
                }

                await msg.reply("перенос аккаунта успешно завершён");
                break;
        }
    }
}