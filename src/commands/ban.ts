import { Message, RichEmbed, GuildMember, TextChannel, DiscordAPIError } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { delay, getMemberFromMention, colors } from "../utils";
import { MemberNotFoundError } from "../error";
import { getGuildData } from "../guildData";

export class BanCommand extends Command {
    info: CommandInfo = {
        name: "ban",
        syntax: [["user", "member"], ["string", "reason", false], ["int", "delaySec", false]],
        description: "банит участника сервера `member`",
        permission: "admin",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let memberMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание неугодного участника сервера");

        let member = getMemberFromMention(msg.guild, memberMention, true);
        if (member == msg.member) {
            throw new Error("нельзя забанить самого себя");
        }

        let reason = this.readNextToken(argEnumerator, "string", "Ожидалась строка", "");
        let delaySec = Number(this.readNextToken(argEnumerator, "int", "Ожидалось кол-во секунд", "0"));

        if (!(await this.banMember(msg, member, msg.member, reason, delaySec))) {
            await msg.reply(`Я не смог забанить ${member} :/`);
        }
    }

    async banMember(channel: TextChannel | Message, member: GuildMember, admin: GuildMember, reason: string = "", delaySec: number = 0): Promise<boolean> {
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

        const banEmbed = new RichEmbed()
            .setTitle("Информация о бане")
            .setThumbnail(member.user.avatarURL)
            .setFooter(`Злобный админ: ${admin.displayName}`, admin.user.avatarURL)
            .setColor(colors.RED)
            .addField("Жертва", member.toString())
            .addField("Причина", reason);

        await channel.send(banEmbed);

        if (!isNaN(delaySec) && delaySec > 0) {
            await channel.send(`${member}, у тебя есть ещё ${delaySec} секунд(ы) счастливой жизни на этом сервере ;)`);
            await delay(delaySec * 1000);
            if (!member.bannable) {
                return false;
            }
        }

        await member.ban({ reason: reason });
        
        getGuildData(channel.guild).deleteAccount(member);

        return true;
    }
}

export class UnbanCommand extends Command {
    info: CommandInfo = {
        name: "unban",
        syntax: [["int", "id"]],
        description: "Убирает бан участника по его `id`",
        permission: "admin",
        group: "Администрирование"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let id = this.readNextToken(argEnumerator, "int", "ожидалось id исправившегося участника сервера");

        let bans = (await msg.guild.fetchBans()).array();
        let user = bans.find(u => u.id == id);
        if (!user) {
            throw new MemberNotFoundError(id);
        }

        try {
            await msg.guild.unban(user);
        } catch (err) {
            if (err instanceof DiscordAPIError) {
                throw new Error(`*Нечто* не позволило мне разбанить участника с id \`${id}\``);
            }
        }
    }
}