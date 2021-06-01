console.log("Compiling...");
let Discord = require('discord.js');
let bot = new Discord.Client();
let setPath = "./settings.json";
let settings = require(setPath);
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
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
    await ytdl.getBasicInfo(word.toString()).then(function(value) {
        names.push(value.player_response.videoDetails.title + " by " + value.player_response.videoDetails.author);
        videos.push(ytdl(word, {quality: "highestaudio", highWatermark: 1 << 30}));
        msgChannel.send("\`Added " + value.player_response.videoDetails.title + " by " + value.player_response.videoDetails.author + "\`");
    }).catch(() => function(err) {
        console.log(err);
    });
    if(!paused && !playing) {
        await broadcast(author).then().catch(() => function(err) {
            console.log(err);
        });
    } else if(paused) {
        dispatcherOut.resume();
        paused = false;
    }

}
async function playSearch(word, msgChannel, author) {
    await ytsr(word.toString(), limit=1).then(function(value) {
        console.log(value);
        playLink(value.items[0].url.toString(), msgChannel, author).then().catch(() => function(err) {
            console.log(err);
        });
    });
}

async function broadcast(author) {
    await author.voice.channel.join().then(connection => {
        let dispatcher = connection.play(videos[0]);
        dispatcherOut = dispatcher;
        connectionOut = connection;
        playing = true;
        videos[0].on("error", () => {
            console.log("Error detected (video)")
        })
        dispatcher.on("error", () => {
            console.log("Error detected (dispatcher)");
        })
        dispatcher.on("finish", () => {
            videos.shift();
            names.shift();
            if(videos.length > 0) {
                broadcast(author);
            } else {
                connection.disconnect();
            }
        })
    }).catch(() => function(err) {
        console.log(err);
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
    return "\`!channel |channel| to change which channel the bot will respond to commands in\`\n" +
        "\`!play |link or search| to add a youtube video to the queue\`\n" +
        "\`!pause to pause the music\`\n" +
        "\`!resume to resume the music\`\n" +
        "\`!queue to view the queue\`\n" +
        "\`!remove |number| to remove the song in the queue next to the number\`\n" +
        "\`!skip to skip to the next song\`\n" +
        "\`!stop to stop the music and empty the queue\`";
}

function check(msg) {
    if(msg.member.voice.channel == null) {
        msg.channel.send("Join a voice channel before giving commands!")
        return true;
    } else {
        return false;
    }
}

bot.on("message", msg => {
    let prefix = settings.prefix;
    if(msg.author.bot) {return;}
    if(msg.channel.name.toLowerCase() !== announcement) {return;}
    if(msg.content.startsWith(prefix + "channel ")) {
        if(check(msg)) {
            return;
        }
        let word = msg.content.substring(msg.content.indexOf(" ")+1, msg.content.length);
        changeChannel(word);
    }
    if(msg.content.startsWith(prefix + "play ")) {
        if(check(msg)) {
            return;
        }
        let word = msg.content.substring(msg.content.indexOf(" ")+1, msg.content.length);
        if(msg.content.includes("watch?v=")) {
            playLink(word, msg.channel, msg.member).then().catch(() => function(err) {
                console.log(err);
            });
        } else {
            playSearch(word, msg.channel, msg.member).then().catch(() => function(err) {
                console.log(err);
            });
        }
    }
    if(msg.content.startsWith(prefix + "pause")) {
        if(check(msg)) {
            return;
        }
        msg.channel.send(pause()).then().catch(() => function(err) {
            console.log(err);
        });
    }
    if(msg.content.startsWith(prefix + "queue")) {
        if(check(msg)) {
            return;
        }
        msg.channel.send(queue()).then().catch(() => function(err) {
            console.log(err);
        });
    }
    if(msg.content.startsWith(prefix + "remove ")) {
        if(check(msg)) {
            return;
        }
        let index = msg.content.substring(msg.content.indexOf(" ")+1, msg.content.length);
        msg.channel.send(remove(parseInt(index))).then().catch(() => function(err) {
            console.log(err);
        });
    }
    if(msg.content.startsWith(prefix + "stop")) {
        if(check(msg)) {
            return;
        }
        videos = [];
        names = [];
        playing = false;
        paused = false;
        connectionOut.disconnect();
        msg.channel.send("\`Stopped\`").then().catch(() => function(err) {
            console.log(err);
        });
    }
    if(msg.content.startsWith(prefix + "skip")) {
        if(check(msg)) {
            return;
        }
        msg.channel.send("\`Skipped " + names[0] + "\`").then().catch(() => function(err) {
            console.log(err);
        });
        videos.shift();
        names.shift();
        if(videos.length > 0) {
            broadcast(msg.member).then().catch(() => function(err) {
                console.log(err);
            });
        } else {
            connectionOut.disconnect();
            playing = false;
        }
    }
    if(msg.content.startsWith(prefix + "resume")) {
        if(check(msg)) {
            return;
        }
        msg.channel.send(resume()).then().catch(() => function(err) {
            console.log(err);
        });
    }
    if(msg.content.startsWith(prefix + "help")) {
        if(check(msg)) {
            return;
        }
        msg.channel.send(help()).then().catch(() => function(err) {
            console.log(err);
        });
    }
});


bot.on("ready", () => {
    console.log('I am ready!');
});
bot.login(settings.key).then().catch(() => function(err) {
    console.log(err);
});