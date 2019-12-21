import { Message, RichEmbed, StreamDispatcher, VoiceConnection, TextChannel, Guild, VoiceChannel, GuildMember } from "discord.js";
import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { colors, timestamp } from "../utils";
import { Readable } from "stream";
import ytdl from "ytdl-core";
import { bot } from "../main";

interface IMusicQueueItem {
    readonly link: string;
    readonly info: ytdl.videoInfo;
    readonly msg: Message;
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

    private expectedLeave = false;

    constructor() {
        super();
        if (bot.listeners("voiceStateUpdate").length > 0) {
            return;
        }
        bot.on("voiceStateUpdate", async (oldMember, newMember) => {
            if (oldMember.id != oldMember.guild.me.id) return;
            if (!this.connectedTo(oldMember.voiceChannel || newMember.voiceChannel)) {
                if (!this.expectedLeave) {
                    let ch: TextChannel;
                    let queue = this.getQueue(oldMember.guild);
                    if (queue?.current) {
                        ch = queue.current.msg.channel as TextChannel;
                    }
                    else {
                        ch = oldMember.guild.systemChannel as TextChannel;
                    }
                    await ch.send("Чо офигели выкидывать меня с голосового канала...\nОчередь очищена");
                }
                this.expectedLeave = true;
                delete this.queues[oldMember.guild.id];
            }
        });
    }

    private connectedTo(channel: VoiceChannel, me?: GuildMember): boolean {
        if (!me) me = channel.guild.me;
        let members = channel.members.array();
        console.log(members.length);
        for (let i in members) {
            if (members[i].id == me.id) {
                return true;
            }
        }
        return false;
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

        let info: ytdl.videoInfo;
        try {
            info = await ytdl.getBasicInfo(link);
        }
        catch (err) {
            throw new Error("Не удалось получить информацию о треке");
        }

        this.queues[msg.guild.id].items.push({
            link: link,
            msg: msg,
            info: info
        });

        await msg.reply("трек добавлен в очередь");
        
        if (!this.connectedTo(msg.member.voiceChannel)) {
            let connection = await msg.member.voiceChannel.join();
            console.log("start playing");
            console.log(this.queues[msg.guild.id]);
            await this.play(connection);
        }
    }

    async play(connection: VoiceConnection) {
        if (!connection) {
            return;
        }

        const serverId = connection.channel.guild.id;

        console.log(this.queues[serverId]);
        if (!this.queues[serverId]) {
            this.queues[serverId] = { items: [] };
        }

        function leave(c: PlayCommand) {
            console.log("leaving");
            delete c.queues[serverId];
            c.expectedLeave = true;
            connection.channel.leave();
        }

        let queue = this.queues[serverId];
        if (queue.items.length == 0 && queue.current == undefined) {
            leave(this);
            return;
        }

        queue.current = queue.items.shift();

        if (queue.current == undefined) {
            leave(this);
            return;
        }

        let playable: Readable;
        try {
            playable = ytdl(queue.current.link, { "filter": "audioonly" });
        }
        catch (err) {
            console.log(err);
            await queue.current.msg.channel.send(`не удалось загрузить трек '${queue.current.info.title}'`);
            await this.play(connection);
            return;
        }

        let embed = new RichEmbed();
        embed.setColor(colors.RED);
        embed.setTitle("**Играет следующий трек из очереди!**");
        embed.setFooter(`Предложил(а) ${queue.current.msg.member.displayName}`, queue.current.msg.author.avatarURL);
        embed.setThumbnail(queue.current.info.thumbnail_url);
        embed.addField("Название", queue.current.info.title);
        embed.addField("Продолжительность", timestamp(Number(queue.current.info.length_seconds)));
        embed.addField("Ссылка", queue.current.link);

        await queue.current.msg.reply(embed);

        queue.dispatcher = connection.playStream(playable);
        queue.dispatcher.on("end", async reason => {
            await this.play(connection);
        });
    }

    getQueue(guild: Guild | Message): IMusicQueue | undefined {
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

    private formatQueueItem(item: IMusicQueueItem): string {
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
        if (queue == undefined || queue.items.length == 0 || queue.current == undefined) {
            let m = "очередь треков пуста";
            if (queue == undefined) {
                await msg.reply(m);
                return;
            }

            if (queue.current) {
                m += ". Сейчас играет: " + this.formatQueueItem(queue.current);
            }

            await msg.reply(m);
            return;
        }

        
        let qEmbed = new RichEmbed();
        qEmbed.setColor(colors.AQUA);
        qEmbed.setTitle("**Очередь треков**");
        
        let currentFormat = this.formatQueueItem(queue.current);
        qEmbed.addField("Сейчас играет", currentFormat);

        let allFormat = "";
        for (let i in queue.items) {
            allFormat += this.formatQueueItem(queue.items[i]) + "\n";
        }

        try {
            qEmbed.addField("В очереди", allFormat);
        }
        catch (err) {
            if (err instanceof RangeError) {
                await msg.reply(`Сейчас играет: ${currentFormat}\nВ очереди:\n${allFormat}`);
                return;
            }
            else {
                throw new Error(err.message);
            }
        }

        await msg.reply(qEmbed);
    }
}