import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { Message, RichEmbed, Guild, VoiceChannel, GuildMember } from "discord.js";
import { colors, timestamp, emojis } from "../utils";
import { setInterval } from "timers";
import { Readable } from "stream";
import { youtube } from "../main";
import ytdl from "ytdl-core";
import { youtube_v3 } from "googleapis";

// google api is awsome
interface IDWrapper {
    id?: youtube_v3.Schema$ResourceId | string | null;
}

interface VideoInfo {
    readonly id: string;
    readonly title: string;
    readonly author: string;
    readonly duration: string;
}

interface QueueItem {
    readonly info: VideoInfo;
    readonly msg: Message;
}

interface Queue {
    nextItems: QueueItem[];
    current?: QueueItem;
    saverInterval?: NodeJS.Timeout;
}

const videoUrlStart = "https://www.youtube.com/watch?v=";
const playlistUrlStart = "https://www.youtube.com/playlist?list=";

const maxSearchResults = 5;
const maxPlaylistItems = 25;

/* https://gist.github.com/takien/4077195 */
function getVideoID(url: string): string {
    let s = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return undefined !== s[2] ? s[2].split(/[^0-9a-z_\-]/i)[0] : s[0];
}

export class PlayCommand extends Command {
    info: CommandInfo = {
        name: "play",
        syntax: [["word", "link|search"]],
        description: "бот начинает играть / добавляет в очередь трек по ссылке / поисковому запросу",
        permission: "everyone",
        group: "Музыка"
    };

    private queues: { [serverId: string]: Queue } = {};

    private invalidLinkMsg = "ожидалась youtube ссылка на трек";

    // discord bugs
    private connectedTo(channel: VoiceChannel, me?: GuildMember): boolean {
        const me1 = me ?? channel.guild.me;
        return channel.members.find(m => m.id == me1.id) != undefined;
    }

    private clearQueue(serverId: string) {
        let saverInterval = this.queues[serverId]?.saverInterval;
        if (saverInterval) {
            clearInterval(saverInterval);
        }
        delete this.queues[serverId];
    }

    private checkChannel(channel: VoiceChannel) {
        if (!this.connectedTo(channel)) {
            this.clearQueue(channel.guild.id);
            channel.connection?.disconnect();
        }
        else if (channel.members.size == 1) {
            this.clearQueue(channel.guild.id);
            channel.leave();
        }
    }

    private getVideoUrl(video: IDWrapper) {
        return videoUrlStart + (video.id ? typeof video.id == "string" ? video.id : video.id.videoId : "");
    }

    private async getVideoInfos(items: IDWrapper[]): Promise<VideoInfo[]> {
        const infoPromises: Promise<ytdl.videoInfo>[] = items.filter(item => item.id).map(item => ytdl.getBasicInfo( this.getVideoUrl(item) ));

        const basicInfos: ytdl.videoInfo[] = await Promise.all(infoPromises);

        return basicInfos.filter(i => Number(i.length_seconds) > 0).map((i): VideoInfo => ({
            id: i.video_id,
            author: i.author.name,
            duration: timestamp(Number(i.length_seconds)),
            title: i.title
        }));
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        if (!msg.member.voiceChannel) {
            throw new Error("эту команду можно использовать только в голосовом канале");
        }
        if (!msg.member.voiceChannel.joinable) {
            throw new Error("я не могу подключиться к этому голосовому каналу");
        }

        const serverId = msg.guild.id;

        const loopCommand = findCommand(c => c instanceof LoopCommand) as LoopCommand | undefined;
        if (loopCommand?.isLoop(serverId)) {
            throw new Error(`я не могу добавлять треки в очередь, пока она повторяется (\`${loopCommand.info.name}\`)`);
        }

        if (this.queues[serverId] == undefined) {
            this.queues[serverId] = {
                nextItems: []
            };
        }

        let arg = this.readText(argEnumerator);
        if (arg == "") {
            throw new Error(this.invalidLinkMsg);
        }

        if (ytdl.validateURL(arg)) {
            let info: ytdl.videoInfo;
            try {
                info = await ytdl.getBasicInfo(arg);
            }
            catch (err) {
                throw new Error("Не удалось получить информацию о треке");
            }

            const length = Number(info.length_seconds);
            if (isNaN(length) || length == 0) {
                throw new Error("Я не могу (*или не хочу*) играть этот трек");
            }

            this.queues[serverId].nextItems.push({
                msg,
                info: {
                    id: getVideoID(arg),
                    title: info.title,
                    author: info.author.name,
                    duration: timestamp(length)
                }
            });

            await msg.reply("трек добавлен в очередь");
        }
        else if (arg.startsWith(playlistUrlStart) && arg.length > playlistUrlStart.length) {
            const playlistId = arg.slice(playlistUrlStart.length);

            const videos = await youtube.playlistItems.list({
                playlistId,
                part: "snippet",
                fields: "items(snippet/resourceId/videoId)",
                maxResults: maxPlaylistItems
            });

            if (!videos.data.items || videos.data.items.length == 0) {
                throw new Error("ничего не найдено");
            }

            const infos = await this.getVideoInfos(videos.data.items.map((i): IDWrapper => ({
                id: i.snippet?.resourceId?.videoId
            })));
            
            if (infos.length == 0) {
                throw new Error("ничего не найдено");
            }

            this.queues[serverId].nextItems.push(...infos.map((info): QueueItem => ({ msg, info })));

            let m = `${infos.length} треков из плейлиста добавлено в очередь`;

            if (infos.length == maxPlaylistItems) {
                m += " (это мой максимум по кол-ву треков из плейлиста!)"
            }

            await msg.reply(m);
        }
        else {
            const videos = await youtube.search.list({
                maxResults: maxSearchResults,
                type: "video",
                part: "id",
                q: arg,
            });

            if (!videos.data.items || videos.data.items.length == 0) {
                throw new Error("ничего не найдено");
            }

            const infos = await this.getVideoInfos(videos.data.items);
            if (infos.length == 0) {
                throw new Error("ничего не найдено");
            }
            
            const searchEmbed = new RichEmbed()
                .setColor(colors.AQUA)
                .setTitle(`Выберете 1 из ${infos.length} результатов поиска`);
            
            infos.forEach((i, index) => searchEmbed
                .addField(`[${index + 1}] ${i.title}`, `Автор: ${i.author}\nПродолжительность: ${i.duration}`));

            await msg.channel.send(searchEmbed);

            const filter = (m: Message) => m.author == msg.author && !isNaN(Number(m.content));
            const collected = await msg.channel.awaitMessages(filter, { time: 15000, maxMatches: 1 });
            if (collected.size == 0) {
                throw new Error("Трек не выбран. Ну и ладно...");
            }

            const choiceIndex = Number(collected.first().content) - 1;
            if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= infos.length) {
                throw new Error("Странный номер трека...");
            }

            const choice = infos[choiceIndex];

            this.queues[serverId].nextItems.push({
                msg: msg,
                info: choice
            });

            await msg.reply("трек добавлен в очередь");
        }

        if (!this.connectedTo(msg.member.voiceChannel)) {
            let connection = await msg.member.voiceChannel.join();

            this.queues[msg.member.guild.id].saverInterval = setInterval(() => {
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

        if (!this.queues[serverId]) {
            this.queues[serverId] = { nextItems: [] };
        }

        let queue = this.queues[serverId].nextItems;

        let looped = false;
        const loopCommand = findCommand(c => c instanceof LoopCommand) as LoopCommand | undefined;
        if (queue.length == 0 && loopCommand != undefined) {
            if (loopCommand.isLoop(serverId)) {
                this.queues[serverId].nextItems = loopCommand.getCopy(serverId);
                queue = this.queues[serverId].nextItems;
                looped = true;
            }
        }

        let current = queue ? queue.shift() : undefined;

        while (current?.info.duration == "00:00:00") {
            await current.msg.reply("твой трек пропущен, ибо каким-то магическим образом он оказался прямой трансляцией");
            current = queue ? queue.shift() : undefined;
        }

        if (!queue || !current) {
            this.clearQueue(serverId);
            loopCommand?.clearLoop(serverId);
            channel.leave();
            return;
        }

        if (looped && queue.length > 0) {
            await current.msg.channel.send("очередь треков восстала из мёртвых!");
        }
        
        this.queues[serverId].current = current;
        const link = videoUrlStart + current.info.id;

        let playable: Readable;
        try {
            playable = ytdl(link, { "filter": "audioonly" });
        }
        catch (err) {
            await current.msg.channel.send(`не удалось загрузить трек '${current.info.title}'`);
            this.play(channel);
            return;
        }

        const embed = new RichEmbed()
            .setColor(colors.RED)
            .setTitle("**Играет следующий трек из очереди!**")
            .setFooter(`Предложил(а) ${current.msg.member.displayName}`, current.msg.author.avatarURL)
            .addField("Автор - название", current.info.author + " -> " + current.info.title)
            .addField("Продолжительность", current.info.duration)
            .addField("Ссылка", link);

        await current.msg.channel.send(embed);

        const dispatcher = channel.connection.playStream(playable);
        dispatcher.on("end", reason => {
            if (reason == "stopCommand") {
                queue.length = 0;
            }
            this.play(channel.guild.channels.find(ch => ch.id == channel.id) as VoiceChannel);
        });
    }

    getQueue(guild: Guild | Message): Queue | undefined {
        if (guild instanceof Message) {
            guild = guild.guild;
        }
        return this.queues[guild.id];
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

    private formatQueueItem(item: QueueItem): string {
        return `${item.info.author} -> ${item.info.title} (${item.info.duration})`
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const playCommand = checkAvailable(msg);

        const queue = playCommand.getQueue(msg)?.nextItems;
        if (!queue || queue.length == 0) {
            await msg.reply("очередь треков пуста");
            return;
        }

        const qEmbed = new RichEmbed()
            .setColor(colors.AQUA)
            .setTitle("**Дальше будут играть**");

        const allFormat = queue.reduce((acc, item) => acc + this.formatQueueItem(item) + "\n", "");

        try {
            qEmbed.setDescription(allFormat);
        }
        catch (err) {
            if (err instanceof RangeError) {
                await msg.reply(`очередь треков:\n${allFormat}`);
                return;
            }
            throw err;
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

        let current = playCommand.getQueue(msg)?.current;
        if (!current) {
            throw new Error("Бот не играет музыку");
        }

        if (current.msg.author == msg.author || msg.member.permissions.has('ADMINISTRATOR')) {
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
            const loopCommand = findCommand(c => c instanceof LoopCommand) as LoopCommand | undefined;
            loopCommand?.clearLoop(msg.guild.id);

            voiceChannel.connection.dispatcher.end("stopCommand");
            await msg.reply("музыка (*надеюсь*) успешно остановлена");
        }

        if (msg.member.permissions.has('ADMINISTRATOR') || voiceChannel.members.size == 2) {
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

export class LoopCommand extends Command {
    info: CommandInfo = {
        name: "loop",
        description: "бот будет повторять текущую очередь треков, пока кто-то не пропишет эту команду снова",
        permission: "everyone",
        group: "Музыка"
    };

    private queueCopies: { [id: string]: QueueItem[] } = {};

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const playCommand = checkAvailable(msg);

        const serverId = msg.guild.id;

        if (this.isLoop(serverId)) {
            delete this.queueCopies[serverId];
            await msg.reply("повторение треков прекращено");
        }
        else {
            const queue = playCommand.getQueue(msg);

            if (!queue || !queue.current) {
                throw new Error("бот не играет музыку");
            }
            
            this.queueCopies[serverId] = [{...queue.current}];

            if (queue) {
                this.queueCopies[serverId]?.push(...queue.nextItems.map(v => ({...v})));
            }

            await msg.reply(`я буду повторять очередь треков, пока кто-то снова не пропишет команду \`${this.info.name}\``);
        }
    }

    isLoop(serverId: string): boolean {
        return this.queueCopies[serverId] != undefined;
    }

    getCopy(serverId: string): QueueItem[] {
        return this.queueCopies[serverId];
    }

    clearLoop(serverId: string) {
        delete this.queueCopies[serverId];
    }
}