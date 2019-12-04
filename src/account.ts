import { DataObject, IProperty } from "./property";
import { ISerializeable } from "./utils";
import * as Discord from "discord.js";

type AccountPropertyType = string | number | boolean;

export class Account extends DataObject<AccountPropertyType> implements ISerializeable {
    member: Discord.GuildMember | null;

    constructor(member: Discord.GuildMember | null, properties?: IProperty<AccountPropertyType>[]) {
        super();
        this.member = member;
        if (properties) {
            properties.forEach(p => this.setProperty(p.name, p.value));
        }
    }

    serialize() {
        return {
            "id": this.member != null ? this.member.id : "unknown",
            "properties": super.serialize()
        }
    }
}