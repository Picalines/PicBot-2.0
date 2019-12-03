import { ISerializeable, Property } from "./utils";
import * as Discord from "discord.js";
import { bot } from "./main";

export class Account implements ISerializeable<string> {
    private _user: Discord.User | null;
    private _properies: Property<string | number>[];

    get user(): Discord.User | null { return this._user; }

    constructor(user: Discord.User | Discord.GuildMember | null) {
        this._properies = [];
        this._user = user instanceof Discord.GuildMember ? user.user : user;
    }

    getProperty(name: string): Property<string | number> | undefined {
        for (let i in this._properies) {
            let p = this._properies[i];
            if (p.name == name) {
                return p;
            }
        }
        return undefined;
    }

    setProperty(name: string, value: string | number) {
        const existingProp = this.getProperty(name);
        if (existingProp) {
            existingProp.value = value;
        }
        else {
            this._properies.push(new Property(name, value));
        }
    }

    removeProperty(name: string) {
        const prop = this.getProperty(name);
        if (prop) {
            delete this._properies[this._properies.indexOf(prop)];
        }
    }

    static async load(from: string): Promise<any> {
        let data = JSON.parse(from);
        let acc = new Account(data.id && data.id != "unknown" ? await bot.fetchUser(data.id) : null);
        data.properties.forEach((p: Property<string | number>) => acc.setProperty(p.name, p.value));
        return acc;
    }

    serialize(): string {
        return JSON.stringify({
            "id": this.user != null ? this.user.id : "unknown",
            "properties": this._properies
        });
    }
}