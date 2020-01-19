import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { Message, RichEmbed } from "discord.js";
import { clamp, colors } from "../utils";

const borderChar = "|";
const progressChar = "⬜";
const emptyChar = "⬛";

function makeProgressBar(length: number, progress: number): string {
    progress = clamp(progress, 0, 1);
    let bar = borderChar;

    for (let i = 0; i < length; i++) {
        bar += i <= (progress * length) ? progressChar : emptyChar;
    }

    return bar + borderChar + ` ${Math.floor(progress * 100)}%`;
}

export class TryCommand extends Command {
    info: CommandInfo = {
        name: "try",
        syntax: [["string", "action"]],
        description: "вы пробуете сделать `action`",
        permission: "everyone",
        group: "Фан"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const action = this.readText(argEnumerator, undefined, msg.guild);
        const chance = Math.random();
        const progressBar = makeProgressBar(8, chance);

        const embed = new RichEmbed()
            .setTitle(`${msg.member.displayName} пробует ${action}`)
            .setColor(colors.GREEN)
            .addField("Шанс", progressBar)
            .addField("Результат", Math.random() >= chance ? "Успех!" : ":/");
        
        await msg.reply(embed);
    }
}