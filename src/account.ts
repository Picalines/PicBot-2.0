import { DataObject, IProperty, Property } from "./property";
import { ISerializeable } from "./utils";
import * as Discord from "discord.js";
import { getGuildData } from "./guildData";

export interface IAccountData {
    readonly id: string;
    readonly properties: IProperty[];
}

export class Account extends DataObject implements IAccountData, ISerializeable {
    member: Discord.GuildMember | null;

    get id(): string {
        return this.member != null ? this.member.id : "unknown";
    }

    constructor(member: Discord.GuildMember | null, properties?: IProperty[]) {
        super(properties);
        this.member = member;
    }

    serialize(): IAccountData {
        return {
            "id": this.member != null ? this.member.id : "unknown",
            "properties": super.serialize() as IProperty[]
        }
    }
}

export function getAccount(member: Discord.GuildMember | Discord.Message): Account {
    return getGuildData(member).getAccount(member instanceof Discord.Message ? member.member : member);
}