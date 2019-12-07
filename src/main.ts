import { loadCommands, findCommand, commandTokenizer } from "./command";
import { getAccount } from "./account";
import * as database from "./database";
import * as Discord from "discord.js";
import * as dotenv from "dotenv";
import { Debug } from "./debug";
import { delay, Enumerator } from "./utils";
import { getGuildData } from "./guildData";

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

bot.on("ready", async () => {
    await loadCommands();
    await database.load();
});

bot.on("message", async msg => {
    if (msg.member.user.bot) return;

    let guildData = getGuildData(msg);
    let acc = guildData.getAccount(msg.member);

    acc.getProperty("xp", 0).value += 1;

    for (let i in guildData.prefixes) {
        let prefix = guildData.prefixes[i];

        if (msg.content.startsWith(prefix)) {
            let noPrefixContent = msg.content.slice(prefix.length);
            console.log(noPrefixContent);
            let command = findCommand(c => noPrefixContent.startsWith(c.info.name));
            if (command != undefined) {
                let input = noPrefixContent.slice(command.info.name.length);
                let inputTokens = commandTokenizer.tokenize(input);
                await command.run(msg, new Enumerator(inputTokens));
            }

            break
        }
    }
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