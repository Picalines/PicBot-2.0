import * as Discord from "discord.js";
import { ISerializeable, Property } from "./utils";
import { bot } from "./main";

export class Account implements ISerializeable<string, Promise<void>> {
    private _user: Discord.User;
    readonly properies: Property<string | number>[];

    get user(): Discord.User { return this._user; }

    constructor(user: Discord.User | Discord.GuildMember) {
        this._user = user instanceof Discord.GuildMember ? user.user : user; 
        this.properies = [];
    }

    getProperty(name: string): string | number | undefined {
        this.properies.forEach(p => {
            if (p.name == name) {
                return p.value;
            }
        });
        return undefined;
    }

    async load(from: string) {
        let data = JSON.parse(from);
        this._user = await bot.fetchUser(data.id);
        while (this.properies.length > 0) {
            this.properies.pop();
        }
        data.properies.forEach((p: Property<string | number>) => this.properies.push(p))
    }

    serialize(): string {
        let props: string[] = [];
        this.properies.forEach(p => props.push(p.serialize()))
        return JSON.stringify({
            "id": this.user.id,
            "properties": props
        });
    }
}