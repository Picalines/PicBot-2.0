import { Account, IAccountData } from "./account";
import { DataObject, Property } from "./property";
import * as Discord from "discord.js";
import { nameof } from "./utils";
import { bot } from "./main";

export class GuildData extends DataObject {
    readonly guild: Discord.Guild;

    prefixes: string[];
    accounts: { [id: string]: Account };

    constructor(guild: Discord.Guild, properties?: Property[]) {
        super(properties);
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

    private checkMemberGuild(member: Discord.GuildMember, f: string): Discord.GuildMember {
        if (member.guild != this.guild) {
            member = this.guild.member(member.user);
            if (!member) throw new Error(`${f} member.guild != this.guild`);
        }
        return member;
    }

    getAccount(member: Discord.GuildMember): Account {
        if (member == null) {
            throw new Error("getAccount member is null");
        }

        member = this.checkMemberGuild(member, nameof<GuildData>("getAccount"))

        if (this.accounts[member.id] == undefined) {
            this.accounts[member.id] = new Account(member);
        }

        return this.accounts[member.id];
    }

    setAccount(data: IAccountData) {
        let member = this.guild.member(data.id);
        if (member != null) {
            this.accounts[member.id] = new Account(member, data.properties);
        }
    }

    serializeAccounts(): IAccountData[] {
        let accs: IAccountData[] = [];
        for (let i in this.accounts) {
            accs.push(this.accounts[i].serialize());
        }
        return accs;
    }

    serialize(): {} {
        return {
            "id": this.guild.id,
            "prefixes": this.prefixes,
            "properties": super.serialize(),
            "accounts": this.serializeAccounts()
        }
    }
}

export const guildsData: { [id: string]: GuildData } = {}

export function getGuildData(guild: Discord.Guild | Discord.GuildMember | Discord.Message): GuildData {
    if (guild instanceof Discord.GuildMember || guild instanceof Discord.Message) {
        guild = guild.guild;
    }

    if (guildsData[guild.id] == undefined) {
        guildsData[guild.id] = new GuildData(guild);
    }

    return guildsData[guild.id];
}

export function deserializeGuildData(data: any): GuildData {
    if (data != undefined && data.id != undefined) {
        let guild = bot.guilds.find(g => g.id == data.id);
        if (guild != null) {
            let guildData = new GuildData(guild, data.properties);

            if (data.accounts != undefined) {
                for (let j in data.accounts) {
                    let acc: IAccountData = data.accounts[j];
                    guildData.setAccount(acc);
                }
            }

            return guildData;
        }
    }
    throw new Error("invalid guild data argument");
}