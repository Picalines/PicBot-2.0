import { MemberNotFoundError, MemberIsBotError, RoleNotFoundError } from "./error";
import { GuildMember, Guild, RichEmbed, Role } from "discord.js";
import { commandTokenizer, ArgumentType } from "./command";
import { GuildData } from "./guildData";
import { Token } from "./tokenizer";

export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
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
            this.index = - 1;
            return this.index == 0;
        }
        return false;
    }
}

export function getMemberFromMention(guild: Guild | GuildData, mention: string | Token<ArgumentType>, botCheck: boolean): GuildMember {
    if (guild instanceof GuildData) {
        guild = guild.guild;
    }

    if (typeof mention == "string") {
        let match = mention.match(commandTokenizer.getRegex("user"));
        if (match == null) {
            throw new MemberNotFoundError(mention)
        }
        mention = match[0];
    }
    else {
        if (mention.type != "user") {
            throw new MemberNotFoundError(mention.value);
        }
        mention = mention.value;
    }

    let id = mention.replace(/[^\d]/g, "")

    let member = guild.member(id);
    if (member == null) {
        throw new MemberNotFoundError(mention);
    }
    else if (botCheck && member.user.bot) {
        throw new MemberIsBotError(mention);
    }
    return member;
}

export function getRoleFromMention(guild: Guild | GuildData, mention: string | Token<ArgumentType>): Role {
    if (guild instanceof GuildData) {
        guild = guild.guild;
    }

    if (typeof mention == "string") {
        let match = mention.match(commandTokenizer.getRegex("role"));
        if (match == null) {
            throw new RoleNotFoundError(mention)
        }
        mention = match[0];
    }
    else {
        if (mention.type != "role") {
            throw new RoleNotFoundError(mention.value);
        }
        mention = mention.value;
    }

    let id = mention.replace(/[^\d]/g, "");

    let role = guild.roles.find(r => r.id == id);
    if (role == null) {
        throw new RoleNotFoundError(mention);
    }
    return role;
}

export function generateErrorEmbed(message: Error | string, includeSmile?: boolean): RichEmbed | string {
    const errorEmbed = new RichEmbed()
        .setTitle(`**Произошла ошибка**`)
        .setColor(colors.RED);

    if (message instanceof Error && message.message == "Cannot send an empty message") {
        message = "Я не могу отослать пустое сообщение";
    }

    const desc = (message instanceof Error ? message.message : message) + (includeSmile != false ? " :/" : "");
    try {
        errorEmbed.setDescription(desc);
    }
    catch (err) {
        if (err instanceof RangeError) {
            return `**Ошибка**: ${desc}`;
        }
    }
    return errorEmbed;
}

export async function clearRoles(member: GuildMember, reason?: string) {
    for (const [id, r] of member.roles) {
        try {
            await member.removeRole(r);
        }
        catch (_) {}
    }
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
export function randomRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
export function randomRangeInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function isOneOf<T>(value: T, ...variants: T[]): boolean {
    for (const v of variants) {
        if (value == v) {
            return true;
        }
    }
    return false;
}

export function flat<T>(array: (T | T[])[]) {
    const flattend: T[] = [];
    (function f(array) {
        array.forEach(function (el) {
            if (Array.isArray(el)) f(el);
            else flattend.push(el);
        });
    })(array);
    return flattend;
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

// #region emojis

type Emoji = "thumbsup" | "repair" | "dice"

export const emojis: { [key in Emoji]: string } = {
    thumbsup: "👍",
    repair: "🔧",
    dice: "🎲",
}

// #endregion

export function timestamp(seconds: number) {
    let dateObj = new Date(seconds * 1000);
    let hours = dateObj.getUTCHours();
    let minutes = dateObj.getUTCMinutes();
    seconds = dateObj.getSeconds();

    return hours.toString().padStart(2, '0') + ':' +
        minutes.toString().padStart(2, '0') + ':' +
        seconds.toString().padStart(2, '0');
}