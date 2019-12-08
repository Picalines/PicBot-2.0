import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, RichEmbed, GuildMember } from "discord.js";
import { SyntaxError, MemberNotFound } from "../error";
import { getMemberFromMention } from "../utils";
import { getAccount } from "../account";

export class StatsCommand extends Command {
    info: CommandInfo = {
        name: "stats",
        syntax: [["user", false]],
        description: "бот пишет вашу статистику на сервере",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let member: GuildMember | null;
        if (argEnumerator.moveNext()) {
            if (argEnumerator.current.type != "user") {
                throw new SyntaxError(argEnumerator, "ожидалось упоминание участника сервера");
            }

            member = getMemberFromMention(msg.guild, argEnumerator.current);
        }
        else {
            member = msg.member;
        }

        if (member == null) {
            throw new MemberNotFound(argEnumerator.current.value);
        }

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
            embed.addField("*Подозрительность*", `Предупреждения: ${warns.value}`);
        }

        return embed;
    }
}