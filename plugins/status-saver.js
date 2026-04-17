// plugins/status-saver.js - FIXED VERSION
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);

const commandKeywords = ["send", "sendme", "do", "give", "bhejo", "bhej", "save", "sand", "sent", "forward"];

cmd({
    on: "body"
}, async (conn, mek, m, { from, body, isGroup, reply }) => {
    try {
        if (!body) return;

        const messageText = body.toLowerCase();
        const containsKeyword = commandKeywords.some(word => messageText.includes(word));

        // ✅ FIX 1: better status check
        const isStatusReply = m.quoted && m.quoted.key?.remoteJid === 'status@broadcast';

        if (containsKeyword && isStatusReply) {

            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

            // ✅ FIX 2: correct download method
            const buffer = await conn.downloadMediaMessage(m.quoted);

            // ✅ FIX 3: safe type detection
            const mtype = m.quoted.mtype || m.quoted.type;
            const originalCaption = m.quoted.text || '';
            const DESCRIPTION = config.DESCRIPTION || "";

            let messageContent = {};

            switch (mtype) {
                case "imageMessage":
                    messageContent = {
                        image: buffer,
                        caption: originalCaption
                            ? `${originalCaption}\n\n> ${DESCRIPTION}`
                            : `> ${DESCRIPTION}`
                    };
                    break;

                case "videoMessage":
                    messageContent = {
                        video: buffer,
                        caption: originalCaption
                            ? `${originalCaption}\n\n> ${DESCRIPTION}`
                            : `> ${DESCRIPTION}`
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
                    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                    return;
            }

            try {
                // same chat me send
                await conn.sendMessage(from, messageContent, { quoted: mek });

                await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

            } catch (sendError) {
                console.error("Failed to send status:", sendError);
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            }
        }

    } catch (error) {
        console.error("Keyword Status Save Error:", error);
        try {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        } catch {}
    }
});