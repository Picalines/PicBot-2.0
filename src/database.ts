import * as Discord from "discord.js";
import * as fs from "./fsAsync";
import { Debug } from "./debug";

export interface IAccount {
    readonly id: string;
    xp: number;
}

export interface IReadOnlyAccount extends IAccount {
    readonly xp: number;
}

export interface IGuildData {
    readonly accounts: { [id: string]: IAccount };
    readonly prefixes: string[];
}

export class Database {
    private guilds: { [id: string]: IGuildData } = {};

    async load(path: string) {
        Debug.Log("loading database...");
        this.guilds = {};
        let guildFiles = (await fs.readdirAsync(path)).filter(f => f.endsWith(".json"));
        for (let i in guildFiles) {
            let f = guildFiles[i];
            let gData: IGuildData = JSON.parse((await fs.readFileAsync(path + f)).toString())
            if (gData) {
                this.guilds[f.replace(".json", "")] = gData;
            }
        }
        Debug.Log("database successfully loaded");
    }

    async save(path: string) {
        Debug.Log("saving database...");
        for (let i in this.guilds) {
            let g = this.guilds[i];
            let gData = JSON.stringify(g, null, 4);
            await fs.writeFileAsync(path + i + ".json", gData);
        }
        Debug.Log("database successfully saved");
    }

    getGuildData(guild: Discord.Guild): IGuildData {
        if (this.guilds[guild.id] === null) {
            this.guilds[guild.id] = {
                accounts: {},
                prefixes: ["!"]
            }
        }
        return this.guilds[guild.id];
    }

    getAccount(member: Discord.GuildMember) {
        let guild = this.getGuildData(member.guild);
        if (guild.accounts[member.id] === null) {
            guild.accounts[member.id] = {
                id: member.id,
                xp: 0
            }
        }
    }
}