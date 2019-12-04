import { ISerializeable } from "./utils";
import { Property, DataObject } from "./property";
import * as Discord from "discord.js";
import { bot } from "./main";

export class Account extends DataObject implements ISerializeable {
    readonly user: Discord.User | null;

    constructor(user: Discord.User | Discord.GuildMember | null) {
        super();
        this.user = user instanceof Discord.GuildMember ? user.user : user;
    }

    static async load(from: string): Promise<any> {
        let data = JSON.parse(from);
        let acc = new Account(data.id && data.id != "unknown" ? await bot.fetchUser(data.id) : null);
        data.properties.forEach((p: Property<string | number>) => acc.setProperty(p.name, p.value));
        return acc;
    }

    serialize() {
        return {
            "id": this.user != null ? this.user.id : "unknown",
            "properties": (super.serialize() as any).properties
        }
    }
}