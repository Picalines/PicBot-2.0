import { Command, CommandInfo, ArgumentEnumerator, commands } from "../command";
import { Message, RichEmbed, GuildMember } from "discord.js";

interface CommandList {
    group: string;
    list: CommandInfo[];
}

function compareCommands(a: CommandInfo, b: CommandInfo): number {
    let aSyntaxLength = a.syntax != undefined ? a.syntax.length : 0;
    let bSyntaxLength = b.syntax != undefined ? b.syntax.length : 0;
    return (a.name.length + aSyntaxLength) - (b.name.length + bSyntaxLength);
}

function compareCommandList(a: CommandList, b: CommandList): number {
    return b.group.length - a.group.length;
}

export class HelpCommand extends Command {
    info: CommandInfo = {
        name: "help",
        syntax: [["word", "name", false]],
        description: "пишет список команд / информацию о команде `name`",
        permission: "everyone"
    };

    private listEmbed: RichEmbed | undefined;

    private generateList(member: GuildMember): RichEmbed {
        let grouped: { [group: string]: CommandList } = {};

        for (let i in commands) {
            if (!commands[i].checkPermission(member)) {
                continue;
            }

            let info = commands[i].info;
            const g = info.group || "Другое";
            if (grouped[g] == undefined) {
                grouped[g] = { group: g, list: [] };
            }

            grouped[g].list.push(info);
        }

        let groupedArr: CommandList[] = [];
        for (let g in grouped) {
            grouped[g].list.sort(compareCommands)
            groupedArr.push(grouped[g]);
        }
        groupedArr.sort(compareCommandList);

        let embed = new RichEmbed();
        embed.setTitle("Список доступных команд");
        embed.setColor("#00FF00");

        for (let g in groupedArr) {
            let s = "";
            for (let i in groupedArr[g].list) {
                let info = groupedArr[g].list[i];
                s += `\`${info.name}\` `;
                if (info.syntax != undefined) {
                    s += Command.syntaxToString(info.syntax);
                }
                s += " - " + info.description + "\n";
            }
            embed.addField(groupedArr[g].group, s);
        }

        return embed;
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        if (this.listEmbed == undefined) {
            this.listEmbed = this.generateList(msg.member);
        }

        await msg.reply(this.listEmbed);
    }
}