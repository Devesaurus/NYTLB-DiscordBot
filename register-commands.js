require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'test',
        description: 'test'
    },
    {
        name: 'math',
        description: 'math problem'
    },
    {
        name: 'print',
        description: 'prints data associated with parameter from spreadsheet',
        options: [
            {
                name: 'name',
                description: 'name to look for',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'leaderboard',
        description: 'prints spreadsheet'
    },
    {
        name: 'leaderboardtoday',
        description: 'prints todays current standings'
    },
    {
        name: 'average',
        description: "shows your average for the month"
    },
    {
        name: 'trivia',
        description: 'trivia questions'
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(
            process.env.CLIENT_ID, 
            process.env.GUILD_ID),
            {body: commands}
        )
        console.log('Slash commands registered successfully');

    } catch(error) {
        console.log('There was an error: ' + error);
    }
})();