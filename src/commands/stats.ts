import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, RichEmbed, GuildMember } from "discord.js";
import { getMemberFromMention } from "../utils";
import { getAccount } from "../account";

export class StatsCommand extends Command {
    info: CommandInfo = {
        name: "stats",
        syntax: [["user", "member", false]],
        description: "бот пишет вашу статистику на сервере",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let mention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера", "none");
        let member = mention != "none" ? getMemberFromMention(msg.guild, mention) : msg.member;

        await msg.channel.send(this.createEmbed(member));
    }

    private createEmbed(member: GuildMember): RichEmbed {
        let acc = getAccount(member);
        let xp = acc.getProperty("xp", 0).value;
        let warns = acc.getProperty("warns");
    
        let embed = new RichEmbed();
        embed.setTitle(`**Статистика ${member.displayName}**`);
        embed.setThumbnail(member.user.avatarURL);
        embed.setColor(member.displayColor);

        embed.addField("Опыт", xp);
        if (warns != undefined) {
            embed.addField("*Опасность*", `Предупреждения: ${warns.value}`);
        }

        return embed;
    }
}