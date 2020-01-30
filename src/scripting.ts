import { databaseFolderPath } from "./database";
import * as fs from "./fsAsync";
import { Debug } from "./debug";
import { Script } from "vm";

import discord = require("discord.js");

export const databaseScriptsPath = databaseFolderPath + "scripts/";

type ScriptableEvent = "message" | "guildMemberAdd" | "guildMemberRemove";

interface ScriptArguments {
    [key: string]: any
}

let loadedScripts: { [path: string]: Script | null } = {};

function hasScript(path: string) {
    return loadedScripts[path] != undefined;
}

async function loadScript(path: string): Promise<boolean> {
    if (!(path.startsWith("./") && path.endsWith(".js"))) {
        Debug.Log(`invalid script path (${path})`, "error");
        throw new Error("invalid script path (hidden)");
    }

    if (!await fs.exists(path)) {
        return false;
    }

    const code = (await fs.readFile(path)).toString();
    loadedScripts[path] = new Script(code);

    return true;
}

export async function runScript(guild: discord.Guild, event: ScriptableEvent, args?: ScriptArguments): Promise<void> {
    const path = databaseScriptsPath + guild.id + "/" + event + ".js";

    if (!hasScript(path) && !(await loadScript(path))) {
        return;
    }

    const script = loadedScripts[path];
    if (script == null) {
        return;
    }

    const sandbox = {
        discord,
        console,
        Number,
        String,
        Boolean,
        parseInt,
        guild,
        ...(args ?? {})
    }

    try {
        await script.runInNewContext(sandbox);
    }
    catch (err) {
        Debug.Log(err, "error");
        throw new Error("ошибка скриптов (чекай логи :/)");
    }
}

export function resetLoadedScripts() {
    loadedScripts = {};
}