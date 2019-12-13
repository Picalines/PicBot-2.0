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
    errorEmbed.setColor(colors.RED);
    errorEmbed.setDescription((message instanceof Error ? message.message : message) + (includeSmile != false ? " :/" : ""));
    return errorEmbed;
}

// #region discord colors

type ColorName = "DEFAULT"
    | "AQUA"
    | "GREEN"
    | "BLUE"
    | "PURPLE"
    | "GOLD"
    | "ORANGE"
    | "RED"
    | "GREY"
    | "DARKER_GREY"
    | "NAVY"
    | "DARK_AQUA"
    | "DARK_GREEN"
    | "DARK_BLUE"
    | "DARK_PURPLE"
    | "DARK_GOLD"
    | "DARK_ORANGE"
    | "DARK_RED"
    | "DARK_GREY"
    | "LIGHT_GREY"
    | "DARK_NAVY"
    | "LUMINOUS_VIVID_PINK"
    | "DARK_VIVID_PINK"

export const colors: { [name in ColorName]: number } = {
    DEFAULT: 0,
    AQUA: 1752220,
    GREEN: 3066993,
    BLUE: 3447003,
    PURPLE: 10181046,
    GOLD: 15844367,
    ORANGE: 15105570,
    RED: 15158332,
    GREY: 9807270,
    DARKER_GREY: 8359053,
    NAVY: 3426654,
    DARK_AQUA: 1146986,
    DARK_GREEN: 2067276,
    DARK_BLUE: 2123412,
    DARK_PURPLE: 7419530,
    DARK_GOLD: 12745742,
    DARK_ORANGE: 11027200,
    DARK_RED: 10038562,
    DARK_GREY: 9936031,
    LIGHT_GREY: 12370112,
    DARK_NAVY: 2899536,
    LUMINOUS_VIVID_PINK: 16580705,
    DARK_VIVID_PINK: 12320855
}

// #endregion