// plugins/mediafire.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);

// Safe Context Info
const commonContextInfo = (senderJid) => ({
    mentionedJid: [senderJid],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363408401969787@newsletter',
        newsletterName: config.BOT_NAME, 
        serverMessageId: 143
    }
});

// Custom MediaFire Scraper
async function mediafireDl(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const downloadUrl = $('#downloadButton').attr('href');
        const fileName = $('.dl-info > div > div.filename').text().trim() || 'MediaFire_File';
        let fileSize = $('.details').text().trim();
        fileSize = fileSize.replace(/\s+/g, ' ').match(/File size: (.*?) /);
        const finalSize = fileSize ? fileSize[1] : 'Unknown Size';

        if (!downloadUrl) throw new Error("Download link not found.");
        return { downloadUrl, fileName, finalSize };
    } catch (err) {
        throw new Error(err.message);
    }
}

// ==========================================
// COMMAND: mediafire
// ==========================================
cmd({
    pattern: "mediafire",
    alias: ["mf", "mfdl"],
    desc: "Download files directly from MediaFire",
    category: "download",
    react: "📥",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    const prefix = config.PREFIX || '.';

    if (!q || !q.includes('mediafire.com')) {
        return reply(`❌ *Oops!* MediaFire ka link send karein.\n\n*Example:* ${prefix}mf https://www.mediafire.com/...`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        
        // 1. Send initial wait message
        let waitMsg = await conn.sendMessage(from, {
            text: "⏳ *Fetching your file... Please wait!* 🎀",
            contextInfo: commonContextInfo(sender)
        }, { quoted: mek });

        // Fetch file data
        const result = await mediafireDl(q);

        // 2. Edit the wait message to show success
        await conn.sendMessage(from, {
            text: "✅ *File Fetched Successfully!*\n📥 _Uploading document below..._ ✨",
            edit: waitMsg.key, // Message Edit Logic
            contextInfo: commonContextInfo(sender)
        });

        const finalCaption = `📥 *MediaFire Download*\n\n📄 *File:* ${result.fileName}\n⚖️ *Size:* ${result.finalSize}\n\n> *POWERED BY ${config.BOT_NAME}*`;

        // 3. Send the actual Document
        await conn.sendMessage(from, {
            document: { url: result.downloadUrl },
            mimetype: 'application/octet-stream',
            fileName: result.fileName,
            caption: finalCaption,
            contextInfo: commonContextInfo(sender)
        }, { quoted: mek });

        // Final Reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("MediaFire Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply(`❌ *Download Failed!* Link broken ya private ho sakta hai.`);
    }
});
