import { DataObject } from "./property";
import * as Discord from "discord.js";

export type ChatType = "guild" | "groupdm"

export class Chat extends DataObject {
    readonly environment: Discord.GroupDMChannel | Discord.Guild;
    readonly id: string;
    
    prefixes: string[];

    get type(): ChatType {
        return Chat.getType(this.environment);
    }

    get members() {
        return this.environment instanceof Discord.Guild ? this.environment.members : this.environment.recipients;
    }

    constructor(ch: Discord.GroupDMChannel | Discord.Guild) {
        super();
        this.environment = ch;
        this.id = `${this.type}_${ch.id}`;
        this.prefixes = ['!'];
    }

    static getType(ch: Discord.GroupDMChannel | Discord.Guild): ChatType {
        return ch instanceof Discord.Guild ? "guild" : "groupdm";
    }

    static getId(ch: Discord.GroupDMChannel | Discord.Guild): string {
        return `${this.getType(ch)}_${ch.id}`;
    }

    hasPrefix(pref: string): boolean {
        for (let i in this.prefixes) {
            if (this.prefixes[i] == pref) return true;
        }
        return false;
    }

    serialize(): {} {
        return {
            "id": this.id,
            "prefixes": this.prefixes,
            "properties": super.serialize()
        }
    }
}

var chats: { [id: string]: Chat }

export function getChat(ch: Discord.GroupDMChannel | Discord.Guild) {
    let id = Chat.getId(ch);

    if (chats[id] == undefined) {
        chats[id] = new Chat(ch);
    }

    return chats[id];
}

export function getPrefixes(ch: Discord.GroupDMChannel | Discord.Guild): string[] {
    return getChat(ch).prefixes;
}