import { commandTokenizer, ArgumentType } from "./command";
import { GuildMember, Guild, RichEmbed } from "discord.js";
import { GuildData } from "./guildData";
import { Token } from "./tokenizer";
import { MemberNotFound } from "./error";

export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export const nameof = <T>(name: keyof T): string => name.toString();

export function stringDiff(a: string, b: string){ 
    let diff = "";
    b.split('').forEach((char, i) => {
        if (char != a.charAt(i)) {
            diff += char;
        }
    });
    return diff;
}

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

    current(): T {
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

export function getMemberFromMention(guild: Guild | GuildData, mention: string | Token<ArgumentType>): GuildMember {
    if (guild instanceof GuildData) {
        guild = guild.guild;
    }

    let id: string;
    if (typeof mention == "string") {
        let match = mention.match(commandTokenizer.getRegex("user"));
        if (match == null) {
            throw new MemberNotFound(mention)
        }

        id = match[0].replace(/[^\d]/g, "")
    }
    else {
        if (mention.type != "user") {
            throw new MemberNotFound(mention.value);
        }
        
        mention = mention.value;
        id = mention.replace(/[^\d]/g, "")
    }

    let member = guild.member(id);
    if (member == null) {
        throw new MemberNotFound(mention);
    }
    return member;
}

export function generateErrorEmbed(message: Error | string, includeSmile?: boolean): RichEmbed {
    let errorEmbed = new RichEmbed();
    errorEmbed.setTitle(`**Произошла ошибка**`);
    errorEmbed.setColor("#FF0000");
    errorEmbed.setDescription((message instanceof Error ? message.message : message) + (includeSmile != false ? " :/" : ""));
    return errorEmbed;
}