import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, RichEmbed, GuildMember, TextChannel } from "discord.js";
import { getAccount } from "../account";

export class BanCommand extends Command {
    info: CommandInfo = {
        name: "ban",
        description: "банит участника сервера",
        permission: "admin"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        
    }

    async banMember(channel: TextChannel | Message, member: GuildMember, reason: string): Promise<boolean> {
        if (channel instanceof Message) {
            if (!(channel.channel instanceof TextChannel)) return false;
            channel = channel.channel;
        }

        if (!member.bannable || channel.guild != member.guild) {
            return false;
        }
        
        

        return true;
    }
}