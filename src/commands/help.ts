import { Command, CommandInfo, ArgumentEnumerator, ArgumentType, commands, findCommand } from "../command";
import { Message, RichEmbed, GuildMember } from "discord.js";
import { assetsFolderPath } from "../database";
import { colors } from "../utils";
import * as fs from "../fsAsync";

interface CommandList {
    group: string;
    list: CommandInfo[];
}

function compareCommands(a: CommandInfo, b: CommandInfo): number {
    let aSyntaxLength = a.syntax != undefined ? Command.syntaxToString(a.syntax).length : 0;
    let bSyntaxLength = b.syntax != undefined ? Command.syntaxToString(b.syntax).length : 0;
    return (a.name.length + aSyntaxLength + a.description.length) - (b.name.length + bSyntaxLength + b.description.length);
}

function compareCommandList(a: CommandList, b: CommandList): number {
    return b.group.length - a.group.length;
}

type ArgTypeDescriptions = {
    [key in keyof ArgumentType]: string;
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
        const grouped: { [group: string]: CommandList } = {};

        for (const c of commands) {
            if (!c.checkPermission(member)) {
                continue;
            }

            let info = c.info;
            const g = info.group || "Другое";
            if (grouped[g] == undefined) {
                grouped[g] = { group: g, list: [] };
            }

            grouped[g].list.push(info);
        }

        const groupedArr: CommandList[] = [];
        for (let g in grouped) {
            grouped[g].list.sort(compareCommands)
            groupedArr.push(grouped[g]);
        }
        groupedArr.sort(compareCommandList);

        const embed = new RichEmbed()
            .setTitle("Список доступных команд")
            .setColor(colors.AQUA);

        for (const gArr of groupedArr) {
            let s = "";
            for (const info of gArr.list) {
                s += `\`${info.name}\` `;

                if (info.syntax != undefined) {
                    s += Command.syntaxToString(info.syntax);
                }

                s += " - " + info.description + "\n";
            }
            embed.addField(gArr.group, s);
        }

        return embed;
    }

    private async generateTypesHelp(): Promise<RichEmbed> {
        const typeDesc = await fs.readJson<ArgTypeDescriptions>(assetsFolderPath + "helpArgType.json");

        const embed = new RichEmbed()
            .setTitle("Типы аргументов")
            .setColor(colors.GREEN);

        let s = "";
        for (const t in typeDesc) {
            s += `\`${t}\` - ${typeDesc[t]}\n`;
        }

        return embed.setDescription(s);
    }

    private generateCommandHelp(info: CommandInfo): RichEmbed {
        return new RichEmbed()
            .setTitle(`Информация о команде \`${info.name}\``)
            .setColor(colors.GREEN)
            .addField("Описание", info.description)
            .addField("Аргументы", info.syntax != undefined ? Command.syntaxToString(info.syntax) : "*нету*")
            .addField("Группа", info.group || "Другое")
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const name = this.readNextToken(argEnumerator, "word", "Ожидалось имя команды", "_all_");
        if (name == "_all_") {
            await msg.channel.send(`${msg.member}, для помощи по типам аргументов юзай \`help ${this.argTypeArg}\``, this.generateList(msg.member));
        }
        else if (name == this.argTypeArg) {
            if (this.typesHelp == undefined) {
                this.typesHelp = await this.generateTypesHelp();
            }
            
            await msg.reply(this.typesHelp);
        }
        else {
            const c = findCommand(cc => cc.info.name == name);

            if (c == undefined) {
                throw new Error(`Информация о команде '${name}' не найдена`);
            }

            await msg.reply(this.generateCommandHelp(c.info));
        }
    }
}