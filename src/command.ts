import { Enumerator, generateErrorEmbed } from "./utils";
import { Token, Tokenizer } from "./tokenizer";
import { readdir } from "./fsAsync";
import { SyntaxError } from "./error";
import * as Discord from "discord.js";
import { Debug } from "./debug";

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

    protected readText(argEnumerator: ArgumentEnumerator, matchEnd?: (t: Token) => boolean, guild?: Discord.Guild): string {
        if (matchEnd == undefined) {
            matchEnd = () => false;
        }

        let result = "";
        while (argEnumerator.moveNext()) {
            const t = argEnumerator.current();
            if (matchEnd(t)) {
                break;
            }
            let v = t.value;
            switch (t.type) {
                case "string": v = v.replace(/^("|')/, "").replace(/("|')$/, ""); break;
                case "user":
                    if (guild) {
                        const id = v.match(/\d+/);
                        let member = guild.member(id ? id[0] : "");
                        v = member ? member.displayName : v;
                    }
                    break;
            }
            result += v + " ";
        }

        if (result == "") {
            throw new Error("ожидался текст");
        }

        return result.slice(0, -1);
    }
}

export const commandTokenizer = new Tokenizer<ArgumentType>({
    string: /(".*?")|('.*?')/,
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
    return commands.find(predicator);
}

export const commandsFolderPath = `${__dirname}/commands/`;

export async function loadCommands() {
    Debug.Log("loading commands...");
    while (commands.length > 0) {
        commands.pop();
    }

    (await readdir(commandsFolderPath)).filter(f => f.endsWith(".js")).forEach(f => {
        Debug.Log(`loading '${f}'...`);
        const path = commandsFolderPath + f;
        delete require.cache[path];
        const cmodule = require(path);
        for (const k in cmodule) {
            if ((k == "default" || k.endsWith("Command")) && cmodule[k] instanceof Function) {
                commands.push(new cmodule[k]());
            }
        }
    });
    Debug.Log("commands successfully loaded");
}

export async function runCommand(msg: Discord.Message, command: Command, realName?: string) {
    if (!command.checkPermission(msg.member)) {
        await msg.reply("ты не можешь использовать эту команду :/");
        return;
    }
    try {
        const cname = realName === undefined ? command.info.name.toLowerCase() : realName.toLowerCase();
        const input = msg.content.slice(msg.content.toLowerCase().search(cname) + cname.length);
        const inputTokens = commandTokenizer.tokenize(input).filter(t => t.type != "space");
        await command.run(msg, new Enumerator(inputTokens));
    }
    catch (err) {
        await msg.reply(generateErrorEmbed(err));
    }
}