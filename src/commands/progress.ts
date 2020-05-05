import { getRoleFromMention, generateErrorEmbed, colors, getMemberFromMention } from "../utils";
import { Message, GuildMember, TextChannel, RichEmbed } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getGuildData } from "../guildData";
import { getAccount } from "../account";
import { getLevel } from "./stats";

interface IRoleAction {
    [0]: "add" | "rm", [1]: string;
}

export interface IProgression {
    [i: number]: IRoleAction[]
}

export class ProgressCommand extends Command {
    info: CommandInfo = {
        name: "progress",
        syntax: [["word", "add|rm|clear"], ["role", "role"], ["int", "lvl"]],
        description: "ставит точку прогрессии, когда на уровне `lvl` нужно добавить (`add`) / удалить (`rm`) роль `role` (`clear` сбрасывает прогрессию на уровне `lvl` / всю прогрессию)",
        permission: "owner",
        group: "Настройки"
    };

    private readonly opErrMsg = "ожидалась операция `add` / `rm` / `clear`";

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const operation = this.readNextToken(argEnumerator, "word", this.opErrMsg);

        const guildData = getGuildData(msg);

        let clearLvl = -1;
        if (operation == "clear") {
            clearLvl = Number(this.readNextToken(argEnumerator, "int", "ожидался номер уровня", "-1"));
            if (clearLvl == -1) {
                guildData.removeProperty("progression");
                await msg.reply("прогрессия успешно очищена.");
                return;
            }
        }
        else if (operation != "add" && operation != "rm") {
            throw new Error(this.opErrMsg);
        }

        const roleMention = this.readNextToken(argEnumerator, "role", "ожидалось упоминание роли");
        const role = getRoleFromMention(msg.guild, roleMention);
        const lvl = Number(this.readNextToken(argEnumerator, "int", "ожидался номер уровня"));

        const prop = guildData.getProperty<string>("progression", "{}");

        let progression: IProgression | undefined = undefined;
        try {
            progression = JSON.parse(prop.value);
        }
        catch (_) {
            progression = undefined;
        }

        if (progression == undefined) {
            prop.value = "{}";
            progression = {};
        }

        if (operation == "clear") {
            delete progression[clearLvl];
        }
        else {
            if (!progression[lvl]) {
                progression[lvl] = [];
            }
    
            if (progression[lvl].find(p => p[0] == operation && p[1] == role.id)) {
                throw new Error("это действие уже назначено");
            }
    
            progression[lvl].push([operation, role.id]);
        }

        prop.value = JSON.stringify(progression);

        await msg.reply("настройки прогрессии успешно обновлены");
    }
}

async function addRoles(member: GuildMember, channel: TextChannel, lvl: number, progression: IProgression): Promise<string> {
    let desc = "";

    for (const action of progression[lvl]) {
        const hasRole = member.roles.some(r => r.id == action[1]);
        if ((action[0] == "add" && hasRole) || (action[0] == "rm" && !hasRole)) {
            continue;
        }

        const role = member.guild.roles.find(r => r.id == action[1]);
        if (!role) {
            await channel.send(generateErrorEmbed(`не могу найти роль ${action[1]}. Орите на владельца сервера!`));
            continue;
        }

        const reason = `Получен уровень ${lvl}`;
        await member[action[0] == "add" ? "addRole" : "removeRole"](role, reason);

        desc += `${action[0] == "add" ? "получена" : "потеряна"} роль ${role.name}\n`;
    }

    return desc;
}

const ignoreProgress = "ignoreProgress";

export async function handleProgression(member: GuildMember, channel?: TextChannel, onlyCurrent: boolean = true) {
    if (member.user.bot || getAccount(member).checkProperty(ignoreProgress, true)) return;

    const ch = channel ?? member.guild.systemChannel as TextChannel;

    if (!member.guild.me.permissions.has("MANAGE_ROLES")) {
        await ch.send(generateErrorEmbed(`у меня нет права на управление ролями, из-за чего ${member.displayName} не может прогрессировать!`));
    }

    const guildData = getGuildData(member);
    const lvl = getLevel(getAccount(member).getProperty<number>("xp", 0).value);

    const progressionProp = guildData.getProperty<string>("progression");
    if (!progressionProp) {
        return;
    }

    let desc = "";
    const progression: IProgression = JSON.parse(progressionProp.value);

    if (onlyCurrent) {
        if (!progression[lvl]) return;
        desc = await addRoles(member, ch, lvl, progression);
    }
    else {
        const progressPoints = Object.keys(progression).map(s => Number(s)).filter(n => n <= lvl);
        for (const p of progressPoints) {
            desc += await addRoles(member, ch, p, progression);
        }
    }

    if (desc.replace(/\s+/g, "").length == 0) {
        return;
    }

    const progressEmbed = new RichEmbed()
        .setTitle(`${member.displayName} прогрессирует!`)
        .setThumbnail(member.user.avatarURL)
        .setColor(colors.BLUE);

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
        await ch.send(`${member}, прогрессируешь!\n${desc}`);
    }
    else {
        await ch.send(progressEmbed);
    }
}

export class ProgressIgnoreCommand extends Command {
    info: CommandInfo = {
        name: "progressignore",
        aliases: ["progignore"],
        syntax: [["user", "member"]],
        description: "участник `member` не будет прогрессировать",
        permission: "owner",
        group: "Настройки"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера");
        const member = getMemberFromMention(msg.guild, memberMention, true);

        const acc = getAccount(member);
        const isIgnoring = acc.getProperty<boolean>(ignoreProgress, false).value;

        if (!isIgnoring) {
            acc.setProperty(ignoreProgress, true);
            await msg.reply(`${member.displayName} больше не будет прогрессировать`);
        }
        else {
            acc.removeProperty(ignoreProgress);
            await msg.reply(`${member.displayName} продолжит прогрессировать`);
        }
    }
}