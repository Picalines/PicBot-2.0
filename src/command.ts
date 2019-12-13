import { readdirAsync } from "./fsAsync";
import * as Discord from "discord.js";
import { Enumerator } from "./utils";
import { Token, Tokenizer } from "./tokenizer";
import { Debug } from "./debug";
import { SyntaxError } from "./error";

export type CommandPermission = "everyone" | "admin" | "owner";

export type ArgumentType = "space" | "user" | "role" | "channel" | "everyone" | "here" | "string" | "float" | "int" | "word";

export type ArgumentToken = Token<ArgumentType>;
export type ArgumentEnumerator = Enumerator<ArgumentToken>;

export interface SyntaxArgument {
    [0]: ArgumentType,
    [1]: string,
    [2]?: boolean;
}

export interface CommandInfo {
    readonly name: string;
    readonly syntax?: SyntaxArgument[];
    readonly description: string;
    readonly permission: CommandPermission;
    readonly group?: string;
}

export abstract class Command {
    abstract info: CommandInfo;
    abstract run(msg: Discord.Message, argEnumerator: ArgumentEnumerator): Promise<void>;

    checkPermission(member: Discord.GuildMember): boolean {
        if (member == null) return false;
        switch (this.info.permission) {
            default: throw new Error(`Unsupported command permission '${this.info.permission}'`);
            case "everyone": return true;
            case "admin": return member.permissions.has("ADMINISTRATOR");
            case "owner": return member == member.guild.owner;
        }
    }

    static syntaxToString(syntax: SyntaxArgument[]): string {
        let s = "";
        for (let i in syntax) {
            let arg = syntax[i];
            let sarg = `${arg[1]}: ${arg[0]}`;
            if (arg[2] == false) {
                sarg = `[${sarg}]`;
            }
            s += `\`${sarg}\` `;
        }
        return s.slice(0, -1);
    }

    //dev utils
    protected readNextToken(argEnumerator: ArgumentEnumerator, type: ArgumentType, syntaxErrMsg: string, defaultValue?: string): string {
        if (!argEnumerator.moveNext()) {
            if (defaultValue == undefined) {
                throw new SyntaxError(argEnumerator, syntaxErrMsg);
            }
            else {
                return defaultValue;
            }
        }
        if (argEnumerator.current().type != type) {
            throw new SyntaxError(argEnumerator, syntaxErrMsg);
        }
        return argEnumerator.current().value;
    }
}

export const commandTokenizer = new Tokenizer<ArgumentType>({
    string: /".*?"/,
    space: /\s+/,
    user: /<@\!?\d+>/g,
    role: /<@&\d+>/g,
    channel: /<#\d+>/g,
    everyone: /@everyone/g,
    here: /@here/g,
    float: /(\d+)\.(\d+)/g,
    int: /(\d+)/g,
    word: /[^ ]+/
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