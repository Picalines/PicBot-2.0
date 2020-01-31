import { databaseFolderPath } from "./database";
import * as fs from "./fsAsync";
import { Debug } from "./debug";
import { Script, createContext } from "vm";

import discord = require("discord.js");

export const databaseScriptsPath = databaseFolderPath + "scripts/";

type ScriptableEvent = "message" | "guildMemberAdd" | "guildMemberRemove";

type ScriptArguments = any[];

let loadedScripts: { [path: string]: Script | null } = {};
let scriptedFunctions: { [path: string]: (...args: any) => Promise<void> } = {};

function hasLoadedScript(path: string) {
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

    if (!hasLoadedScript(path) && !(await loadScript(path))) {
        return;
    }

    const script = loadedScripts[path];
    if (script == null) {
        return;
    }

    let sf = scriptedFunctions[path];
    if (sf == undefined) {
        try {
            const sandbox: { [key: string]: any } = {
                discord,
                console,
                Number,
                String,
                Boolean,
                parseInt,
                setTimeout,
                setInterval,
                guild,
                run: () => { throw new Error("script run function is not defined"); }
            }

            const context = createContext(sandbox);
            script.runInContext(context, { timeout: 1500 });
            sf = sandbox["run"];

            if (typeof sf != "function") {
                throw new Error("invalid script run function");
            }

            scriptedFunctions[path] = sf;
        }
        catch (err) {
            Debug.Log(err, "error");
            throw new Error("ошибка инициализации скриптов (создатель, чекай логи)");
        }
    }

    if (sf == undefined) return;

    try {
        await sf(...(args ?? []));
    }
    catch (err) {
        Debug.Log(err, "error");
        throw new Error("ошибка запуска скриптов (создатель, чекай логи)");
    }
}

export function resetLoadedScripts() {
    loadedScripts = {};
    scriptedFunctions = {};
}