import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message } from "discord.js";
import { getGuildData } from "../guildData";
import { getRoleFromMention } from "../utils";

interface IProgressionProp {
    [i: number]: { [0]: "add" | "rm", [1]: string }[]
}

export class ProgressCommand extends Command {
    info: CommandInfo = {
        name: "progress",
        syntax: [["word", "add|rm|clear"], ["role", "role"], ["int", "lvl"]],
        description: "ставит точку прогрессии, когда на уровне `lvl` нужно добавить / удалить роль `role`",
        permission: "owner"
    };

    private readonly opErrMsg = "ожидалась операция `add` / `rm` / `clear`";

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let operation = this.readNextToken(argEnumerator, "word", this.opErrMsg);

        let guildData = getGuildData(msg);

        if (operation == "clear") {
            guildData.removeProperty("progress");
            await msg.reply("прогрессия успешно очищена.");
            return;
        }
        else if (operation != "add" && operation != "rm") {
            throw new Error(this.opErrMsg);
        }

        let roleMention = this.readNextToken(argEnumerator, "role", "ожидалось упоминание роли");
        let role = getRoleFromMention(msg.guild, roleMention);
        let lvl = Number(this.readNextToken(argEnumerator, "int", "ожидался номер уровня"));

        let prop = guildData.getProperty<string>("progress", "{}");

        let progression: IProgressionProp = {};
        try {
            progression = JSON.parse(prop.value);
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                prop.value = "{}";
                progression = {};
            }
        }

        if (progression == undefined) {
            prop.value = "{}";
            progression = {};
        }

        if (!progression[lvl]) {
            progression[lvl] = [];
        }

        if (progression[lvl].find(p => p[0] == operation && p[1] == role.id)) {
            throw new Error("это действие уже назначено");
        }

        progression[lvl].push([ operation, role.id ]);

        if (progression == {}) {
            guildData.removeProperty("progress");
        }

        await msg.reply("настройки прогрессии успешно обновлены");
    }
}