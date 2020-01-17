import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, RichEmbed, GuildMember } from "discord.js";
import { getGuildData } from "../guildData";
import { getLevel } from "./stats";
import { colors } from "../utils";

interface AccData {
    member: GuildMember;
    xp: number;
}

function compareAccounts(a: AccData, b: AccData): number {
    return b.xp - a.xp;
}

const maxMembers = 5;

export class TopCommand extends Command {
    info: CommandInfo = {
        name: "top",
        description: "Выводит топ самых активных участников сервера",
        permission: "everyone",
        group: "Фан"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const guildData = getGuildData(msg);

        const topEmbed = new RichEmbed()
            .setTitle("Топ участников сервера")
            .setColor(colors.GOLD);

        const rawAccounts = Object.values(guildData.accounts).filter(a => a.hasProperty("xp") && a.member != null);
        let accounts: AccData[] = [];

        for (const r of rawAccounts) {
            if (r.member != null) {
                accounts.push({ member: r.member, xp: r.getProperty<number>("xp", 0).value });
            }
        }

        accounts = accounts.sort(compareAccounts).slice(0, maxMembers);

        if (accounts.length == 0) {
            throw new Error("");
        }

        topEmbed.setThumbnail(accounts[0].member.user.avatarURL);

        for (let i = 0; i < accounts.length; i++) {
            const a = accounts[i];
            topEmbed.addField(`#${i+1} ${a.member.displayName}`, `Опыт: ${a.xp}, Уровень: ${getLevel(a.xp)}`);
        }

        await msg.reply(topEmbed);
    }
}