import { Message, RichEmbed, GuildMember, TextChannel } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getMemberFromMention, colors } from "../utils";
import { getAccount, Account } from "../account";
import { handleProgression } from "./progress";

export class StatsCommand extends Command {
    info: CommandInfo = {
        name: "stats",
        syntax: [["user", "member", false]],
        description: "бот пишет вашу статистику на сервере",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let mention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера", "none");
        let member = mention != "none" ? getMemberFromMention(msg.guild, mention) : msg.member;

        await msg.channel.send(this.createEmbed(member));
    }

    private createEmbed(member: GuildMember): RichEmbed {
        let acc = getAccount(member);
        let xp = acc.getProperty("xp", 0).value;
        let warns = acc.getProperty("warns");
    
        let embed = new RichEmbed();
        embed.setTitle(`**Статистика ${member.displayName}**`);
        embed.setThumbnail(member.user.avatarURL);
        embed.setColor(member.displayColor);

        if (warns != undefined) {
            embed.addField("*Опасность*", `Предупреждения: ${warns.value}`);
        }

        embed.addField("Опыт", xp, true);
        embed.addField("Уровень", getLevel(xp), true);

        return embed;
    }
}

export function getLevel(xp: number | Account) {
    if (xp instanceof Account) {
        xp = xp.getProperty("xp", 0).value;
    }
    return Math.floor(Math.sqrt(xp / 8));
}

export async function handleNewLevel(msg: Message) {
    const xpProp = getAccount(msg.member).getProperty<number>("xp", 0);
    const lvl = getLevel(xpProp.value);

    const levelEmbed = new RichEmbed();
    levelEmbed.setTitle(`${msg.member.displayName} повысил свой уровень!`);
    levelEmbed.setThumbnail(msg.member.user.avatarURL);
    levelEmbed.setColor(colors.AQUA);
    levelEmbed.addField("Опыт", xpProp.value, true);
    levelEmbed.addField("Уровень", lvl, true);

    const levelMsg = (await msg.channel.send(levelEmbed)) as Message;
    if (levelMsg?.deletable) {
        levelMsg.delete(20000);
    }

    await handleProgression(msg.member, msg.channel as TextChannel);
}