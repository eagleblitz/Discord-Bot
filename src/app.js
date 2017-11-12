const Discord = require('discord.js');
const client = new Discord.Client();
client.mode = 'development';
client.musicPlayers = new Discord.Collection();

const config = require('../config.json');
const tokens = require('../tokens.json');

const utils = require('./utils');
const Arguments = require('./types/arguments');
const MusicPlayer = require('./types/musicplayer');

const mongoose = require('mongoose');
let Guilds = require('./models/guild');

mongoose.connect('mongodb://localhost/creative-logic', {useMongoClient: true });
let db = mongoose.connection;

db.on('error', (err) => {
    console.log(err);
})


client.on('ready', async () => {

    for (let guild of client.guilds.array()) {
        client.musicPlayers.set(guild.id, new MusicPlayer(guild));
    }

    const guilds = new Discord.Collection();

    Guilds.find((err, res) => {

        for (const guild of client.guilds.array()) {
            if (res.find((guildData) => { return guildData.id == guild.id; }) == null) {
                Guilds.create({id: guild.id, prefix: ';'});
            }
        }
    })

    for(let channel of client.channels.array()) {
        if (channel && channel.type === 'text') {
            channel.messages.fetch();
        }
    }
   
    if (client.mode === 'normal') {
        return;
    }

    let testChannel = client.channels.get(config.channels.testing);
    if (testChannel) {
        testChannel.send('I\'m alive again');
    }
});

client.on('message', async (message) => {
    if (utils.shouldCheckMessage(message)) {
        return;
    }
    
    Guilds.findOne({id: message.guild.id}, (err, guild) => {

        if (message.content.startsWith(guild ? guild.prefix: config.prefix)) {
            const args = message.content.slice(config.prefix.length).split(' ');
            const name = args.shift().toLowerCase();
            
            let command = utils.getCommands().get(name);
            if (command) {
    
                const argsObj = new Arguments();
    
                for (const arg of args) {
                    argsObj.push(arg);
                }
    
                argsObj.musicPlayer = client.musicPlayers.get(message.guild.id);
    
                command.execute(message, argsObj).then((result) => {
                    if (result) {
                        utils.auditMessage(message.member, `Used \`${config.prefix + command.name} ${argsObj.toString()}\` in ${message.channel.toString()}`);
                    }
                });
            }
            return;
        }

    });

    for(let word of config.blacklist) {
        if (message.content.contains(word)) {
            utils.auditMessage(message.member, 
            `Mentioned a blacklisted word! \nThey said, "${message.content}" in ${message.channel.toString()}`, true);

            return;
        }
    }

});

client.on('messageDelete', async (message) => {
    if (client.mode === 'development') {
        return;
    }

    if (message.content === '') {
        return;
    }
    utils.auditMessage(message.member, `Removed "${message.content}" from ${message.channel.toString()}`);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (client.mode === 'development') {
        return;
    }

    if (oldMessage.author.bot || (oldMessage.content === '' && newMessage.content === '') || oldMessage.content === newMessage.content) {
        return;
    }
    utils.auditMessage(message.member, `Changed "${oldMessage.content}" to "${newMessage.content}" in ${newMessage.channel.toString()}`);
});

client.on('guildMemberAdd', async (member) => {
    if (client.mode === 'development') {
        return;
    }

    Guilds.findOne({id: member.guild.id}, (err, guild) => {

        if (!guild || !guild.channels || !guild.channels.welcome) return;

        let welcomeChannel = member.guild.channels.get(guild.channels.welcome);

        if (guild.channels.rules) {
            let ruleChannel = member.guild.channels.get(guild.channels.rules);
            
            if (welcomeChannel && ruleChannel) {
                welcomeChannel.send(`Welcome ${member.toString()} to ${member.guild.name}! Please read the ${ruleChannel.toString()} before moving to the community channels.`);
                
                return;
            }
        }

        if (welcomeChannel) {
            welcomeChannel.send(`Welcome ${member.toString()} to ${member.guild.name}!`);
        }
    
    });

});

client.on('guildMemberRemove', async (member) => {
    if (client.mode === 'development')
    {
        return;
    }
    utils.auditMessage(member, `Left...\nFuck them anyway`);
});

client.on('messageReactionAdd', async (messageReaction, user) => {

    let musicPlayer = client.musicPlayers.get(messageReaction.message.guild.id);

    if (!musicPlayer.voiceConnection || messageReaction.emoji.name != 'upvote') {
        return;
    }

    let memberCount = client.channels.get(musicPlayer.voiceConnection.channel.id).members.array().length;

    if (messageReaction.message.id === musicPlayer.skipMessage.id) {

        if (user.id === musicPlayer.skipMessage.requestor.id) {
            messageReaction.remove();
        }

        if (messageReaction.count > (memberCount - 1) / 2) {
            let embed = utils.getEmbed();

            embed.setTitle(`Skipped ${musicPlayer.get().title}`)
            embed.setDescription(musicPlayer.get().url);
            embed.setImage(musicPlayer.get().thumbnail);

            messageReaction.message.channel.send({embed});
            messageReaction.message.delete();
            musicPlayer.skip();
        }
    }
});

client.on('voiceStateUpdate', async (oldMember, newMember) => {
    if (!client.musicPlayers.get(oldMember.guild.id).voiceConnection) {
        return;
    }

    let memberCount = client.channels.get(client.musicPlayers.get(oldMember.guild.id).voiceConnection.channel.id).members.array().length;

    if (memberCount == 1) {
        client.musicPlayers.get(oldMember.guild.id).clear();
    }
});

client.on('guildCreate', async (guild) => {

    Guilds.findOne({id: guild.id}, (err, guildData) => {
        if (!guildData) {
            Guilds.create({id: guild.id});
        }
    })

});

process.argv.forEach((val, index, array) => {
    if (val.startsWith('-')) {
        let command = val.substr(1);

        switch (command) {
            case 'normal': {
                client.mode = command;
            }
        }
    }
});

client.login(client.mode === 'development' ? tokens.dev : tokens.normal);