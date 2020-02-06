import { getRoleFromMention, generateErrorEmbed, colors } from "../utils";
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
        description: "ставит точку прогрессии, когда на уровне `lvl` нужно добавить (`add`) / удалить (`rm`) роль `role` (`clear` сбрасывает всю прогрессию)",
        permission: "owner",
        group: "Настройки"
    };

    private readonly opErrMsg = "ожидалась операция `add` / `rm` / `clear`";

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let operation = this.readNextToken(argEnumerator, "word", this.opErrMsg);

        let guildData = getGuildData(msg);

        if (operation == "clear") {
            guildData.removeProperty("progression");
            await msg.reply("прогрессия успешно очищена.");
            return;
        }
        else if (operation != "add" && operation != "rm") {
            throw new Error(this.opErrMsg);
        }

        let roleMention = this.readNextToken(argEnumerator, "role", "ожидалось упоминание роли");
        let role = getRoleFromMention(msg.guild, roleMention);
        let lvl = Number(this.readNextToken(argEnumerator, "int", "ожидался номер уровня"));

        let prop = guildData.getProperty<string>("progression", "{}");

        let progression: IProgression = {};
        try {
            progression = JSON.parse(prop.value);
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                prop.value = "{}";
                progression = {};
            }
        }

        if (progression == undefined) {
            prop.value = "{}";
            progression = {};
        }

        if (!progression[lvl]) {
            progression[lvl] = [];
        }

        if (progression[lvl].find(p => p[0] == operation && p[1] == role.id)) {
            throw new Error("это действие уже назначено");
        }

        progression[lvl].push([operation, role.id]);

        prop.value = JSON.stringify(progression);

        await msg.reply("настройки прогрессии успешно обновлены");
    }
}

async function addRoles(member: GuildMember, channel: TextChannel, lvl: number, progression: IProgression): Promise<string> {
    const promises: Promise<any>[] = [];
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
        const editPromise = member[action[0] == "add" ? "addRole" : "removeRole"](role, reason);
        promises.push(editPromise);

        desc += `${action[0] == "add" ? "получена" : "потеряна"} роль ${role.name}\n`;
    }

    await Promise.all(promises);
    return desc;
}

export async function handleProgression(member: GuildMember, channel?: TextChannel) {
    if (member.user.bot) return;

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

    const progression: IProgression = JSON.parse(progressionProp.value);
    const progressPoints = Object.keys(progression).map(s => Number(s)).filter(n => n <= lvl);

    let desc = "";
    for (const p of progressPoints) {
        desc += await addRoles(member, ch, p, progression);
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