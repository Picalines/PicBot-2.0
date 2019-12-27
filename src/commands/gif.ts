import { Command, CommandInfo, ArgumentEnumerator, SyntaxArgument } from "../command";
import { Message, RichEmbed } from "discord.js";
import { getMemberFromMention, getRandomFromArray } from "../utils";

function generateGifCommand(className:string, name: string, description: string, syntax: SyntaxArgument[], message: string, gifs?: string[]) {
    module.exports[className] = class Generic extends Command {
        info: CommandInfo = {
            name,
            description,
            permission: "everyone",
            syntax
        }

        async run(msg: Message, argEnumerator: ArgumentEnumerator) {
            let targetMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера", "");
            let target = getMemberFromMention(msg.guild, targetMention);

            message = message.replace("%author%", `**${msg.member.displayName}**`).replace("%target%", `**${target.displayName}**`);

            let embed: RichEmbed | undefined = undefined;
            if (gifs) {
                embed = new RichEmbed().setImage(getRandomFromArray(gifs));
            }

            await msg.channel.send(message, embed);
        }
    }
}

generateGifCommand("HugCommand", "hug", "ты обнимаешь `member`", [["user", "member"]], "%author% обнимает %target%", [
    "https://cdn.dribbble.com/users/90216/screenshots/1410933/3-drib-cindysuen-hugs.gif",
    "https://thumbs.gfycat.com/ExaltedHeftyLark-size_restricted.gif",
    "https://media.giphy.com/media/3oEdv4hwWTzBhWvaU0/giphy.gif",
    "https://media.giphy.com/media/42YlR8u9gV5Cw/giphy.gif",
    "https://media.giphy.com/media/JzsG0EmHY9eKc/giphy.gif",
    "https://media.giphy.com/media/KL7xA3fLx7bna/giphy.gif"
]);