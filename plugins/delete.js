// plugins/delete.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ================== DELETE COMMAND ====================
cmd({
    pattern: "delete",
    alias: ["del", "dlt"],
    desc: "Delete a quoted message and the command message",
    category: "group",
    react: "🗑️",
    filename: __filename
}, async (conn, mek, m, { from, isCreator, isGroup, reply }) => {
    try {
        // Check if it's a group
        if (!isGroup) return reply('❌ This command can only be used in groups!');
        
        // Check if sender is creator
        if (!isCreator) return reply('❌ Only the bot creator can use this command!');
        
        // Check if message is quoted
        if (!m.quoted) return reply('❌ Please reply to a message to delete it!');
        
        // 1. Create key for the quoted message
        const quotedKey = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.quoted.id,
            participant: m.quoted.sender
        };
        
        // Delete the quoted message
        await conn.sendMessage(m.chat, { delete: quotedKey });
        
        // 2. Delete your command message (e.g., the message where you typed .del)
        await conn.sendMessage(m.chat, { delete: mek.key });
        
        // 3. Send a standalone emoji (Not as a reply to any message)
        await conn.sendMessage(m.chat, { text: "🗑️✨" });
        
    } catch (err) {
        console.error("Delete Command Error:", err);
    }
});
