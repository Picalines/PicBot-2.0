import { loadCommands } from "./command";
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
});

// #region error & close events

async function backup() {
    Debug.Log("backup...");
    await Debug.Save();
}

bot.on("error", async err => {
    Debug.Log("Disconnected from Discord. Trying to connect again (10s delay)...");
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
    Debug.Log("closing program...");
    try {
        await bot.destroy();
    }
    catch (err) {
        Debug.Log(`Error on exiting process: ${err}`, "error");
    }
    await backup();
    Debug.Log("program successfully closed. Goodbye!")
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