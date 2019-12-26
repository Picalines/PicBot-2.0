import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { Message, RichEmbed, Guild, VoiceChannel, GuildMember } from "discord.js";
import { colors, timestamp, emojis } from "../utils";
import { setInterval } from "timers";
import { Readable } from "stream";
import ytdl from "ytdl-core";

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
    private playing: { [serverId: string]: IQueueItem } = {};
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
            delete this.playing[channel.guild.id];
            channel.connection?.disconnect();
            clearInterval(this.timeOuts[channel.guild.id]);
        }
        else if (channel.members.size == 1) {
            delete this.queues[channel.guild.id];
            delete this.playing[channel.guild.id];
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

        
        let info: ytdl.videoInfo;
        try {
            info = await ytdl.getBasicInfo(link);
        }
        catch (err) {
            throw new Error("Не удалось получить информацию о треке");
        }
        
        if (this.queues[msg.guild.id] == undefined) {
            this.queues[msg.guild.id] = [];
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
            delete this.playing[serverId];
            return;
        }

        this.playing[serverId] = current;

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

        await current.msg.channel.send(embed);

        const dispatcher = channel.connection.playStream(playable);
        dispatcher.on("end", reason => {
            if (reason == "stopCommand") {
                queue.length = 0;
            }
            this.play(channel.guild.channels.find(ch => ch.id == channel.id) as VoiceChannel);
        });
    }

    getQueue(guild: Guild | Message): IQueueItem[] | undefined {
        if (guild instanceof Message) {
            guild = guild.guild;
        }
        return this.queues[guild.id];
    }

    getCurrent(guild: Guild | Message): IQueueItem | undefined {
        if (guild instanceof Message) {
            guild = guild.guild;
        }
        return this.playing[guild.id];
    }
}


function checkAvailable(msg: Message): PlayCommand {
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
    return playCommand;
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
        const playCommand = checkAvailable(msg);

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


export class SkipCommand extends Command {
    info: CommandInfo = {
        name: "skip",
        description: "бот пропускает текущий трек",
        permission: "everyone",
        group: "Музыка"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const playCommand = checkAvailable(msg);

        let current = playCommand.getCurrent(msg);
        if (!current) {
            throw new Error("Бот не играет музыку");
        }

        if (current.msg.author == msg.author) {
            msg.member.voiceChannel.connection.dispatcher.end("skipCommand")
            await msg.reply("трек успешно пропущен");
        }
        else {
            await msg.reply("я не пропустил трек, так его предложил другой участник сервера");
        }
    }
}


export class StopCommand extends Command {
    info: CommandInfo = {
        name: "stop",
        description: "бот останавливает текущий трек, если за это проголосует половина человек, сидящих в голосовом канале",
        permission: "everyone",
        group: "Музыка"
    };

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        checkAvailable(msg);
        
        let voiceChannel = msg.member.voiceChannel;
        
        async function stop() {
            voiceChannel.connection.dispatcher.end("stopCommand");
            await msg.reply("музыка (*надеюсь*) успешно остановлена");
        }
        
        if (voiceChannel.members.size == 2) {
            await stop();
            return;
        }
        
        await msg.react(emojis.thumbsup);

        const filter = (r: any, u: any) => r.emoji == emojis.thumbsup && u != msg.author;
        const collected = await msg.awaitReactions(filter, { time: 10000 });

        if (collected.size + 1 >= voiceChannel.members.size / 2) {
            await stop();
        }
        else {
            await msg.reply("недостаточно голосов :/");
        }
    }
}