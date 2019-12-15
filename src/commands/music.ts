import { Message, RichEmbed, StreamDispatcher, VoiceConnection } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator } from "../command";
import { colors, timestamp } from "../utils";
import { Readable } from "stream";
import ytdl from "ytdl-core";
import { bot } from "../main";

interface IMusicQueueItem {
    link: string;
    msg: Message;
}

interface IMusicQueue {
    dispatcher?: StreamDispatcher;
    items: IMusicQueueItem[];
    current?: IMusicQueueItem;
}

export class PlayCommand extends Command {
    info: CommandInfo = {
        name: "play",
        syntax: [["word", "link|search"]],
        description: "бот начинает играть / добавляет в очередь трек по ссылке / поисковому запросу",
        permission: "everyone",
        group: "Музыка"
    };

    private queues: { [serverId: string]: IMusicQueue } = {};

    private invalidLinkMsg = "ожидалась youtube ссылка на трек";

    constructor() {
        super();
        bot.on("voiceStateUpdate", async (oldMember, newMember) => {
            // handle throwing here
        });
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        if (!msg.member.voiceChannel) {
            throw new Error("эту команду можно использовать только в голосовом канале");
        }
        if (!msg.member.voiceChannel.joinable) {
            throw new Error("я не могу подключиться к этому голосовому каналу");
        }

        let link = this.readNextToken(argEnumerator, "word", this.invalidLinkMsg);
        if (!ytdl.validateURL(link)) {
            throw new Error(this.invalidLinkMsg);
        }

        if (!this.queues[msg.guild.id]) {
            this.queues[msg.guild.id] = { items: [] };
        }

        this.queues[msg.guild.id].items.push({
            link: link,
            msg: msg
        });

        await msg.reply("трек добавлен в очередь");

        if (!msg.guild.voiceConnection) {
            await msg.member.voiceChannel.join();
            await this.play(msg.guild.voiceConnection);
        }
    }

    async play(connection: VoiceConnection) {
        if (connection == null) {
            return;
        }

        const serverId = connection.channel.guild.id;

        if (!this.queues[serverId]) {
            this.queues[serverId] = { items: [] };
        }

        let queue = this.queues[serverId];
        if ((queue.items.length == 0 && queue.current == undefined) || connection.channel.members.size <= 1) {
            delete this.queues[serverId];
            connection.disconnect();
            return;
        }

        queue.current = queue.items.shift();

        if (queue.current == undefined) {
            delete this.queues[serverId];
            connection.disconnect();
            return;
        }

        let info: ytdl.videoInfo;
        try {
            info = await ytdl.getBasicInfo(queue.current.link);
        }
        catch (err) {
            await queue.current.msg.channel.send(`не удалось загрузить трек ${queue.current.link}`);
            await this.play(connection);
            return;
        }

        let music: Readable;
        try {
            music = ytdl(queue.current.link, { "filter": "audioonly" });
        }
        catch (err) {
            await queue.current.msg.channel.send(`не удалось загрузить трек '${info.title}'`);
            await this.play(connection);
            return;
        }

        let embed = new RichEmbed();
        embed.setColor(colors.RED);
        embed.setTitle("**Играет следующий трек из очереди!**");
        embed.setFooter(`Предложил(а) ${queue.current.msg.member.displayName}`, queue.current.msg.author.avatarURL);
        embed.setThumbnail(info.thumbnail_url);
        embed.addField("Название", info.title);
        embed.addField("Продолжительность", timestamp(Number(info.length_seconds)));
        embed.addField("Ссылка", queue.current.link);

        await queue.current.msg.reply(embed);

        queue.dispatcher = connection.playStream(music);
        queue.dispatcher.on("end", async reason => {
            await this.play(connection);
        });
    }
}