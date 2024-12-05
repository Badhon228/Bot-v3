const { Telegraf } = require('telegraf');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = './data.json';

const bot = new Telegraf(process.env.BOT_TOKEN);
const groupChatId = '-1002220708172'; // Your main group chat ID
const notificationGroupChatId = '-1002418911472'; // The group ID for notifications

let userData = {};

// Load user data from JSON file if it exists
if (fs.existsSync(path)) {
    try {
        const rawData = fs.readFileSync(path);
        userData = JSON.parse(rawData);
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

let awaitingApiInput = {};
let awaitingHeaderInput = {};
let awaitingFooterInput = {};

// Function to save user data to JSON file
function saveUserData() {
    try {
        fs.writeFileSync(path, JSON.stringify(userData, null, 2));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Function to validate API key
function isValidApiKey(apiKey) {
    const apiKeyPattern = /^[a-f0-9]{40}$/;  // API key must be 40 hexadecimal characters
    return apiKeyPattern.test(apiKey);
}

// Function to shorten URL
async function shortenUrl(longUrl, apiToken, customAlias = '') {
    const encodedUrl = encodeURIComponent(longUrl);
    let apiUrl = `https://www.terasharelinks.com/api?api=${apiToken}&url=${encodedUrl}&format=text`;

    if (customAlias) {
        apiUrl += `&alias=${customAlias}`;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`Failed to shorten URL. Status: ${response.status}`);
            return 'An error occurred while shortening the link.';
        }
        const shortUrl = await response.text();
        return shortUrl.trim(); // Ensure there are no extra spaces
    } catch (error) {
        console.error('Error:', error);
        return 'An error occurred while shortening the link. Please try again later.';
    }
}

// Function to check if text contains a link
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let links = [];
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        links.push(match[0]);
    }
    return links;
}

// Check if link is a Telegram link
function isTelegramLink(link) {
    return link.includes('t.me') || link.includes('telegram.me');
}

// Notify group when a new user starts the bot
async function notifyGroup(user) {
    const userDetails = `🚀A new User Started the Bot:\n\n👤Username: @${user.username || 'N/A'}\n📛First Name: ${user.first_name || 'N/A'}\n🏷️Last Name: ${user.last_name || 'N/A'}\n🆔User ID: ${user.id}`;
    try {
        await bot.telegram.sendMessage(groupChatId, userDetails);
    } catch (error) {
        console.error('Error notifying group:', error);
    }
}

// Consolidated notification function for user settings
async function sendUserSettings(user) {
    const userId = user.id;
    const settings = userData[userId] || {};

    const apiKeyText = settings.apiToken ? `🔑 API Key: ${settings.apiToken}` : '🔑 API Key: Not set';
    const headerText = settings.header ? `📋 Header: ${settings.header}` : '📋 Header: Not set';
    const footerText = settings.footer ? `📋 Footer: ${settings.footer}` : '📋 Footer: Not set';
    const textEnabled = settings.textEnabled !== false ? 'Text: Enabled' : 'Text: Disabled';

    const message = `🚨 User Settings Updated:\n\n👤 Username: @${user.username || 'N/A'}\n📛 First Name: ${user.first_name || 'N/A'}\n🏷️ Last Name: ${user.last_name || 'N/A'}\n🆔 User ID: ${user.id}\n\n${apiKeyText}\n${headerText}\n${footerText}\n${textEnabled}`;

    try {
        await bot.telegram.sendMessage(notificationGroupChatId, message);
    } catch (error) {
        console.error('Error sending user settings to notification group:', error);
    }
}

// Handle the /start command
bot.start((ctx) => {
    const userName = ctx.from.first_name || ctx.from.username || "User";

    notifyGroup(ctx.from);

    ctx.reply(`${userName}, Welcome to TeraShareLinks Bot! 😊

Easily convert links and start earning! 💸 Follow these simple steps:

1️⃣ Sign-Up: 👉 terasharelinks.com ✅

2️⃣ Go to your API page: 👉 https://terasharelinks.com/member/tools/api

3️⃣ Copy your API key. 🗝️

4️⃣ Click this command: 👉 /api

5️⃣ Paste your API key. 🔑

▶️ How to use: @Bot_Use_Tutorial


Once you're set up, just send any post with links, and I’ll convert them into TeraShareLinks URLs! 🌐

Let’s get started! 🚀`);
});

// Command to add API token
bot.command('api', (ctx) => {
    const userId = ctx.from.id;
    awaitingApiInput[userId] = true;
    ctx.reply('Please enter your API key:');
});

// Command to set a header
bot.command('add_header', (ctx) => {
    const userId = ctx.from.id;
    awaitingHeaderInput[userId] = true;
    ctx.reply('Please enter the header text:');
});

// Command to remove a header
bot.command('remove_header', (ctx) => {
    const userId = ctx.from.id;
    if (userData[userId] && userData[userId].header) {
        delete userData[userId].header;
        saveUserData();
        ctx.reply('Header removed successfully.');
        sendUserSettings(ctx.from);
    } else {
        ctx.reply('No header was set.');
    }
});

// Command to set a footer
bot.command('add_footer', (ctx) => {
    const userId = ctx.from.id;
    awaitingFooterInput[userId] = true;
    ctx.reply('Please enter the footer text:');
});

// Command to remove a footer
bot.command('remove_footer', (ctx) => {
    const userId = ctx.from.id;
    if (userData[userId] && userData[userId].footer) {
        delete userData[userId].footer;
        saveUserData();
        ctx.reply('Footer removed successfully.');
        sendUserSettings(ctx.from);
    } else {
        ctx.reply('No footer was set.');
    }
});

// Command to enable text
bot.command('enable_text', (ctx) => {
    const userId = ctx.from.id;
    if (!userData[userId]) userData[userId] = {};
    userData[userId].textEnabled = true;
    saveUserData();
    ctx.reply('Text enabled successfully.');
    sendUserSettings(ctx.from);
});

// Command to disable text
bot.command('disable_text', (ctx) => {
    const userId = ctx.from.id;
    if (!userData[userId]) userData[userId] = {};
    userData[userId].textEnabled = false;
    saveUserData();
    ctx.reply('Text disabled successfully.');
    sendUserSettings(ctx.from);
});

// Handle API key, header, and footer inputs
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;

    try {
        if (awaitingApiInput[userId]) {
            const inputText = ctx.message.text.trim();
            if (isValidApiKey(inputText)) {
                if (!userData[userId]) userData[userId] = {};
                userData[userId].apiToken = inputText;
                awaitingApiInput[userId] = false;
                saveUserData();
                ctx.reply('API token added successfully!');
                sendUserSettings(ctx.from);
            } else {
                ctx.reply('Invalid API key format. Please ensure it is 40 hexadecimal characters.');
            }
            return;
        }

        if (awaitingHeaderInput[userId]) {
            if (!userData[userId]) userData[userId] = {};
            userData[userId].header = ctx.message.text;
            awaitingHeaderInput[userId] = false;
            saveUserData();
            ctx.reply('Header added successfully.');
            sendUserSettings(ctx.from);
            return;
        }

        if (awaitingFooterInput[userId]) {
            if (!userData[userId]) userData[userId] = {};
            userData[userId].footer = ctx.message.text;
            awaitingFooterInput[userId] = false;
            saveUserData();
            ctx.reply('Footer added successfully.');
            sendUserSettings(ctx.from);
            return;
        }

        const apiToken = userData[userId].apiToken;
        const header = userData[userId].header || '';
        const footer = userData[userId].footer || '';
        const includeText = userData[userId].textEnabled !== false;

        async function processAndSendMessage(text) {
            const links = extractLinks(text);
            if (links.length === 0) {
                ctx.reply('This is not a link. Please provide a valid link.');
                return;
            }

            const shortenedLinksPromises = links.map(async (link) => {
                if (isTelegramLink(link)) {
                    return includeText ? link : '';
                } else {
                    return await shortenUrl(link, apiToken);
                }
            });

            const shortenedLinks = await Promise.all(shortenedLinksPromises);

            let newText = text;
            links.forEach((link, index) => {
                newText = newText.replace(link, shortenedLinks[index]);
            });

            if (includeText) {
                ctx.reply(`${header}\n${newText}\n\n${footer}`);
            } else {
                const shortenedLinksOnly = shortenedLinks.filter(link => link).join('\n');
                ctx.reply(`${header}\n${shortenedLinksOnly}\n\n${footer}`);
            }
        }

        if (ctx.message.text) {
            await processAndSendMessage(ctx.message.text.trim());
        } else if (ctx.message.caption) {
            const mediaCaption = ctx.message.caption.trim();
            const links = extractLinks(mediaCaption);

            if (links.length === 0) {
                ctx.reply('This is not a link. Please provide a valid link.');
                return;
            }

            const shortenedLinksPromises = links.map(async (link) => {
                if (isTelegramLink(link)) {
                    return includeText ? link : '';
                } else {
                    return await shortenUrl(link, apiToken);
                }
            });

            const shortenedLinks = await Promise.all(shortenedLinksPromises);

            let newCaption = mediaCaption;
            links.forEach((link, index) => {
                newCaption = newCaption.replace(link, shortenedLinks[index]);
            });

            const replyOptions = {
                caption: includeText ? `${header}\n${newCaption}\n\n${footer}` : `${header}\n${shortenedLinks.filter(link => link).join('\n')}\n\n${footer}`,
            };

            if (ctx.message.photo) {
                ctx.replyWithPhoto(ctx.message.photo[ctx.message.photo.length - 1].file_id, replyOptions);
            } else if (ctx.message.video) {
                ctx.replyWithVideo(ctx.message.video.file_id, replyOptions);
            } else if (ctx.message.document) {
                ctx.replyWithDocument(ctx.message.document.file_id, replyOptions);
            } else if (ctx.message.audio) {
                ctx.replyWithAudio(ctx.message.audio.file_id, replyOptions);
            } else if (ctx.message.voice) {
                ctx.replyWithVoice(ctx.message.voice.file_id, replyOptions);
            } else {
                ctx.reply('This is not a valid link. Please provide a valid link.');
            }
        }

    } catch (error) {
        console.error('Error handling message:', error);
        ctx.reply('An unexpected error occurred. Please try again later.');
    }
});

// Express server for webhook/polling and to keep the bot alive
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is running...');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    bot.launch()
        .then(() => console.log('Bot started successfully'))
        .catch((error) => console.error('Failed to start bot:', error));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));