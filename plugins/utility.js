// plugins/utility.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } from '../lib/functions.js';

// ==================== OWNER COMMAND ====================
cmd({
    pattern: "owner",
    desc: "Get owner number",
    category: "main",
    react: "🎮",
    filename: __filename
}, async (sock, m, msg, { from }) => {
    try {
        await sock.sendMessage(from, { react: { text: "📇", key: m.key } });
        await sock.sendPresenceUpdate("composing", from);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${config.OWNER_NAME}\n` +
            `ORG:${config.BOT_NAME} Team;\n` +
            `TEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:${'+' + config.OWNER_NUMBER}\n` +
            'END:VCARD';

        await sock.sendMessage(from, {
            contacts: {
                displayName: config.OWNER_NAME,
                contacts: [{ vcard }]
            }
        });

        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
        console.error("Error sending contact:", e);
        await sock.sendMessage(from, {
            text: `❌ Couldn't send contact:\n${e.message}`
        });
    }
});