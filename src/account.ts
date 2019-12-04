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

var accounts: { [guild: string]: { [id: string]: Account } }

export function getAccount(member: Discord.GuildMember): Account {
    if (member == null) throw new Error("getAccount member argument is null");
    
    if (accounts[member.guild.id] == undefined) {
        accounts[member.guild.id] = {}
    }

    if (accounts[member.guild.id][member.id] == undefined) {
        accounts[member.guild.id][member.id] = new Account(member);
    }
    
    return accounts[member.guild.id][member.id];
}

export function deleteAccount(member: Discord.GuildMember) {
    if (member == null || accounts[member.guild.id] == undefined) return;
    delete accounts[member.guild.id][member.id];
}

export function serializeAccounts(guild: Discord.Guild): {}[] {
    if (guild == null || accounts[guild.id] == undefined) return [];
    let accs: {}[] = [];

    for (let i in accounts[guild.id]) {
        let acc = accounts[guild.id][i];
        accs.push(acc.serialize());
    }

    return accs;
}