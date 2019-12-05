import * as Discord from "discord.js";
import { Token } from "./tokenizer";
import * as fs from "./fsAsync";

export type CommandPermission = "everyone" | "admin" | "owner"

export interface CommandInfo {
    readonly name: string;
    readonly syntax: string;
    readonly description: string;
    readonly permission: CommandPermission;
    readonly group?: string;
}

export abstract class Command {
    abstract info: CommandInfo;
    abstract run(member: Discord.GuildMember, args: Enumerator<Token>): Promise<void>;
}

export const commandsFolderPath = `${__dirname}/commands/`;
export const commands: Command[] = [];

export async function loadCommands() {
    while (commands[0]) {
        commands.pop();
    }

    if (!(await fs.existsAsync(commandsFolderPath))) {
        await fs.mkdirAsync(commandsFolderPath);
    }

    var files = await fs.readdirAsync(commandsFolderPath);
    files.filter(f => f.endsWith(".ts")).forEach(file => {
        const fmodule = require(file);
        for (let exp in fmodule) {
            const exval = fmodule[exp];
            if (exval instanceof Function) {
                const c = new exval();
                if (c instanceof Command) {
                    commands.push(c);
                }
            }
        }
    });
}