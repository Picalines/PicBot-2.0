import { DataObject } from "./property";
import * as Discord from "discord.js";
import { Account } from "./account";

export class GuildData extends DataObject {
    readonly guild: Discord.Guild;

    prefixes: string[];
    accounts: { [id: string]: Account };

    constructor(guild: Discord.Guild) {
        super();
        this.guild = guild;
        this.prefixes = ['!'];
        this.accounts = {};
    }

    hasPrefix(pref: string): boolean {
        for (let i in this.prefixes) {
            if (this.prefixes[i] == pref) return true;
        }
        return false;
    }

    getAccount(member: Discord.GuildMember | Discord.Message): Account {
        if (member instanceof Discord.Message) {
            member = member.member;
        }

        if (member.guild != this.guild) {
            member = this.guild.member(member.user);
            if (!member) throw new Error(`getAccount member.guild != this.guild`);
        }

        if (this.accounts[member.id] == undefined) {
            this.accounts[member.id] = new Account(member);
        }

        return this.accounts[member.id];
    }

    serialize(): {} {
        return {
            "id": this.guild.id,
            "prefixes": this.prefixes,
            "properties": super.serialize(),
            //"accounts": serializeAccounts(this)
        }
    }
}

var guilds: { [id: string]: GuildData } = {}

export function getGuildData(guild: Discord.Guild | Discord.GuildMember | Discord.Message): GuildData {
    if (guild instanceof Discord.GuildMember || guild instanceof Discord.Message) {
        guild = guild.guild;
    }

    if (guilds[guild.id] == undefined) {
        guilds[guild.id] = new GuildData(guild);
    }

    return guilds[guild.id];
}