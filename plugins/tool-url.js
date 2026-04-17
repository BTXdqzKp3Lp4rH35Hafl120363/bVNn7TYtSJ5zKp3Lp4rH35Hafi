// plugins/tourl.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);

/**
 * Image buffer ko ImgBB par upload karta hai aur URL return karta hai.
 */
async function toUrl(mediaBuffer) {
    try {
        const API_KEY = 'ed1580cdc9e5d4c1919f58a3e626ea72'; // Aapki ImgBB API Key
        const base64Image = mediaBuffer.toString('base64');
        
        const form = new FormData();
        form.append('image', base64Image);

        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${API_KEY}`, 
            form, 
            { headers: { ...form.getHeaders() } }
        );

        if (response.data && response.data.success) {
            return response.data.data.url;
        } else {
            throw new Error('Upload failed: Invalid response from ImgBB');
        }
    } catch (error) {
        console.error('Error uploading to ImgBB:', error.message);
        return null;
    }
}

// ================== TOURL COMMAND ====================
cmd({
    pattern: "tourl",
    alias: ["imgbb", "url", "tourl"],
    desc: "Convert an image to an ImgBB direct link",
    category: "tools",
    react: "🔗",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        // Check if the user replied to a message
        if (!m.quoted) {
            return reply('❌ Bhai, kisi image ko reply kar ke command use karo! (e.g., .tourl)');
        }

        // Check if the quoted message is an image
        if (m.quoted.mtype !== 'imageMessage') {
            return reply('❌ Please kisi Image ko hi reply karein! Videos ya documents support nahi hote.');
        }

        // Send processing reaction & message
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply("⏳ *Image upload ho rahi hai, thora wait karein...*");

        // Use framework's inbuilt download function (same as viewonce.js)
        const buffer = await m.quoted.download();
        
        if (!buffer) {
            return reply("❌ Image download karne mein masla aaya!");
        }

        // Pass buffer to ImgBB function
        const link = await toUrl(buffer);

        if (link) {
            const replyText = `✅ *Success!*\n\n🔗 *URL:* ${link}`;
            await conn.sendMessage(from, { text: replyText }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        } else {
            await reply("❌ *Upload Fail!* ImgBB API mein koi masla aa gaya hai.");
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        }

    } catch (error) {
        console.error("Tourl Command Error:", error);
        reply("⚠️ Koi masla aa gaya:\n" + error.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
