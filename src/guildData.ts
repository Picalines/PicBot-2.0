import { NullReferenceError, DeserializationError, MemberIsBotError } from "./error";
import { Account, IAccountData } from "./account";
import { DataObject, Property } from "./property";
import * as Discord from "discord.js";
import { nameof } from "./utils";
import { Debug } from "./debug";
import { bot } from "./main";

export class GuildData extends DataObject {
    readonly guild: Discord.Guild;

    prefixes: string[];
    accounts: { [id: string]: Account };

    constructor(guild: Discord.Guild, properties?: Property[]) {
        super(properties);
        this.guild = guild;
        this.prefixes = ['~'];
        this.accounts = {};
    }

    hasPrefix(pref: string): boolean {
        return this.prefixes.find(p => p == pref) != undefined;
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
            throw new NullReferenceError("member");
        }
        if (member.user.bot) {
            throw new MemberIsBotError(member.toString());
        }

        member = this.checkMemberGuild(member, nameof<GuildData>("getAccount"))

        if (this.accounts[member.id] == undefined) {
            this.accounts[member.id] = new Account(member);
        }

        return this.accounts[member.id];
    }

    deleteAccount(member: Discord.GuildMember): boolean {
        if (member != null && !member.user.bot) {
            delete this.accounts[member.id];
            return this.accounts[member.id] == undefined;
        }
        return false;
    }

    setAccount(data: IAccountData): boolean {
        let member = this.guild.member(data.id);
        if (member != null && !member.user.bot && member.guild == this.guild) {
            this.accounts[member.id] = new Account(member, data.properties);
            return true;
        }
        return false;
    }

    serializeAccounts(): IAccountData[] {
        let accs: IAccountData[] = [];
        for (const id in this.accounts) {
            if (this.accounts[id].properties.length > 0) {
                accs.push(this.accounts[id].serialize());
            }
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

    cleanAccounts() {
        const result: { [id: string]: Account } = {};
        for (const id in this.accounts) {
            const acc = this.accounts[id];
            if ((acc.properties.length == 1 && acc.getProperty<number>("xp", 0).value > 0) || acc.properties.length > 1) {
                result[id] = this.accounts[id];
            }
        }
        this.accounts = result;
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

export function deleteGuildData(guild: Discord.Guild): boolean {
    if (guild != null) {
        delete guildsData[guild.id];
        return true;
    }
    return false;
}

export function deserializeGuildData(data: any): GuildData {
    if (data?.id) {
        const guild = bot.guilds.find(g => g.id == data.id);
        if (guild != null) {
            let guildData = new GuildData(guild, data.properties);

            if (data.accounts) {
                for (const j in data.accounts) {
                    const acc: IAccountData = data.accounts[j];
                    if (!guildData.setAccount(acc)) {
                        Debug.Log(`account data #${j} (${acc.id}) ignored`, "warning");
                    }
                }
            }

            if (typeof data.prefixes == "object") {
                guildData.prefixes = data.prefixes;
            }

            return guildData;
        }
    }
    throw new DeserializationError("invalid guild data argument");
}