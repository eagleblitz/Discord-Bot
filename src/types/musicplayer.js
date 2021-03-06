const Discord = require('discord.js');
const ytdl = require('ytdl-core');

const utils = require('../utils');
const config = require('../../config.json');

const GuildMember = Discord.GuildMember;
const Guild = Discord.Guild;
const Dispatcher = Discord.StreamDispatcher;
const VoiceConnection = Discord.VoiceConnection;
const Message = Discord.Message;
const TextChannel = Discord.TextChannel;

class MusicPlayer {
    /**
     * 
     * @param {Guild} guild 
     */
    constructor(guild) {
        /**
         * @type {MusicData[]}
         */
        this.queue = [];
        /**
         * @type {MusicData[]}
         */
        this.searchResults = null;
        /**
         * @type {VoiceConnection}
         */
        this.voiceConnection = null;
        /**
         * @type {Message}
         */
        this.skipMessage = null;
        /**
         * @type {Dispatcher}
         */
        this.dispatcher = null,
        /**
         * @type {String}
         */
        this.textChannel = '';
        /**
         * @type {Guild}
         */
        this.guild = guild;
    }
    /**
     * Adds song to queue
     * @param {MusicData} musicData
     */
    add(musicData) {
        this.queue.push(musicData);
    
        if (this.queue.length == 1) {
            this.play(this.queue[0]);
        }
    }
    /**
     * Clears queue
     */
    clear() {
        if (this.dispatcher) {
            this.dispatcher.end();
        }
    }
    /**
     * Gets song at top of queue
     * @returns {MusicData}
     */
    get() {
        return this.queue[0];
    }
    /**
     * Used to skip current playing song
     */
    skip() {
        if (this.dispatcher) {
            this.dispatcher.end();
        }
    }
    /**
     * This plays music based on music data sent in
     * @param {MusicData} musicData
     */
    play(musicData) {
        if (!this.voiceConnection || !musicData) {
            return;
        }
        
        if (this.voiceConnection == null) { 
            return;
        }
    
        if (ytdl.validateURL(musicData.url)) {
            if (this.guild) {
                /**
                 * @type {TextChannel}
                 */
                const channel = this.guild.channels.get(this.textChannel);
                
                if (channel) {
                    let embed = new Discord.MessageEmbed();
                    embed.setColor(0x8754ff);
                    embed.setTimestamp();
                    embed.setFooter("love, your friendly bot");
                    embed.setTitle('Now Playing');
                    embed.setImage(musicData.thumbnail);
                    embed.setDescription(`[${musicData.title}](${musicData.url})\nRequested by ${musicData.requestor.toString()}`);
                    channel.send({embed});
                }
            }

            const stream = ytdl(musicData.url, { filter: 'audioonly' });
            this.dispatcher = this.voiceConnection.playStream(stream);
            this.dispatcher.on('end', () => {                    
                this.dispatcher = null;
    
                this.queue.shift();
                if (this.get()) {
                    this.play(this.get());          
                }
                else {
                    this.voiceConnection.channel.leave();
                    this.voiceConnection = null;
                    this.searchResults = null;
                    this.skipMessage = null;
                }
            });
        }
    }
    /**
     * Stops bot completely
     */
    stop() {
        if (this.dispatcher) {
            this.dispatcher.end();
        }
    }
    /**
     * @returns {Boolean}
     */
    is_playing() {
        return this.dispatcher != null;
    }

}

class MusicData {
    constructor() {
        /**
         * @type {String}
         */
        this.url = '';
        
        /**
         * @type {String}
         */
        this.title = '';
        
        /**
         * @type {String}
         */
        this.thumbnail = '';
        
        /**
         * @type {String}
         */
        this.videoId = '';
        
        /**
         * @type {GuildMember}
         */
        this.requestor = '';
    }
}

module.exports = MusicPlayer;
