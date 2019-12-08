import { Token } from "./tokenizer";
import { GuildMember, Guild } from "discord.js";
import { GuildData } from "./guildData";
import { commandTokenizer, ArgumentType } from "./command";

export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export const nameof = <T>(name: keyof T): string => name.toString();

export interface ISerializeable {
    serialize(): {};
}

export class Enumerator<T> {
    private collection: T[];
    private index: number;

    constructor(collection: T[], moveFirst: boolean = false) {
        this.collection = collection;
        this.index = -1;
        if (moveFirst) {
            this.moveNext();
        }
    }

    get current(): T {
        return this.collection[this.index];
    }

    get active(): boolean {
        return this.index < this.collection.length;
    }

    moveNext(): boolean {
        if (this.active) {
            this.index += 1;
            return this.active;
        }
        return false;
    }

    movePrevious(): boolean {
        if (this.index > 0) {
            this.index =- 1;
            return this.index == 0;
        }
        return false;
    }
}

export function getMemberFromMention(guild: Guild | GuildData, mention: string | Token<ArgumentType>): GuildMember | null {
    if (guild instanceof GuildData) {
        guild = guild.guild;
    }

    let id: string;
    if (typeof mention == "string") {
        let match = mention.match(commandTokenizer.getRegex("user"));
        if (match == null) {
            return null;
        }

        id = match[0].slice(2).replace(">", "");
    }
    else {
        if (mention.type != "user") {
            return null;
        }
        
        id = mention.value.slice(2).replace(">", "");
    }

    return guild.member(id);
}