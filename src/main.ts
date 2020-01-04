import { loadCommands, findCommand, commands, runCommand } from "./command";
import { delay, generateErrorEmbed, emojis } from "./utils";
import { getGuildData, deleteGuildData } from "./guildData";
import { getLevel, handleNewLevel } from "./commands/stats";
import { handleProgression } from "./commands/progress";
import { findBestMatch } from "string-similarity";
import * as database from "./database";
import * as Discord from "discord.js";
import { google } from "googleapis";
import * as dotenv from "dotenv";
import { Debug } from "./debug";

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

export const bot = new Discord.Client();

if (process.env.DISCORD_TOKEN) {
    Debug.Log("Logging in discord...");
    bot.login(process.env.DISCORD_TOKEN).then(() => Debug.Log("Successfully logged in discord!"));
}
else {
    throw new Error("discord token is undefined");
}

export const youtube = google.youtube({
    auth: process.env.GOOGLE_API_KEY,
    version: "v3",
});

bot.on("ready", async () => {
    await loadCommands();
    await database.load();
});

bot.on("message", async msg => {
    if (msg.member.user && msg.member.user.bot) return;

    const guildData = getGuildData(msg);
    const acc = guildData.getAccount(msg.member);

    const xpProp = acc.getProperty("xp", 0);
    const oldLevel = getLevel(xpProp.value);
    xpProp.value += 1;

    if (oldLevel != getLevel(xpProp.value)) {
        await handleNewLevel(msg);
    }

    if (guildData.prefixes.length == 0) {
        guildData.prefixes = ["~"];
        await msg.channel.send("Из-за странной ошибки был утерян список префиксов для команд. Теперь мой единственный префикс это `~`");
    }

    let prefix: string | undefined = undefined;
    for (const p of guildData.prefixes) {
        if (msg.content.toLowerCase().startsWith(p.toLowerCase())) {
            prefix = p;
            break
        }
    }

    if (prefix == undefined) return;

    const noPrefixContent = msg.content.slice(prefix.length);
    const cname = (noPrefixContent.split(" ")[0] || "").toLowerCase();
    let command = findCommand(c => cname == c.info.name.toLowerCase());

    if (command != undefined) {
        if (!command.checkPermission(msg.member)) {
            await msg.reply("ты не можешь использовать эту команду :/");
        }
        else {
            await runCommand(msg, noPrefixContent, command);
        }
    }
    else {
        let errMsg = `Команда \`${cname}\` не найдена`;

        const commandNames = commands.map(c => c.info.name.toLowerCase());
        const bestMatches = findBestMatch(cname, commandNames);
        const nearest = bestMatches.bestMatch.target;
        
        errMsg += `. Возможно вы имели в виду \`${nearest}\`? Если да, то жми на ${emojis.repair}`;
        
        const rmsg = await msg.reply(generateErrorEmbed(errMsg, false)) as Discord.Message;
        await rmsg.react(emojis.repair);

        const filter = (r: any, u: any) => r.emoji.name == emojis.repair && u == msg.author;

        let collected = await rmsg.awaitReactions(filter, { time: 10000, max: 1 });
        if (collected.size > 0) {
            if (rmsg.deletable) {
                await rmsg.delete();
            }
            
            command = findCommand(c => c.info.name.toLowerCase() == nearest);

            if (command == undefined) {
                await msg.reply(generateErrorEmbed("произошла неизвестная ошибка"));
            }
            else {
                await runCommand(msg, noPrefixContent.slice(cname.length), command);
            }
        }
    }
});

bot.on("guildBanRemove", async (guild, user) => {
    let ch = guild.systemChannel as Discord.TextChannel;
    await ch?.send(`Осторожно! ${user.toString()} вышел на свободу!`);
});

bot.on("guildMemberAdd", async member => {
    let ch = member.guild.systemChannel as Discord.TextChannel;
    await ch?.send(`Здравствуй, *${member}*!`);
    await handleProgression(member, ch);
});

bot.on("guildMemberRemove", member => {
    getGuildData(member).deleteAccount(member);
});

bot.on("guildCreate", async guild => {
    Debug.Log(`joined guild '${guild.nameAcronym}' (id: ${guild.id})`);
});

bot.on("guildDelete", async guild => {
    Debug.Log(`leaved guild '${guild.nameAcronym}' (id: ${guild.id})`);
    deleteGuildData(guild);
});

// #region error & close events

async function backup() {
    await database.save();
    await Debug.Save();
}

setInterval(backup, Number(process.env.BACKUP_DELAY_MIN) || 3600000);

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