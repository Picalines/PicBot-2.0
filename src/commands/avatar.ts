import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { getMemberFromMention } from "../utils";
import { Message, RichEmbed } from "discord.js";

export class AvatarCommand extends Command {
    info: CommandInfo = {
        name: "avatar",
        syntax: [["user", "mention"]],
        description: "бот кидает аватар участника сервера `mention` / иконку сервера, если указать `server`",
        permission: "everyone"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        let mention = "";

        try {
            mention = this.readNextToken(argEnumerator, "user", "ожидалось упоминание участника сервера");
        }
        catch (err) {
            const c = argEnumerator.current();
            if (c?.value == "server") {
                mention = c.value;
            }
            else {
                throw err;
            }
        }

        let _avatarURL = "";

        if (mention == "server") {
            _avatarURL = msg.guild.iconURL;
        }
        else {
            const { user: { avatarURL } } = getMemberFromMention(msg.guild, mention, false);
            _avatarURL = avatarURL;
        }

        const avatarEmbed = new RichEmbed().setImage(_avatarURL);

        await msg.reply(avatarEmbed);
    }
}