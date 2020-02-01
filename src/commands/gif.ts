import { Command, CommandInfo, ArgumentEnumerator, SyntaxArgument } from "../command";
import { getMemberFromMention, randomFrom } from "../utils";
import { Message, RichEmbed, GuildMember } from "discord.js";
import { assetsFolderPath } from "../database";
import { Debug } from "../debug";

interface IGifCommandCase {
    message: string | (() => string);
    images?: string[];
    condition?: (a: GuildMember, b?: GuildMember) => boolean;
    setEmbed?: (embed: RichEmbed) => Promise<RichEmbed> | RichEmbed | undefined;
}

function generateGifCommand(className: string, name: string, description: string, syntax: SyntaxArgument[], cases: IGifCommandCase[]) {
    module.exports[className] = class Generic extends Command {
        info: CommandInfo = {
            name,
            description,
            permission: "everyone",
            syntax,
            group: "Фан"
        }

        private targetRegex = /%(target|TARGET)%/g;

        async run(msg: Message, argEnumerator: ArgumentEnumerator) {
            const targetMention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера", "");
            const target: GuildMember | undefined = targetMention != "" ? getMemberFromMention(msg.guild, targetMention, false) : undefined;

            const useCase: IGifCommandCase | undefined = cases.find(c => c.condition == undefined || c.condition(msg.member, target));

            if (useCase == undefined) {
                Debug.Log(`use cases for ${name} is invalid`, "error");
                await msg.reply(".-.");
                return;
            }

            let message = typeof useCase.message == "string" ? useCase.message : useCase.message();

            if (this.targetRegex.test(message) && target == undefined) {
                throw new SyntaxError("ожидалось упоминание участника сервера");
            }

            message = message.replace("%AUTHOR%", `**${msg.member.displayName.toUpperCase()}**`).replace("%author%", `**${msg.member.displayName}**`);
            
            if (target) {
                message = message.replace("%TARGET%", `**${target.displayName.toUpperCase()}**`).replace("%target%", `**${target.displayName}**`);
            }

            let embed: RichEmbed | undefined = undefined;

            if (useCase.setEmbed) {
                embed = await useCase.setEmbed(new RichEmbed());
            }
            else if (useCase.images && useCase.images.length > 0) {
                let img = randomFrom(useCase.images);
                if (img != "null") {
                    embed = new RichEmbed().setImage(img);
                }
            }

            await msg.channel.send(message, embed);
        }
    }
}

generateGifCommand("HugCommand", "hug", "ты обнимаешь `member`", [["user", "member"]], [
    {
        condition: (a, b) => a == b,
        message: "%author% страдает от одиночества..."
    },
    {
        condition: (a, b) => b != undefined && b == b.guild.me,
        message: () => randomFrom(["Спасибо :3", "Пасеба :>"]),
        images: [
            "https://media.giphy.com/media/QMkPpxPDYY0fu/giphy.gif",
            "https://media.giphy.com/media/KL7xA3fLx7bna/giphy.gif"
        ]
    },
    {
        message: "%author% обнимает %target%",
        images: [
            "https://cdn.dribbble.com/users/90216/screenshots/1410933/3-drib-cindysuen-hugs.gif",
            "https://thumbs.gfycat.com/ExaltedHeftyLark-size_restricted.gif",
            "https://media.giphy.com/media/3oEdv4hwWTzBhWvaU0/giphy.gif",
            "https://media.giphy.com/media/42YlR8u9gV5Cw/giphy.gif",
            "https://media.giphy.com/media/JzsG0EmHY9eKc/giphy.gif",
            "https://media.giphy.com/media/KL7xA3fLx7bna/giphy.gif"
        ]
    }
]);

generateGifCommand("ToBeContCommand", "tobecont", "*to be continued*", [], [
    {
        message: "*продолжение следует...*",
        images: [
            "https://avatanplus.com/files/resources/mid/595bf680e03ca15d0f3ae796.png"
        ]
    }
]);

generateGifCommand("EatCommand", "eat", "ты ешь `member`", [["user", "member"]], [
    {
        condition: (a, b) => a == b,
        message: "%author% ест сам себя... чо...",
        setEmbed: (embed: RichEmbed) => Math.random() <= 0.3 ? embed.attachFile(assetsFolderPath + "eatYorself.png").setDescription("?") : undefined
    },
    {
        condition: (a, b) => b != undefined && b == b.guild.me,
        message: "0_o"
    },
    {
        message: "%author% ест %target%"
    }
]);

generateGifCommand("FbiCommand", "fbi", "ты вызываешь fbi", [["user", "target"]], [
    {
        condition: (a, b) => b != undefined && b == b.guild.me,
        message: "А со мной-то чё не так..."
    },
    {
        message: "- Алло, ФБР? МЫ НАШЛИ %TARGET%...!\n- ВЫЕЗЖАЕМ!",
        images: [
            "https://media1.tenor.com/images/93d11bc59526ce49f60766f0045d819b/tenor.gif?itemid=11500735",
            "https://thumbs.gfycat.com/DigitalCriminalHornedtoad-size_restricted.gif",
            "https://media.giphy.com/media/kxevHLcRrMbtC1SXa8/giphy.gif"
        ]
    }
]);

generateGifCommand("PunchCommand", "punch", "ты ударяешь `member`", [["user", "member"]], [
    {
        condition: (a, b) => a == b,
        message: "Зачем ты бьёшь самого себя? Тебе нужна помошь?"
    },
    {
        condition: (a, b) => b != undefined && b == b.guild.me,
        message: () => randomFrom(["ай(", "больна ващета...", ":<(", "ща девиантом стану...", ":["])
    },
    {
        message: "%author% бьёт %target%",
        images: [
            "https://uploads.disquscdn.com/images/35689c5047b631172d4ecdc9b3f08941604052830a80b2f36079e6e35ae9f439.gif",
            "https://media2.giphy.com/media/3oEdvaHfjYlFMLrFTO/giphy.gif",
            "https://data.whicdn.com/images/286613675/original.gif"
        ]
    }
]);

const zapoiImages = [
    "https://media.giphy.com/media/E3L5goMMSoAAo/giphy.gif",
    "https://media.giphy.com/media/1BXa2alBjrCXC/giphy.gif",
    "https://media.giphy.com/media/xT1XGQHjEkRdsggVXi/giphy.gif",
    "https://media.giphy.com/media/8JCwuk8n2Y6iI/giphy.gif",
    "https://media.giphy.com/media/TJckbZ9PTjkek/giphy.gif"
];

generateGifCommand("ZapoiCommand", "zapoi", "ты уходишь в запой", [["user", "member", false]], [
    {
        condition: (a, b) => b != undefined,
        message: "%author% и %target% ушли в запой...",
        images: zapoiImages
    },
    {
        message: "%author% ушел в запой...",
        images: zapoiImages
    }
]);

const F = `
FFFFFFFFFFFFF
FFFFFFFFFFFFF
FFFF
FFFF
FFFFFFFFF
FFFFFFFFF
FFFF
FFFF
FFFF
`

generateGifCommand("FCommand", "f", "ты отдаёшь честь...", [], [
    {
        condition: () => Math.random() <= 0.25,
        message: "%author% отдаёт честь...\n" + F
    },
    {
        message: "%author% отдаёт честь...",
        images: [
            "https://media.giphy.com/media/npUpB306c3EStRK6qP/giphy.gif",
            "https://media.giphy.com/media/Gyb7Mrx7jlGF2/giphy.gif",
            "https://media.giphy.com/media/6tZsIBl8VMieveHImW/giphy.gif",
            "https://media.giphy.com/media/3o6gb6qrSpLhI0rGko/giphy.gif"
        ]
    }
]);