import { getMemberFromMention, colors, generateErrorEmbed } from "../utils";
import { Message, RichEmbed, GuildMember, TextChannel } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getAccount, Account } from "../account";
import { getGuildData } from "../guildData";
import { IProgression } from "./progress";

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

export async function handleProgression(member: GuildMember, channel?: TextChannel) {
    const guildData = getGuildData(member);
    const lvl = getLevel(getAccount(member).getProperty<number>("xp", 0).value);

    if (channel === undefined) {
        channel = member.guild.systemChannel as TextChannel;
    }

    const progressionProp = guildData.getProperty<string>("progression");
    if (!progressionProp) {
        return;
    }

    const progression: IProgression = JSON.parse(progressionProp.value);
    if (!progression[lvl]) {
        return;
    }

    if (!member.guild.me.permissions.has("MANAGE_ROLES")) {
        await channel.send(generateErrorEmbed(`у меня нет права на управление ролями, из-за чего ${member.displayName} не может прогрессировать!`));
    }

    let desc = "";

    for (let i in progression[lvl]) {
        const action = progression[lvl][i];

        const role = member.guild.roles.find(r => r.id == action[1]);
        if (!role) {
            await channel.send(generateErrorEmbed(`не могу найти роль ${action[1]}. Орите на владельца сервера!`));
            continue;
        }

        const reason = `Получен уровень ${lvl}`;
        await member[action[0] == "add" ? "addRole" : "removeRole"](role, reason);
        desc += `${action[0] == "add" ? "получена": "потеряна"} роль ${role.name}\n`;
    }

    const progressEmbed = new RichEmbed();
    progressEmbed.setTitle(`${member.displayName} прогрессирует!`);
    progressEmbed.setThumbnail(member.user.avatarURL);
    progressEmbed.setColor(colors.BLUE);

    let err: RangeError | undefined = undefined;
    try {
        progressEmbed.setDescription(desc);
    }
    catch (err2) {
        if (err2 instanceof RangeError) {
            err = err2; 
        }
    }

    if (err) {
        await channel.send(`${member}, прогрессируешь!\n${desc}`);
    }
    else {
        await channel.send(progressEmbed);
    }
}