const { Telegraf } = require('telegraf');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const bot = new Telegraf(process.env.BOT_TOKEN);

let userApiTokens = {};
let userHeaders = {};
let userFooters = {};
let userTextEnabled = {};
let awaitingApiInput = {};
let awaitingHeaderInput = {};
let awaitingFooterInput = {};

// Function to shorten URL
async function shortenUrl(longUrl, apiToken, customAlias = '') {
    const encodedUrl = encodeURIComponent(longUrl);
    let apiUrl = `https://www.terasharelinks.xyz/api?api=${apiToken}&url=${encodedUrl}&format=text`;

    if (customAlias) {
        apiUrl += `&alias=${customAlias}`;
    }

    try {
        const response = await fetch(apiUrl);
        const shortUrl = await response.text();
        return shortUrl.trim(); // Ensure there are no extra spaces
    } catch (error) {
        console.error('Error:', error);
        return 'An error occurred while shortening the link.';
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

// Handle the /start command
bot.start((ctx) => {
    const userName = ctx.from.first_name || ctx.from.username || "User";
    ctx.reply(`${userName}, I am TeraShareLinks, Bulk Link Converter. I Can Convert Links Directly From Your TeraShareLinks Account,

1. Go To 👉 https://terasharelinks.xyz/member/tools/api
2. Then Copy API Key
3. Then click 👉 /api then paste your API Key

If you send me a post with any links, text and images...
I will replace all links in the post to your TeraShareLinks links.
And we will send back to you.
 
Happy sharing and earning 💰💰💰

Thanks for using TeraShareLinks bot ❤️`);
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
    if (userHeaders[userId]) {
        delete userHeaders[userId];
        ctx.reply('Remove header text successfully');
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
    if (userFooters[userId]) {
        delete userFooters[userId];
        ctx.reply('Remove footer text successfully');
    } else {
        ctx.reply('No footer was set.');
    }
});

// Command to enable text
bot.command('enable_text', (ctx) => {
    const userId = ctx.from.id;
    userTextEnabled[userId] = true;
    ctx.reply('Enable text successfully');
});

// Command to disable text
bot.command('disable_text', (ctx) => {
    const userId = ctx.from.id;
    userTextEnabled[userId] = false;
    ctx.reply('Disable text successfully.');
});

// Handle messages and media with text
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;

    // Check if awaiting API key input
    if (awaitingApiInput[userId]) {
        const apiToken = ctx.message.text.trim();
        userApiTokens[userId] = apiToken;
        awaitingApiInput[userId] = false;
        ctx.reply('API token add successfully🥳! Now send me a link to shorten🎉.');
        return;
    }

    // Check if awaiting header input
    if (awaitingHeaderInput[userId]) {
        const header = ctx.message.text.trim();
        userHeaders[userId] = header;
        awaitingHeaderInput[userId] = false;
        ctx.reply('Add header text successfully');
        return;
    }

    // Check if awaiting footer input
    if (awaitingFooterInput[userId]) {
        const footer = ctx.message.text.trim();
        userFooters[userId] = footer;
        awaitingFooterInput[userId] = false;
        ctx.reply('Add footer text successfully');
        return;
    }

    // Check if API token exists for the user
    if (!userApiTokens[userId]) {
        ctx.reply('Please provide your API token first.😊 using the 👉  /api command.');
        return;
    }

    const apiToken = userApiTokens[userId];
    const header = userHeaders[userId] || ''; // Get header if exists, else empty
    const footer = userFooters[userId] || ''; // Get footer if exists, else empty
    const includeText = userTextEnabled[userId] !== false; // Default to true unless explicitly set to false

    // Function to shorten and send the message
    async function processAndSendMessage(text) {
        const links = extractLinks(text);
        if (links.length === 0) {
            ctx.reply('This is not a link😕... Please provide a valid link.');
            return;
        }

        const shortenedLinksPromises = links.map(async (link) => {
            if (isTelegramLink(link)) {
                return includeText ? link : ''; // Keep or remove Telegram link based on text settings
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
            ctx.reply(`${header}\n${shortenedLinksOnly}\n\n${footer}` || 'This is not a valid link😕...');
        }
    }

    // If message contains text
    if (ctx.message.text) {
        await processAndSendMessage(ctx.message.text.trim());
    }

    // If message contains media (photo, video, etc.) with caption
    else if (ctx.message.caption) {
        const mediaCaption = ctx.message.caption.trim();
        const links = extractLinks(mediaCaption);

        if (links.length === 0) {
            ctx.reply('This is not a link😕... Please provide a valid link.');
            return;
        }

        const shortenedLinksPromises = links.map(async (link) => {
            if (isTelegramLink(link)) {
                return includeText ? link : ''; // Keep or remove Telegram link based on text settings
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

        // Send the media with the header, shortened links, and footer in the caption
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
            ctx.reply('This is not a link😕... Please provide a valid link.');
        }
    } else {
        ctx.reply('This is not a link😕... Please provide a valid link.');
    }
});

// Start bot polling
bot.launch().then(() => {
    console.log('Bot is running...');
});
