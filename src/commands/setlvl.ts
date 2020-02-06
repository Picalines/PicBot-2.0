import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getMemberFromMention, clearRoles } from "../utils";
import { Message, TextChannel } from "discord.js";
import { handleProgression } from "./progress";
import { getAccount } from "../account";
import { level2xp } from "./stats";

export class SetLevelCommand extends Command {
    info: CommandInfo = {
        name: "setlvl",
        syntax: [["user", "member"], ["int", "lvl"]],
        description: "ставит уровень `lvl` для `member`",
        permission: "owner",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера");
        const lvl = Number(this.readNextToken(argEnumerator, "int", "ожидался уровень"));

        const member = getMemberFromMention(msg.guild, memberMention, true);

        getAccount(member).setProperty("xp", level2xp(lvl));
        await msg.reply("уровень успешно обновлён");

        if (msg.guild.me.hasPermission("MANAGE_ROLES")) {
            await clearRoles(member);
            await handleProgression(member, msg.channel as TextChannel);
        }
    }
}