import { Command, CommandInfo, ArgumentEnumerator, SyntaxArgument } from "../command";
import { Message, Attachment } from "discord.js";
import { assetsFolderPath } from "../database";
import Jimp from "jimp";

interface IMemeCommandData {
    sourceAsset: string;
    blitDist: {
        x: number; y: number;
        w: number; h: number;
    };
    effects?: (image: Jimp) => Jimp;
}

function generateMemeCommand(className: string, name: string, description: string, data: IMemeCommandData) {
    module.exports[className] = class ScaryCommand extends Command {
        info: CommandInfo = {
            name,
            description,
            syntax: [["word", "link", false]],
            permission: "everyone",
            group: "Фан"
        };

        async readFromAttachment(msg: Message) {
            const attachment = msg.attachments.find(a => a.width != undefined && !a.filename.endsWith(".gif"));
            if (!attachment) {
                throw new Error("картинка не найдена");
            }
            return await this.readFromUrl(attachment.url);
        }

        async readFromUrl(url: string) {
            try {
                return await Jimp.read(url);
            }
            catch (_) {
                throw new Error("ошибка загрузки картинки");
            }
        }

        async run(msg: Message, argEnumerator: ArgumentEnumerator) {
            const imageLink = this.readNextToken(argEnumerator, "word", "ожидалась ссылка на картинку", "");
            msg.channel.startTyping();

            let image = await (imageLink.length > 0 ? this.readFromUrl(imageLink) : this.readFromAttachment(msg));
            let meme = await Jimp.read(assetsFolderPath + "itScaresMe.jpg");

            let attachment: Attachment;

            try {
                const { x, y, w, h } = data.blitDist;
                image = image.resize(w, h);

                if (data.effects) {
                    image = data.effects(image);
                }

                meme = meme.blit(image, x, y);


                attachment = new Attachment(await meme.getBufferAsync(Jimp.MIME_JPEG));
            }
            catch (err) {
                throw new Error("ошибка создания мема");
            }

            await msg.reply(attachment);
            msg.channel.stopTyping(true);

            if (msg.deletable) {
                await msg.delete();
            }
        }
    }
}

generateMemeCommand("ScaryCommand", "scary", "бот делает мем \"*it scares me...*\"", {
    sourceAsset: "itScaresMe.jpg",
    blitDist: {
        x: 205, y: 403,
        w: 197, h: 195
    }
})