import { Message, RichEmbed, StreamDispatcher, VoiceConnection, TextChannel, Guild, VoiceChannel, GuildMember } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { colors, timestamp } from "../utils";
import { Readable } from "stream";
import ytdl from "ytdl-core";
import { bot } from "../main";
import { setInterval } from "timers";

interface IQueueItem {
    readonly link: string;
    readonly info: ytdl.videoInfo;
    readonly msg: Message;
}

export class PlayCommand extends Command {
    info: CommandInfo = {
        name: "play",
        syntax: [["word", "link|search"]],
        description: "бот начинает играть / добавляет в очередь трек по ссылке / поисковому запросу",
        permission: "everyone",
        group: "Музыка"
    };

    private queues: { [serverId: string]: IQueueItem[] } = {};
    private timeOuts: { [serverId: string]: NodeJS.Timeout } = {};
    private invalidLinkMsg = "ожидалась youtube ссылка на трек";

    private connectedTo(channel: VoiceChannel, me?: GuildMember): boolean {
        if (!me) me = channel.guild.me;
        let members = channel.members.array();
        for (let i in members) {
            if (members[i].id == me.id) {
                return true;
            }
        }
        return false;
    }

    private checkChannel(channel: VoiceChannel) {
        if (!this.connectedTo(channel)) {
            delete this.queues[channel.guild.id];
            channel.connection?.disconnect();
            clearInterval(this.timeOuts[channel.guild.id]);
        }
        else if (channel.members.size == 1) {
            delete this.queues[channel.guild.id];
            channel.leave();
            clearInterval(this.timeOuts[channel.guild.id]);
        }
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
            this.queues[msg.guild.id] = [];
        }

        let info: ytdl.videoInfo;
        try {
            info = await ytdl.getBasicInfo(link);
        }
        catch (err) {
            throw new Error("Не удалось получить информацию о треке");
        }

        this.queues[msg.guild.id].push({
            link: link,
            msg: msg,
            info: info
        });

        await msg.reply("трек добавлен в очередь");
        
        if (!this.connectedTo(msg.member.voiceChannel)) {
            let connection = await msg.member.voiceChannel.join();
            
            this.timeOuts[msg.member.guild.id] = setInterval(() => {
                this.checkChannel(connection?.channel);
            }, 10000);

            await this.play(connection.channel);
        }
    }

    async play(channel: VoiceChannel) {
        if (!channel || !channel.connection) {
            return;
        }

        const serverId = channel.guild.id;

        const queue = this.queues[serverId];
        const current = queue ? queue.shift() : undefined;

        if (!queue || !current) {
            channel.leave();
            delete this.queues[serverId];
            return;
        }

        let playable: Readable;
        try {
            playable = ytdl(current.link, { "filter": "audioonly" });
        }
        catch (err) {
            await current.msg.channel.send(`не удалось загрузить трек '${current.info.title}'`);
            this.play(channel);
            return;
        }

        const embed = new RichEmbed();
        embed.setColor(colors.RED);
        embed.setTitle("**Играет следующий трек из очереди!**");
        embed.setFooter(`Предложил(а) ${current.msg.member.displayName}`, current.msg.author.avatarURL);
        embed.setThumbnail(current.info.thumbnail_url);
        embed.addField("Название", current.info.title);
        embed.addField("Продолжительность", timestamp(Number(current.info.length_seconds)));
        embed.addField("Ссылка", current.link);

        await current.msg.reply(embed);

        const dispatcher = channel.connection.playStream(playable);
        dispatcher.on("end", () => {
            console.log("end play");
            this.play(channel.guild.channels.find(ch => ch.id == channel.id) as VoiceChannel);
        });
    }

    getQueue(guild: Guild | Message): IQueueItem[] | undefined {
        if (guild instanceof Message) {
            guild = guild.guild;
        }
        return this.queues[guild.id];
    }
}


export class CurrentQueueCommand extends Command {
    info: CommandInfo = {
        name: "queue",
        description: "Бот пишет текущую очередь треков",
        permission: "everyone",
        group: "Музыка"
    };

    private formatQueueItem(item: IQueueItem): string {
        return item.info.title + `(${timestamp(Number(item.info.length_seconds))})`
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        if (!msg.guild.voiceConnection) {
            throw new Error("Бот сейчас не играет музыку на сервере");
        }
        if (msg.member.voiceChannel != msg.guild.voiceConnection.channel) {
            throw new Error("Ты находишься в другом голосовом канале");
        }

        let playCommand = findCommand(c => c instanceof PlayCommand) as PlayCommand;
        if (!playCommand) {
            throw new Error("В данный момент бот не имеет доступа к музыке");
        }

        let queue = playCommand.getQueue(msg);
        if (!queue || queue.length == 0) {
            await msg.reply("очередь треков пуста");
            return;
        }

        
        let qEmbed = new RichEmbed();
        qEmbed.setColor(colors.AQUA);
        qEmbed.setTitle("**Очередь треков**");

        let allFormat = "";
        for (let i in queue) {
            allFormat += this.formatQueueItem(queue[i]) + "\n";
        }

        try {
            qEmbed.setDescription(allFormat);
        }
        catch (err) {
            if (err instanceof RangeError) {
                await msg.reply(`очередь треков:\n${allFormat}`);
                return;
            }
            else {
                throw new Error(err.message);
            }
        }

        await msg.reply(qEmbed);
    }
}