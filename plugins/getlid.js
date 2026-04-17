// plugins/getlid.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js'; 

const __filename = fileURLToPath(import.meta.url);

// Safe Context Info for ICONIC-MD theme
const commonContextInfo = (senderJid) => ({
    mentionedJid: [senderJid],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363408401969787@newsletter',
        newsletterName: config.BOT_NAME || "ICONIC-MD",
        serverMessageId: 143
    }
});

cmd({
    pattern: "getlid",
    alias: ["lid"],
    desc: "Get the exact WhatsApp ID or LID of a user",
    category: "tools",
    react: "🔎",
    filename: __filename
}, async (conn, mek, m, { from, reply, sender }) => {
    try {
        await conn.sendMessage(from, { react: { text: '🔎', key: m.key } });

        // 1. Agar kisi ke message par reply kiya gaya hai
        if (m.quoted) {
            const targetId = m.quoted.sender; // Gets the exact ID of the quoted user
            
            let msg = `╭━━━〔 🔎 *ID EXTRACTOR* 〕━━━┈\n` +
                      `┃ 👤 *Target:* @${targetId.split('@')[0]}\n` +
                      `┃ 🆔 *Exact ID:* ${targetId}\n` +
                      `┃ ⚡ *Type:* ${targetId.includes('@lid') ? 'Hidden LID 🔒' : 'Standard JID 📱'}\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━┈\n\n` +
                      `> *Note:* Aap is ID ko apne code ki restrictions mein use kar sakte hain.`;
            
            return await conn.sendMessage(from, {
                text: msg,
                mentions: [targetId], // Mention user without breaking ID format
                contextInfo: commonContextInfo(sender)
            }, { quoted: mek });
        }

        // 2. Agar kisi ko reply nahi kiya, toh bot aapka apna ID batayega
        let msg = `╭━━━〔 🔎 *ID EXTRACTOR* 〕━━━┈\n` +
                  `┃ 👤 *User:* @${sender.split('@')[0]}\n` +
                  `┃ 🆔 *Your ID:* ${sender}\n` +
                  `┃ ⚡ *Type:* ${sender.includes('@lid') ? 'Hidden LID 🔒' : 'Standard JID 📱'}\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━┈\n\n` +
                  `> *Tip:* Kisi aur ka ID nikalne ke liye uske message par reply karein aur .getlid likhein.`;
        
        return await conn.sendMessage(from, {
            text: msg,
            mentions: [sender],
            contextInfo: commonContextInfo(sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("GetLID Error:", e);
        reply(`❌ Error extracting ID: ${e.message}`);
    }
});
