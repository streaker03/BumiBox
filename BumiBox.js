console.log("Compiling...");
let Discord = require("discord.js");
let bot = new Discord.Client();
let setPath = "./settings.json";
let settings = require(setPath);
const ytdl = require('ytdl-core');
const ytsr = require("ytsr");
let announcement = "spam";
let videos = [];
let names = [];
let connectionOut = bot;
let paused = false;
let playing = false;
let dispatcherOut = bot;

function changeChannel(channelName){
    console.log(channelName);
    announcement = channelName;
}

async function playLink(word, msgChannel, author) {
    let data = ytdl.getBasicInfo(word.toString());
    await data.then(function(value) {
        names.push(value.player_response.videoDetails.title + " by " + value.player_response.videoDetails.author);
        videos.push(ytdl(word, {quality: "highestaudio", highWatermark: 1 << 30}));
        msgChannel.send("\`Added " + value.player_response.videoDetails.title + " by " + value.player_response.videoDetails.author + "\`");
    });
    if(!paused && !playing) {
        await broadcast(author);
    } else if(paused) {
        dispatcherOut.resume();
        paused = false;
    }

}
async function playSearch(word, msgChannel, author) {
    await ytsr(word.toString()).then(function(value) {
        names.push(value.items[0].title.toString() + " by " + value.items[0].author.name.toString());
        videos.push(ytdl(value.items[0].link.toString(), {quality: "highestaudio", highWaterMark: 1 << 30}));
        msgChannel.send("\`Added " + value.items[0].title.toString() + " by " + value.items[0].author.name.toString() + "\`");
    });
    if(!paused && !playing) {
        await broadcast(author);
    } else if(paused) {
        dispatcherOut.resume();
        paused = false;
    }
}

async function broadcast(author) {
    await author.voice.channel.join().then(connection => {
        const dispatcher = connection.play(videos[0]);
        dispatcherOut = dispatcher;
        connectionOut = connection;
        playing = true;
        dispatcher.on("finish", () => {
            videos.shift();
            names.shift();
            if(videos.length > 0) {
                broadcast(author);
            } else {
                connection.disconnect();
            }
        })
    });
}

function pause() {
    dispatcherOut.pause();
    paused = true;
    playing = false;
    return "\`Paused\`";
}

function resume() {
    dispatcherOut.resume();
    paused = false;
    playing = true;
    return "\`Resuming...\`";
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

function help() {
    return "\`!channel <channel> to change which channel the bot will respond to commands in\`\n" +
        "\`!play <link or search> to add a youtube video to the queue\`\n" +
        "\`!pause to pause the music\`\n" +
        "\`!resume to resume the music\`\n" +
        "\`!queue to view the queue\`\n" +
        "\`!remove <number> to remove the song in the queue next to the number\`\n" +
        "\`!skip to skip to the next song\`\n" +
        "\`!stop to stop the music and empty the queue\`";
}

bot.on("message", msg => {
    let prefix = settings.prefix;
    if(msg.author.bot) {return;}
    if(msg.channel.name !== announcement) {return;}
    if(msg.member.voice.channel == null) {
        msg.channel.send("Join a voice channel before giving commands!");
        return;
    }
    if(msg.content.startsWith(prefix + "channel ")) {
        let word = msg.content.substring(msg.content.indexOf(" ")+1, msg.content.length);
        changeChannel(word);
    }
    if(msg.content.startsWith(prefix + "play ")) {
        let word = msg.content.substring(msg.content.indexOf(" ")+1, msg.content.length);
        if(msg.embeds.length > 0) {
            playLink(word, msg.channel, msg.member);
        } else {
            playSearch(word, msg.channel, msg.member);
        }
    }
    if(msg.content.startsWith(prefix + "pause")) {
        msg.channel.send(pause());
    }
    if(msg.content.startsWith(prefix + "queue")) {
        msg.channel.send(queue());
    }
    if(msg.content.startsWith(prefix + "remove ")) {
        let index = msg.content.substring(msg.content.indexOf(" ")+1, msg.content.length);
        msg.channel.send(remove(parseInt(index)));
    }
    if(msg.content.startsWith(prefix + "stop")) {
        videos = [];
        names = [];
        playing = false;
        paused = false;
        connectionOut.disconnect();
        msg.channel.send("\`Stopped\`");
    }
    if(msg.content.startsWith(prefix + "skip")) {
        msg.channel.send("\`Skipped " + names[0] + "\`");
        videos.shift();
        names.shift();
        if(videos.length > 0) {
            broadcast(msg.member);
        } else {
            connectionOut.disconnect();
            playing = false;
        }
    }
    if(msg.content.startsWith(prefix + "resume")) {
        msg.channel.send(resume());
    }
    if(msg.content.startsWith(prefix + "help")) {
        msg.channel.send(help());
    }
});


bot.on("ready", () => {
    console.log('I am ready!');
});
bot.login(settings.key);