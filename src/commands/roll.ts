import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { emojis, randomRangeInt } from "../utils";
import { SyntaxError } from "../error";
import { Message } from "discord.js";

export class RollCommand extends Command {
    info: CommandInfo = {
        name: "roll",
        syntax: [["word", "ndN"]],
        description: "кидает `n` кубиков (по `N` сторон на каждом)",
        permission: "everyone",
        group: "Фан"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let words = msg.content.toLowerCase().split(/\s+/);
        let data = words[1].split("d");

        argEnumerator.moveNext();

        let n = Math.floor(Number(data[0]));
        let N = Math.floor(Number(data[1]));

        if (isNaN(n) || isNaN(N)) {
            throw new SyntaxError(argEnumerator, "*странная* инфа о броске...");
        }

        let result = randomRangeInt(n, n * N);

        let op = words[2];
        if (op) {
            let sign = op[0];
            let number = Number(op.slice(1));

            if (isNaN(number)) {
                throw new SyntaxError(op, "странное число...");
            }
            
            switch (sign) {
                default: throw new SyntaxError(sign, "ожидался знак `+`/`-`");
                case "+": result += number; break;
                case "-": result -= number; break;
            }
        }

        await msg.reply(`${emojis.dice} **${result}**`);
    }
}