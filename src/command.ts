import { readdirAsync } from "./fsAsync";
import * as Discord from "discord.js";
import { Enumerator } from "./utils";
import { Token, Tokenizer } from "./tokenizer";
import { Debug } from "./debug";

export type CommandPermission = "everyone" | "admin" | "owner"

export interface CommandInfo {
    readonly name: string;
    readonly syntax?: string;
    readonly description: string;
    readonly permission: CommandPermission;
    readonly group?: string;
}

export abstract class Command {
    abstract info: CommandInfo;
    abstract run(msg: Discord.Message, argEnumerator: Enumerator<Token>): Promise<void>;
}

export type ArgumentType = "space" | "string" | "float" | "int" | "word";

export type ArgumentEnumerator = Enumerator<Token<ArgumentType>>;

export const commandTokenizer = new Tokenizer<ArgumentType>({
    "string": /".*?"/,
    "space": /\s+/,
    "float": /(\d+)\.(\d+)/g,
    "int": /(\d+)/g,
    "word": /\w+/
});


export const commands: Command[] = [];

export function findCommand(predicator: (c: Command) => boolean): Command | undefined {
    for (let i in commands) {
        let c = commands[i];
        if (predicator(c)) {
            return c;
        }
    }
}

export const commandsFolderPath = `${__dirname}/commands/`;

export async function loadCommands() {
    Debug.Log("loading commands...");
    while (commands.length > 0) {
        commands.pop();
    }

    let files = (await readdirAsync(commandsFolderPath)).filter(f => f.endsWith(".js"));
    files.forEach(f => {
        Debug.Log(`loading '${f}'...`);
        let cmodule = require(commandsFolderPath + f);
        for (let k in cmodule) {
            if ((k == "default" || k.endsWith("Command")) && cmodule[k] instanceof Function) {
                commands.push(new cmodule[k]());
            }
        }
    });
    Debug.Log("commands successfully loaded");
}