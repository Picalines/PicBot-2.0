import { Command, CommandInfo, ArgumentEnumerator, commands, findCommand } from "../command";
import { Message, RichEmbed, GuildMember } from "discord.js";
import { IAsset, getAsset } from "../database";
import { colors } from "../utils";

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

interface IArgumentTypeAsset extends IAsset {
    descriptions: { [name: string]: string };
}

export class HelpCommand extends Command {
    info: CommandInfo = {
        name: "help",
        syntax: [["word", "name", false]],
        description: "пишет список команд / информацию о команде `name`",
        permission: "everyone"
    };

    private typesHelp: RichEmbed | undefined;
    private readonly argTypeArg = "argType";

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
        embed.setColor(colors.AQUA);

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

    private async generateTypesHelp(): Promise<RichEmbed> {
        let typeDesc = (await getAsset<IArgumentTypeAsset>("argumentType")).descriptions;

        let embed = new RichEmbed();
        embed.setTitle("Типы аргументов");
        embed.setColor(colors.GREEN);

        let s = "";
        for (let t in typeDesc) {
            s += `\`${t}\` - ${typeDesc[t]}\n`;
        }

        return embed.setDescription(s);
    }

    private generateCommandHelp(info: CommandInfo): RichEmbed {
        let embed = new RichEmbed();
        embed.setTitle(`Информация о команде \`${info.name}\``);
        embed.setColor(colors.GREEN);
        embed.addField("Описание", info.description);
        embed.addField("Аргументы", info.syntax != undefined ? Command.syntaxToString(info.syntax) : "*нету*");
        embed.addField("Группа", info.group || "Другое");
        return embed;
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let name = this.readNextToken(argEnumerator, "word", "Ожидалось имя команды", "__all_list");
        if (name == "__all_list") {
            await msg.channel.send(`${msg.member}, для помощи по типам аргументов юзай \`help ${this.argTypeArg}\``, this.generateList(msg.member));
        }
        else if (name == this.argTypeArg) {
            if (this.typesHelp == undefined) {
                this.typesHelp = await this.generateTypesHelp();
            }
            await msg.reply(this.typesHelp);
        }
        else {
            let c = findCommand(cc => cc.info.name == name);
            if (c != undefined) {
                await msg.reply(this.generateCommandHelp(c.info));
            }
            else {
                throw new Error(`Информация о команде '${name}' не найдена`);
            }
        }
    }
}