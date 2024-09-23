const {Client, GatewayIntentBits, Role, roleMention, Guild, GuildChannel, channelLink, GuildExplicitContentFilter, range} = require('discord.js')
require('dotenv/config');

const { EmbedBuilder } = require('discord.js');
const T = require("tesseract.js");
const cron = require("node-cron");
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client( {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
})

GLOBAL_DATE = new Date();
sheet = 'Sheet9';

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {google} = require('googleapis');

const SERVICE_ACCOUNT_KEY_FILE = 'serviceAccount.json'; 

async function loadCredentials() {
    const content = await fs.readFile(SERVICE_ACCOUNT_KEY_FILE, 'utf-8');
    return JSON.parse(content);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
 async function authorize() {
    // Load service account credentials from file
    const credentials = await loadCredentials(); 
    // Create an authenticated GoogleAuth client using service account
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']    
    });
    // Get the client that is authorized to make requests
    const client = await auth.getClient();
    // Return the authorized client
    return client;
}
async function keys(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    let range = sheet + "!1:1";
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
        range: range,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return;
    }
    //console.log(rows);
    return rows;
}

async function getColumn(auth, column) {
    const sheets = google.sheets({version: 'v4', auth});
    
    let columnLetter; 
    //console.log(column);
    if(column >= 26) {
        const firstLetter = String.fromCharCode(64 + (column / 26));
        const secondLetter = String.fromCharCode(64 + (column % 26));
        
        columnLetter = firstLetter + secondLetter;
    }
    else {
        columnLetter = String.fromCharCode(65 + column);
    }
    //console.log(columnLetter);
    let range = sheet + "!" + columnLetter + ":" + columnLetter;

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
        range: range,
    });
    const cols = res.data.values;
    if (!cols || cols.length === 0) {
        console.log('No data found.');
        return;
    }
    //console.log(cols);
    return cols;
}

async function getRow(auth, row) {
    const sheets = google.sheets({version: 'v4', auth});
    
    let range = sheet + "!" + row + ":" + row;

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
        range: range,
    });
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return;
    }
    return rows;
}

async function sheetsReturner(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    return sheets;
}

async function leaderboard() {
    let headers = await authorize().then(keys); // Gets the keys of the spreadsheet
    let nameIndex = await searchData(headers[0], "Name"); // Finds index of name in spreadsheet
    let winIndex = await searchData(headers[0], "Wins"); // Finds index of wins in spreadsheet 

    // Gets the column data for "Name" and "Wins", must be +1ed because it is 1 indexed
    let nameCol = await authorize().then(auth => {return getColumn(auth, nameIndex)});
    let winsCol = await authorize().then(auth => {return getColumn(auth, winIndex)});

    const names = nameCol.flat().slice(1);
    const wins = winsCol.flat().slice(1);

    const scores = names.map((name, index) => ({ name, wins: parseFloat(wins[index], 10) }));
    console.log(scores);
    const result = scores
    .filter(score => score.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .map(score => `${score.name}: ${score.wins}`)
    .join('\n');
    const formattedResult = `SCORES(8/24):\n\n${result}`;
    return formattedResult;
}

async function leaderboardToday() {
    let headers = await authorize().then(keys); // Gets the keys of the spreadsheet
    let dateIndex = await searchData(headers[0], GLOBAL_DATE); // Find index of desired date
    let dateCol = await authorize().then(auth => {return getColumn(auth, dateIndex)}); // dateIndex + 1 because 0 indexed
    let nameIndex = await(searchData(headers[0], "Name"));
    let nameCol = await authorize().then(auth => {return getColumn(auth, nameIndex)})

    let scores = "TIMES TODAY (" + GLOBAL_DATE + "):\n\n";
    if(dateCol.length === 1) {
        scores = "NOBODY HAS PLAYED YET";
        return scores;
    }

    const map = new Map();
    for(let i = 1; i < dateCol.length; i++) {
        if(dateCol[i] != "") {
            map.set(nameCol[i], dateCol[i]);
        }
    }

    let scoresArray = Array.from(map.entries());
    console.log(scoresArray);
    const flattenedArray = scoresArray.map(item => [item[0][0], parseInt(item[1][0], 10)]);
    flattenedArray.sort((a, b) => a[1] - b[1]);
    //console.log(flattenedArray);

    for(let i = 0; i < flattenedArray.length; i++) {
        scores += (i + 1);
        scores += ". ";
        for(let j = 0; j < flattenedArray[i].length; j++) {
            scores += flattenedArray[i][j];
            if(j === 0) {
                scores += ": ";
            }
        }
        scores += "\n";
    }
    console.log(scores);

    return scores;
}

async function findWinner() {
    let data = await leaderboardToday();
    const regex = /1\.\s*([A-Za-z ]+)/;
    const match = data.match(regex);

    let result;

    if (match) {
        result = match[1].trim();
        console.log(result);
    }
    else {
        result = "No match found";
        console.log(result);
        return result;
    }

    return result;
}

async function updateLeaderboard(auth, name) {
    const sheets = google.sheets({version: 'v4', auth});

    const channel = client.channels.cache.get(noSwearId);
    const guild = await client.guilds.fetch(serverId);
    const members = await guild.members.fetch();

    let nameCol = await authorize().then(auth => {return getColumn(auth, 1)}); 
    let nameIndex = await searchData(nameCol, name);
    
    if(nameIndex < 0) {
        console.log("Name not found");
        return -1;
    }

    let usernameCol = await authorize().then(auth => {return getColumn(auth, 0)});

    let winnerUsername = usernameCol[nameIndex][0];

    const member = members.find(member => member.user.username === winnerUsername);
    if(member === undefined) {
        console.log("member undefined");
        return -1;
    }

    let mention = "<@" + member.user.id + ">";
    channel.send(mention + " WON! (" + GLOBAL_DATE + ")");

    let winsCol = await authorize().then(auth => {return getColumn(auth, 2)});
    let updatedWinCount = winsCol[nameIndex][0];
    updatedWinCount++;
    nameIndex++;

    let range = sheet + "!C" + nameIndex;

    const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [[updatedWinCount]],
        },
    });

    console.log(updateResponse.status + "\n" + updateResponse.statusText);
}

async function appendData(auth, username, date, time) {
    const sheets = google.sheets({version: 'v4', auth});
    let usernameCol = await authorize().then(auth => {return getColumn(auth, 0)});
    let headers = await authorize().then(keys);
    let usernameIndex = await searchData(usernameCol, username);
    let winIndex = await searchData(headers[0], "Wins");
    let dateIndex = await searchData(headers[0], date);

    let nextUserIndex = usernameCol.length + 1;

    let dateLetter; 
    if(dateIndex >= 26) {
        const firstLetter = String.fromCharCode(64 + (dateIndex / 26));
        const secondLetter = String.fromCharCode(65 + (dateIndex % 26));
        
        dateLetter = firstLetter + secondLetter;
    }
    else {
        dateLetter = String.fromCharCode(65 + dateIndex);
    }

    if((dateIndex != -1) && (date === GLOBAL_DATE)) { // Check to see if submission has correct date
        if(usernameIndex != -1) { // Update cells 
            console.log("Valid date and username!");
            usernameIndex += 1;
            let cell = sheet + "!" + dateLetter + usernameIndex;

            const requestBody = {
                data: [
                  {
                    range: cell,
                    values: [[time]],
                  }
                ],
                valueInputOption: 'USER_ENTERED',
              };

            const result = await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
                requestBody, 
            });

            console.log(result.status + "\n" + result.statusText);
        }
        else {
            console.log("Valid date, username doesn't exist!");
            const winLetter = String.fromCharCode(65 + winIndex);

            let cell = sheet + "!A" + nextUserIndex;
            let cell2 = sheet + "!" + dateLetter + nextUserIndex;
            let cell3 = sheet + "!" + winLetter + nextUserIndex;

            let cellRanges = [
                cell,
                cell2,
                cell3
            ]
            let values = [
                username,
                time,
                "0",
            ];

            const requestBody = {
                data: [
                  {
                    range: cellRanges[0],
                    values: [[values[0]]],
                  },
                  {
                    range: cellRanges[1],
                    values: [[values[1]]],
                  },
                  {
                    range: cellRanges[2],
                    values: [[values[2]]],
                  },
                ],
                valueInputOption: 'USER_ENTERED',
              }

            const result = await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
                requestBody, 
            });
            console.log(result.status + "\n" + result.statusText);
        }
    }
}

// Searches JSON data for a key
async function searchData(data, key) {
    for(let i = 0; i < data.length; i++) {
        if(data[i].includes(key)) {
            return i;
        }
    }
    return -1;
}

async function printLeaderboard() {
    const channel = client.channels.cache.get(noSwearId);
    let data = await leaderboard();
    console.log(data);
    channel.send(data);
}

const serverId = "426214681208946688";
const noSwearId = "429145475371892746";
const triviaId = "812075395985309796";

async function joinSW() {
    const guild = await client.guilds.fetch(serverId);
    const channel = await guild.channels.fetch('454612124396683267');

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    });
}

function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of the year
  
    return `${month}/${day}/${year}`;
}
async function updateDate() {
    const currentDate = new Date();
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);

    if(currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
        // If current time is a weekday
        if(currentDate.getHours() >= 19) {    
            GLOBAL_DATE = formatDate(tomorrow);
        }
        else {
            GLOBAL_DATE = formatDate(currentDate);
        }
    }
    else {
        if(currentDate.getHours() >= 15) {    
            GLOBAL_DATE = formatDate(tomorrow);
        }
        else {
            GLOBAL_DATE = formatDate(currentDate);
        }
    }
    console.log("New GLOBAL_DATE: " + GLOBAL_DATE);
}

async function addDateColumn() {
    let data = await authorize().then(keys);
    let sheets = await authorize().then(sheetsReturner);

    await updateDate();
    const values = [
        [GLOBAL_DATE],
    ]
    const resource = {
        majorDimension: 'COLUMNS',
        values,
    };

    let nextAvailableCell = data[0].length + 1;
    let columnLetter;
    columnLetter = String.fromCharCode(64 + nextAvailableCell);

    if(nextAvailableCell > 26) {
        const firstLetter = String.fromCharCode(64 + (nextAvailableCell / 26));
        const secondLetter = String.fromCharCode(64 + (nextAvailableCell % 26));

        columnLetter = firstLetter + secondLetter;
    }

    let range = sheet + "!" + columnLetter + "1";

    if(!data[0].includes(GLOBAL_DATE)) {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: '1pSpHpMWu9JqE0LOlLX6g1CpQGd6m_ixlvdUdw4poeNc',
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource,
        }); 
        console.log(response);
    }
    else {
        console.log("Date already exists");
    }
    //console.log(data);
}

async function myAverage(username) {
    let usernameCol = await authorize().then(auth => {return getColumn(auth, 0)});
    let usernameIndex = await searchData(usernameCol, username);
    if(usernameIndex < 0) {
        console.log("Username not found");
        return -1;
    }
    usernameIndex++;

    let userRow = await authorize().then(auth => {return getRow(auth, usernameIndex)});

    let userRowNew = userRow[0]
    .slice(3) // Remove the first three entries
    .filter(entry => entry !== ''); // Remove blank entries

    let total = 0;
    for(let i = 0; i < userRowNew.length; i++) {
        total += parseInt(userRowNew[i]);
    }

    total = total / userRowNew.length;
    total = Math.round(total);

    return total;

}

async function updateLeaderboardWithWinner() {
    const auth = await authorize();
    const winner = await findWinner();
    updateLeaderboard(auth, winner);
    console.log("Leaderboard updated");
}

async function setDelay(delay) {
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log("Waited for " + delay + " ms");
}

client.on('ready', async () => {    
    joinSW();
    await updateDate();
    await addDateColumn();
    cron.schedule('0 19 * * 1-5', async () => {
        const channel = client.channels.cache.get(noSwearId);
        await updateLeaderboardWithWinner();
        await setDelay(5000);
        if(channel) {
            await addDateColumn();

            channel.send("MINI TIME");
            printLeaderboard();
        }
    });
    cron.schedule('0 15 * * 6,7', async () => {
        const channel = client.channels.cache.get(noSwearId);
        await updateLeaderboardWithWinner();
        await setDelay(5000);
        if(channel) {
            await addDateColumn();

            channel.send("MINI TIME");
            printLeaderboard();
        }
    });
    console.log("GLOBAL DATE: " + GLOBAL_DATE);
    console.log('The bot is ready');
})

/*
client.on('messageCreate', message => {
    if(message.author.username === 'mondoduplantis625') {  
        let id = message.author.id;
        let mentionB = "<@";
        let mentionE = ">";
        let mentionF = mentionB + id + mentionE;
        //message.delete();
        message.channel.send(mentionF + " WEIRDO");
    }
 });
*/

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isChatInputCommand()) return; 

    if(interaction.commandName === 'math') {
        await (mathPrompt(interaction.channel, interaction));
    }
    else if(interaction.commandName === 'leaderboard') {
        let result = await leaderboard();
        interaction.reply(result);
    }
    else if(interaction.commandName === 'leaderboardtoday') {
        let data = await leaderboardToday();
        interaction.reply(data);
    }
    else if(interaction.commandName === 'average') {
        let username = interaction.user.username;
        let average = await myAverage(username);
        if(average < 0) {
            interaction.reply("You haven't played any");
        }
        interaction.reply("Average: " + average + " seconds");
    }
})

client.on('messageCreate', async message => {
    if(!message.author.bot) {
        console.log(message.author.globalName + ': ' + message.content);
        let string = message.content;
        if(string.includes("https://www.nytimes.com/badges")) {   
            await setDelay(3000);      
            if(message.embeds[0] != undefined) {
                console.log("contains NYT component and embed");
                let username = message.author.username; // Username 
                const receivedEmbed = message.embeds[0];
                let exampleEmbed = receivedEmbed;

                (async () => {
                    const worker = await T.createWorker('eng');
                    const ret = await worker.recognize(exampleEmbed.thumbnail.url);
                    // console.log(ret.data.text);
                    // message.channel.send(ret.data.text);
                    const words = ret.data.text.split('\n');
                    if(words[1].includes("The New York Times Mini Crossword")) {
                        message.channel.send("NICE TRY LOSER");
                    }
                    else {
                        // Was sometimes incorrectly reading #1 as #]
                        let newTime = words[1];
                        if(words[1].includes("]")) {
                            console.log(words[1]);
                            newTime = words[1].replace(']', '1');
                        } // Changes ] -> 1
                        
                        let date = new Date(words[2]);
                        date = formatDate(date);

                        let time = 0;
                        if(newTime.includes("seconds")) {
                            let splitString = newTime.split(" ");
                            time = splitString[0];
                        }
                        else {
                            splitString = newTime.split(":");
                            time = (parseInt(splitString[0]) * 60) + (parseInt(splitString[1]));
                        }
                        if(date === GLOBAL_DATE) {
                            message.reply("TIME: " + newTime);
                            authorize().then(auth => {appendData(auth, username, date, time)}); // Appends data to the spreadsheet, based on username, date, and time
                        }
                        else {
                            message.reply("Invalid date");
                        }
                    }
                    await worker.terminate();
                })();
            }
        }     
    }
})
client.login(process.env.TOKEN);

client.on('error', (error) => {
    console.error("Error: ", error);

    client.login(process.env.TOKEN);
});

// MATH COMMAND STUFF ///////////////////////////////////////
const operations = ["+", "-", "/", "*"];

function mathProblem(x, y, op) {
    let string = "What is " + x + " " + op + " " + y + "?";
    return string;
}

async function mathPrompt(channel, interaction) {
    let x = Math.floor(Math.random() * 10) + 1;
    let y = Math.floor(Math.random() * 10) + 1;
    let op = operations[Math.floor(Math.random() * 4)];

    if(op ===  "+") {
        var answer = x + y;
    }
    else if(op === "-") {
        var answer = x - y;
    }
    else if(op === "/") {
        var answer = x / y;
    }
    else if(op === "*") {
        var answer = x * y;
    }
    answer = Math.round(answer * 100) / 100;

    await interaction.reply(mathProblem(x, y, op));
    const collector = channel.createMessageCollector({max: 10, time: 2500, errors: ['time'] });
    let done = false;

    collector.on('collect', m => {
        if(m.content == answer) {
            m.reply('Correct!');
            done = true;
        }
        else if(!m.author.bot && done == false){
            m.reply('WRONG!');
        }
    });
    collector.on('end', collected => {
        if(done == false) {
            channel.send('Times up! The answer was: ' + answer);
        }
    });
}
// MATH END /////////////////////////////////////////////////////////////////////