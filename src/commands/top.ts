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

        const options: string[] = [];
        while (argEnumerator.moveNext()) options.push(argEnumerator.current().value);

        const topEmbed = new RichEmbed()
            .setTitle("Топ участников сервера")
            .setColor(colors.GOLD);

        const rawMembers = msg.guild.members.values();
        let accounts: AccData[] = [];

        for (const member of rawMembers) {
            if (member.user.bot) continue;
            const acc = guildData.getAccount(member);
            const xp = acc.getProperty<number>("xp", 0).value;
            accounts.push({ member, xp });
        }

        guildData.cleanAccounts();

        const isMembersLazy = options.includes("lazy");
        if (isMembersLazy) {
            accounts = accounts.filter(acc => acc.xp == 0);
        }

        accounts = accounts.sort(compareAccounts);

        if (options.includes("reverse")) {
            accounts = accounts.reverse();
        }

        const page = Math.abs(parseInt(options.find(opt => parseInt(opt) != NaN) as string)) || 0;
        const offset = page * maxMembers;

        accounts = accounts.slice(offset, offset + maxMembers);

        if (accounts.length == 0) {
            throw new Error("ничего не найдено");
        }

        topEmbed.setThumbnail(accounts[0].member.user.avatarURL);

        for (let i = 0; i < accounts.length; i++) {
            const a = accounts[i];
            topEmbed.addField(`#${offset + i + 1} ${a.member.displayName}`, `Опыт: ${a.xp}, Уровень: ${getLevel(a.xp)}`);
        }

        await msg.reply(topEmbed);
    }
}