import { loadCommands } from "./command";
import { getAccount } from "./account";
import * as database from "./database";
import * as Discord from "discord.js";
import * as dotenv from "dotenv";
import { Debug } from "./debug";
import { delay } from "./utils";

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

export const bot = new Discord.Client();

if (process.env.DISCORD_TOKEN) {
    bot.login(process.env.DISCORD_TOKEN);
}
else {
    throw new Error("discord token is undefined");
}

bot.on("ready", async () => {
    Debug.Log("Successfully logged in discord!");
    await loadCommands();
    await database.load();
});

bot.on("message", async msg => {
    if (msg.member.user.bot) return;
    let xpProp = getAccount(msg).getProperty("xp", 0);
    xpProp.value += 1;
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
    await backup();
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