console.log("Compiling...");
let Discord = require("discord.js");
let bot = new Discord.Client();
let setPath = "./settings.json";
let settings = require(setPath);
const fs = require('fs');
const ytdl = require('ytdl-core');
const ytsr = require("ytsr");
let announcement = "general";
let videos = [];
let names = [];
let connection = bot;
let paused = false;
let playing = false;

function changeChannel(channelName){
    announcement = channelName;
}

let options = {
    limit: 1
};

async function playLink(word, msgChannel) {
    let data = ytdl.getBasicInfo(word);
    await data.then(function(value) {
        names.push(value.player_response.videoDetails.title + " by " + value.player_response.videoDetails.author);
        videos.push(ytdl(word, {quality: "highestaudio", highWatermark: 1 << 30}));
        msgChannel.send("\`Added " + value.player_response.videoDetails.title + " by " + value.player_response.videoDetails.author + "\`");
    });
    if(!paused) {
        broadcast();
    } else {
        connection.resume();
        paused = false;
    }

}
async function playSearch(word, msgChannel) {
    let data = ytsr(word, options);
    await data.then(function(value) {
        names.push(value.items[0].title.toString() + " by " + value.items[0].author.name.toString());
        videos.push(ytdl(value.items[0].link.toString(), {quality: "highestaudio", highWaterMark: 1 << 30}));
        msgChannel.send("\`Added " + value.items[0].title.toString() + " by " + value.items[0].author.name.toString() + "\`");
    });
    if(!paused) {
        broadcast();
    } else {
        connection.resume();
        paused = false;
    }
}

function broadcast() {
    if(videos.length > 0 && !playing) {
        connection.play(videos[0]);
        playing = true;
    }
}

async function join(author) {
    connection = await author.voice.channel.join();
}

function pause() {
    connection.then(sound => {
        connection.pause();
    });
    paused = true;
    playing = false;
}

function resume() {
    connection.resume();
    paused = false;
    playing = true;
}

function queue() {
    let result = "";
    for(let i = 0; i < names.length; i++) {
        result += "\`" + (i+1) + ". " + names[i] + "\`\n\n";
    }
    return result;
}

function remove(index) {
    let result = "\`" + names[index-1] + " has been removed\`";
    videos.splice(index-1);
    names.splice(index-1);
    return result;

}

bot.on("message", msg => {
    let prefix = settings.prefix;
    if(msg.author.bot) {return;}
    if(msg.channel.name !== announcement) {return;}
    if(msg.content.startsWith(prefix + "channel ")) {
        let word = msg.content.substring(msg.content.indexOf(" "), msg.content.length);
        changeChannel(word)
    }
    if(msg.content.startsWith(prefix + "play ")) {
        let word = msg.content.substring(msg.content.indexOf(" "), msg.content.length);
        if(msg.embeds.length > 0) {
            playLink(word, msg.channel);
        } else {
            playSearch(word, msg.channel);
        }
    }
    if(msg.content.startsWith(prefix + "join")) {
        join(msg.member);
    }
    if(msg.content.startsWith(prefix + "pause")) {
        pause();
    }
    if(msg.content.startsWith(prefix + "queue")) {
        msg.channel.send(queue());
    }
    if(msg.content.startsWith(prefix + "remove ")) {
        let index = msg.content.substring(msg.content.indexOf(" "), msg.content.length);
        msg.channel.send(remove(parseInt(index)));
    }
    if(msg.content.startsWith(prefix + "stop")) {
        videos = [];
        names = [];
        connection.disconnect();
    }
    if(msg.content.startsWith(prefix + "skip")) {
        msg.channel.send("\`Skipped " + names[0] + "\`");
        videos.shift();
        names.shift();
        if(videos.length > 0) {
            connection.play(videos[0]);
        } else {
            playing = false;
        }
    }
    if(msg.content.startsWith(prefix + "resume")) {
        resume();
    }
});


bot.on("ready", () => {
    console.log('I am ready!');
});
bot.login(settings.key);