import { Command, CommandInfo, ArgumentEnumerator, findCommand } from "../command";
import { Message, RichEmbed, Guild, VoiceChannel, GuildMember } from "discord.js";
import { colors, timestamp, emojis } from "../utils";
import { setInterval } from "timers";
import { Readable } from "stream";
import { youtube } from "../main";
import ytdl from "ytdl-core";

interface IVideoInfo {
    readonly id: string;
    readonly title: string;
    readonly author: string;
    readonly duration: string;
}

interface IQueueItem {
    readonly info: IVideoInfo;
    readonly msg: Message;
}

interface IQueue {
    readonly nextItems: IQueueItem[];
    current: IQueueItem;
    saverInterval: NodeJS.Timeout;
}

const videoUrlStart = "https://www.youtube.com/watch?v=";
const maxSearchResults = 5;

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

    private clearQueue(serverId: string) {

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

        const serverId = msg.guild.id;

        const loopCommand = findCommand(c => c instanceof LoopCommand) as LoopCommand | undefined;
        if (loopCommand?.isLoop(serverId)) {
            throw new Error(`я не могу добавлять треки в очередь, пока она повторяется (\`${loopCommand.info.name}\`)`);
        }

        if (this.queues[serverId] == undefined) {
            this.queues[serverId] = [];
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

            this.queues[serverId].push({
                msg: msg,
                info: {
                    id: getVideoID(arg),
                    title: info.title,
                    author: info.author.name,
                    duration: timestamp(length)
                }
            });
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

            const infoPromises: Promise<ytdl.videoInfo>[] = videos.data.items
                .map(item => ytdl.getBasicInfo(videoUrlStart + (item.id ? item.id.videoId : "")));

            const basicInfos: ytdl.videoInfo[] = await Promise.all(infoPromises);
            const infos: IVideoInfo[] = basicInfos.map((i): IVideoInfo => ({
                id: i.video_id,
                author: i.author.name,
                duration: timestamp(Number(i.length_seconds)),
                title: i.title
            })).filter(i => i.duration != "00:00:00");

            if (infos.length == 0) {
                throw new Error("ничего не найдено");
            }

            const searchEmbed = new RichEmbed();
            searchEmbed.setColor(colors.AQUA);
            searchEmbed.setTitle(`Выберете 1 из ${infos.length} результатов поиска`);
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

            this.queues[serverId].push({
                msg: msg,
                info: choice
            });
        }

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

        let queue = this.queues[serverId];

        const loopCommand = findCommand(c => c instanceof LoopCommand) as LoopCommand | undefined;
        if (queue.length == 0 && loopCommand != undefined) {
            if (loopCommand.isLoop(serverId)) {
                this.queues[serverId] = loopCommand.getCopy(serverId);
                queue = this.queues[serverId];
            }
        }

        let current = queue ? queue.shift() : undefined;

        while (current?.info.duration == "00:00:00") {
            await current.msg.reply("твой трек пропущен, ибо каким-то магическим образом он оказался прямой трансляцией");
            current = queue ? queue.shift() : undefined;
        }

        if (!queue || !current) {
            channel.leave();
            delete this.queues[serverId];
            delete this.playing[serverId];
            loopCommand?.clearLoop(serverId);
            return;
        }

        const link = videoUrlStart + current.info.id;

        this.playing[serverId] = current;

        let playable: Readable;
        try {
            playable = ytdl(link, { "filter": "audioonly" });
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
        embed.addField("Автор - название", current.info.author + " - " + current.info.title);
        embed.addField("Продолжительность", current.info.duration);
        embed.addField("Ссылка", link);

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
        return item.info.title + ` -> ${item.info.duration}`
    }

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const playCommand = checkAvailable(msg);

        const queue = playCommand.getQueue(msg);
        if (!queue || queue.length == 0) {
            await msg.reply("очередь треков пуста");
            return;
        }

        const qEmbed = new RichEmbed();
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
            voiceChannel.connection.dispatcher.end("stopCommand");
            await msg.reply("музыка (*надеюсь*) успешно остановлена");

            const loopCommand = findCommand(c => c instanceof LoopCommand) as LoopCommand | undefined;
            loopCommand?.clearLoop(msg.guild.id);
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

    private queueCopies: { [id: string]: IQueueItem[] | undefined } = {};

    async run(msg: Message, argEnumerator: ArgumentEnumerator) {
        const playCommand = checkAvailable(msg);

        const serverId = msg.guild.id;

        if (this.isLoop(serverId)) {
            this.queueCopies[serverId] = undefined;
            await msg.reply("повторение треков прекращено");
        }
        else {
            const current = playCommand.getCurrent(msg);
            if (!current) {
                throw new Error("бот не играет музыку");
            }
            
            this.queueCopies[serverId] = [{...current}];

            const queue = playCommand.getQueue(msg);
            if (queue) {
                this.queueCopies[serverId]?.push(...queue.map(v => ({...v})));
            }

            console.log(this.queueCopies[serverId]);

            await msg.reply(`я буду повторять очередь треков, пока кто-то снова не пропишет команду \`${this.info.name}\``);
        }
    }

    isLoop(serverId: string): boolean {
        return this.queueCopies[serverId] != undefined;
    }

    getCopy(serverId: string): IQueueItem[] {
        return this.queueCopies[serverId] as IQueueItem[];
    }

    clearLoop(serverId: string) {
        this.queueCopies[serverId] = undefined;
    }
}