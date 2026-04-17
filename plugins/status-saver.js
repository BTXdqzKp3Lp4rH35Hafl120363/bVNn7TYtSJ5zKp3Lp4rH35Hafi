// plugins/status-saver.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);

// Define the command keywords
const commandKeywords = ["send", "sendme", "do", "give", "bhejo", "bhej", "save", "sand", "sent", "forward"];

// No prefix keyword handler
cmd({
    'on': "body"
}, async (conn, mek, m, { from, body, isGroup, reply }) => {
    try {
        // Agar aap chahte hain ke groups mein bhi log 'send' likh kar status mangwa sakein, 
        // to is neechay wali line ko comment hi rehne dein. Agar groups mein band karna hai to uncomment kar lein.
        // if (isGroup) return;

        if (!body) return;
        const messageText = body.toLowerCase();
        const containsKeyword = commandKeywords.some(word => messageText.includes(word));

        // Naye bot ke structure ke mutabiq m.quoted use karna zaroori hai
        if (containsKeyword && m.quoted && m.quoted.chat === 'status@broadcast') {
            // ⏳ React - processing
            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

            const buffer = await m.quoted.download();
            const mtype = m.quoted.mtype;
            const originalCaption = m.quoted.text || '';
            const options = { quoted: mek };

            // Get DESCRIPTION directly from config
            const DESCRIPTION = config.DESCRIPTION || "";

            let messageContent = {};
            switch (mtype) {
                case "imageMessage":
                    messageContent = {
                        image: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : `> ${DESCRIPTION}`
                    };
                    break;
                case "videoMessage":
                    messageContent = {
                        video: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : `> ${DESCRIPTION}`
                    };
                    break;
                case "audioMessage":
                    messageContent = {
                        audio: buffer,
                        mimetype: "audio/mp4",
                        ptt: m.quoted.ptt || false
                    };
                    break;
                default:
                    // 🚫 React - unsupported type
                    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                    return; // Silently ignore unsupported types
            }

            try {
                // Forward status to the same chat where keyword was sent
                await conn.sendMessage(from, messageContent, options);
                // ✅ React - success
                await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            } catch (sendError) {
                console.error("Failed to send status:", sendError);
                // ❌ React - send failed
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            }
        }
    } catch (error) {
        console.error("Keyword Status Save Error:", error);
        // ❌ React - general error
        if (mek && mek.key) {
            try {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            } catch (reactError) {
                console.error("Failed to send error reaction:", reactError);
            }
        }
    }
});
