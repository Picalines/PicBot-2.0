import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getGuildData } from "../guildData";
import { SyntaxError } from "../error";
import { Message } from "discord.js";

export class PrefixCommand extends Command {
    info: CommandInfo = {
        name: "prefix",
        syntax: [["word", "set|add|rm|get"], ["word", "newPrefix", false]],
        description: "добавляет новый / ставит единственный префикс `newPrefix` для команд бота / пишет полный список префиксов",
        permission: "owner"
    };

    private readonly opErrorMsg = "ожидалась операция `set` | `add` | `rm` | `get`";
    private readonly prErrorMsg = "ожидался новый префикс для команд";

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let operation = this.readNextToken(argEnumerator, "word", this.opErrorMsg);
        let prefix = this.readNextToken(argEnumerator, "word", this.prErrorMsg, "");

        if (operation != "get" && prefix == "") {
            throw new SyntaxError(argEnumerator, this.prErrorMsg);
        }

        let guildData = getGuildData(msg);

        switch (operation) {
            default: throw new SyntaxError(argEnumerator, this.opErrorMsg);

            case "set":
                guildData.prefixes = [prefix];
                await msg.reply(`для команд установлен единственный префикс \`${prefix}\``);
                break;
            
            case "add":
                if (guildData.prefixes.findIndex(p => p == prefix) != -1) {
                    throw new Error(`префикс ${prefix} уже существует`);
                }
                guildData.prefixes.push(prefix);
                await msg.reply(`для команд добавлен новый префикс \`${prefix}\``);
                break;
            
            case "rm":
                let index = guildData.prefixes.findIndex(p => p == prefix);
                if (index == -1) {
                    throw new Error(`префикс \`${prefix}\` отсутствует в списке`);
                }
                if (guildData.prefixes.length == 1) {
                    throw new Error("нельзя удалить единственный префикс из списка");
                }
                guildData.prefixes.splice(index, 1);
                await msg.reply(`префикс \`${prefix}\` успешно удалён из списка`);
                break;
            
            case "get":
                await msg.reply(`Список префиксов для команд: \`${guildData.prefixes.join("\`, \`")}\``);
                break;
        }
    }
}