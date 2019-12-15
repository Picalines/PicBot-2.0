import { delay, Enumerator, stringDiff, generateErrorEmbed, colors } from "./utils";
import { loadCommands, findCommand, commandTokenizer, Command } from "./command";
import { getGuildData, deleteGuildData, GuildData } from "./guildData";
import { IProgression } from "./commands/progress";
import { getLevel } from "./commands/stats";
import * as database from "./database";
import * as Discord from "discord.js";
import * as dotenv from "dotenv";
import { Debug } from "./debug";
import { Property } from "./property";

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

export const bot = new Discord.Client();

export var botOwner: Discord.User | undefined = undefined;

if (process.env.DISCORD_TOKEN) {
    Debug.Log("Logging in discord...");
    bot.login(process.env.DISCORD_TOKEN).then(async () => {
        Debug.Log("Successfully logged in discord!")
        if (process.env.BOT_OWNER_ID) {
            botOwner = await bot.fetchUser(process.env.BOT_OWNER_ID);
            if (!botOwner) {
                throw new Error("bot owner id is invalid");
            }
        }
        else {
            throw new Error("bot owner id is undefined");
        }
    });
}
else {
    throw new Error("discord token is undefined");
}

bot.on("ready", async () => {
    await loadCommands();
    await database.load();
});

async function runCommand(msg: Discord.Message, content: string, command: Command) {
    let input = content.slice(command.info.name.length);
    let inputTokens = commandTokenizer.tokenize(input).filter(t => t.type != "space");
    try {
        await command.run(msg, new Enumerator(inputTokens));
    }
    catch (err) {
        await msg.reply(generateErrorEmbed(err));
    }
}

async function handleNewLevel(msg: Discord.Message, guildData: GuildData, xpProp: Property<number>, newLevel: number) {
    let levelEmbed = new Discord.RichEmbed();
    levelEmbed.setTitle(`${msg.member.displayName} повысил свой уровень!`);
    levelEmbed.setThumbnail(msg.member.user.avatarURL);
    levelEmbed.setColor(colors.AQUA);
    levelEmbed.addField("Опыт", xpProp.value, true);
    levelEmbed.addField("Уровень", newLevel, true);

    let levelMsg = (await msg.channel.send(levelEmbed)) as Discord.Message;
    delay(20000).then(() => {
        if (levelMsg?.deletable) {
            levelMsg.delete();
        }
    });

    let progressionProp = guildData.getProperty<string>("progression");
    if (!progressionProp) {
        return;
    }

    let progression: IProgression = JSON.parse(progressionProp.value);
    if (!progression[newLevel]) {
        return;
    } else if (!msg.guild.me.permissions.has("MANAGE_ROLES")) {
        await msg.channel.send(generateErrorEmbed(`у меня нет права на управление ролями, из-за чего ${msg.member} не может прогрессировать!`));
    }

    let progressEmbed = new Discord.RichEmbed();
    progressEmbed.setTitle(`${msg.member.displayName} прогрессирует!`);
    progressEmbed.setThumbnail(msg.member.user.avatarURL);
    progressEmbed.setColor(colors.BLUE);

    let desc = "";

    for (let i in progression[newLevel]) {
        let action = progression[newLevel][i];

        let role = msg.guild.roles.find(r => r.id == action[1]);
        if (!role) {
            await msg.channel.send(generateErrorEmbed(`не могу найти роль ${action[1]}. Орите на владельца сервера!`));
            continue;
        }

        let reason = `Получен уровень ${newLevel}`;
        try {
            await msg.member[action[0] == "add" ? "addRole" : "removeRole"](role, reason);
            desc += `${action[0] == "add" ? "получена": "потеряна"} роль ${role.name}\n`;
        }
        catch (err) { }
    }

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
        await msg.reply(`прогрессируешь!\n${desc}`);
    }
    else {
        await msg.channel.send(progressEmbed);
    }
}

bot.on("message", async msg => {
    if (msg.member.user && msg.member.user.bot) return;

    let guildData = getGuildData(msg);
    let acc = guildData.getAccount(msg.member);

    let xpProp = acc.getProperty("xp", 0);
    let oldLevel = getLevel(xpProp.value);
    xpProp.value += 1;
    let newLevel = getLevel(xpProp.value);

    if (oldLevel != newLevel) {
        await handleNewLevel(msg, guildData, xpProp, newLevel);
    }

    if (guildData.prefixes.length == 0) {
        guildData.prefixes = ["~"];
        await msg.channel.send("Из-за странной ошибки был утерян список префиксов для команд. Теперь мой единственный префикс это `~`");
    }

    let prefix: string | undefined = undefined;
    for (let i in guildData.prefixes) {
        let p = guildData.prefixes[i];
        if (msg.content.startsWith(p)) {
            prefix = p;
            break
        }
    }

    if (prefix == undefined) return;

    let noPrefixContent = msg.content.slice(prefix.length);

    let cname = noPrefixContent.split(" ")[0] || "";
    let nearest = ["", Number.MAX_SAFE_INTEGER];

    let command = findCommand(c => {
        let diff = stringDiff(cname, c.info.name);
        if (diff.length < nearest[1]) {
            nearest = [c.info.name, diff.length];
        }
        return cname == c.info.name;
    });

    if (command != undefined) {
        if (!command.checkPermission(msg.member)) {
            await msg.reply("ты не можешь использовать эту команду :/");
            return;
        }

        await runCommand(msg, noPrefixContent, command);
    }
    else {
        let errMsg = `Команда \`${cname}\` не найдена`;
        if (nearest[1] > 2) {
            await msg.reply(generateErrorEmbed(errMsg))
            return;
        }
        
        const fixEmoji = "🔧";
        errMsg += `. Возможно вы имели в виду \`${nearest[0]}\`? Если да, то жми на ${fixEmoji}`;
        
        let rmsg = await msg.reply(generateErrorEmbed(errMsg, false)) as Discord.Message;
        await rmsg.react(fixEmoji);
        const filter = (r: any, u: any) => r.emoji.name == fixEmoji && u == msg.author
        let collected = await rmsg.awaitReactions(filter, { time: 10000, max: 1 });
        if (collected.size > 0) {
            if (rmsg.deletable) {
                await rmsg.delete();
            }
            
            command = findCommand(c => c.info.name == nearest[0]);

            if (command == undefined) {
                await msg.reply(generateErrorEmbed("произошла неизвестная ошибка"));
                return;
            }

            await runCommand(msg, noPrefixContent, command);
        }
    }
});

bot.on("guildBanRemove", async (guild, user) => {
    let ch = guild.systemChannel as Discord.TextChannel;
    await ch?.send(`Осторожно! ${user.toString()} вышел на свободу!`);
});

bot.on("guildMemberAdd", async member => {
    let ch = member.guild.systemChannel as Discord.TextChannel;
    await ch?.send(`Здравствуй, *${member.displayName}*!`);
});

bot.on("guildMemberRemove", member => {
    getGuildData(member).deleteAccount(member);
});

bot.on("guildCreate", async guild => {
    await botOwner?.send(`Присоединился к серверу '${guild.nameAcronym}'. *Стрёмно...*`);
});

bot.on("guildDelete", async guild => {
    deleteGuildData(guild);
    try {
        await botOwner?.send(`меня убрали с сервера '${guild.nameAcronym}'. *Ну и ладно...*`);
    }
    catch {}
});

// #region error & close events

async function backup() {
    await Debug.Save();
    await database.save();
}

bot.on("error", async err => {
    Debug.Log("Disconnected from Discord. Trying to connect again (10s delay)...", "warning");
    Debug.Log(err, "error");
    await delay(10000);
    try {
        await bot.login(process.env.DISCORD_TOKEN);
    }
    catch (serr) {
        Debug.Log(serr, "error");
        Debug.Log("Failed to reconnect. Closing program", "error");
        process.exit();
    }
});

bot.on("reconnecting", () => {
    Debug.Log("Successfully reconnected to Discord");
});

async function onClose(exit: boolean) {
    Debug.Log("turning off the bot...");
    if (bot.readyAt) {
        await backup();
    }
    await bot.destroy();
    Debug.Log("program closed");
    if (exit) {
        process.exit();
    }
}

process.on("exit", async () => onClose.bind(null, false));
let closeEvents: NodeJS.Signals[] = ["SIGINT", "SIGUSR1", "SIGUSR2", "SIGTERM"];
closeEvents.forEach(signal => {
    process.on(signal, onClose.bind(null, true));
});

// #endregion