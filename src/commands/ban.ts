import { Message, RichEmbed, GuildMember, TextChannel } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { delay } from "../utils";
import { getGuildData } from "../guildData";

export class BanCommand extends Command {
    info: CommandInfo = {
        name: "ban",
        description: "банит участника сервера",
        permission: "admin"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        
    }

    async banMember(channel: TextChannel | Message, member: GuildMember, admin: GuildMember, reason: string = "", delaySec: number = 0, days?: number): Promise<boolean> {
        if (channel instanceof Message) {
            if (!(channel.channel instanceof TextChannel)) return false;
            channel = channel.channel;
        }

        if (!member.bannable || channel.guild != member.guild || member.hasPermission("ADMINISTRATOR")) {
            return false;
        }

        if (reason == "") {
            reason = "Не указана :/";
        }

        let banEmbed = new RichEmbed();
        banEmbed.setTitle("Информация о бане");
        banEmbed.setThumbnail(member.user.avatarURL);
        banEmbed.setFooter(`Злодный админ: ${admin}`);
        banEmbed.setColor("#FF0000");
        banEmbed.addField("Жертва", member.toString());
        banEmbed.addField("Причина", reason);

        if (days != undefined) {
            banEmbed.addField("Кол-во дней", days);
        }

        await channel.send(banEmbed);

        if (delaySec > 0) {
            await channel.send(`${member}, у тебя есть ещё ${delaySec} секунд(ы) счастливой жизни на этом сервере ;)`);
            await delay(delaySec * 1000);
            if (!member.bannable) {
                return false;
            }
        }

        await member.ban({ reason: reason, days: days });
        
        if (days == undefined) {
            getGuildData(channel.guild).deleteAccount(member);
        }

        return true;
    }
}