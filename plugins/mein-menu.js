// plugins/menu.js - CLEAN MENU2 ONLY + SMART SORT
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd, commands } from '../command.js';
import { runtime } from '../lib/functions.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= CATEGORY FORMAT (SMART SORT) =================
const formatCategory = (category, cmds) => {
    const valid = cmds.filter(c => c.pattern && c.pattern.trim() !== '');
    if (!valid.length) return '';

    // 🔥 SMART SORT: short commands first, long later
    const sorted = valid.sort((a, b) => {
        return a.pattern.length - b.pattern.length;
    });

    let text = `\n╭─╣    \`${category.toUpperCase()} MENU\`\n│\n`;

    text += sorted.map(cmd => `│  ツ .${cmd.pattern}`).join('\n');

    text += `\n│\n╰───────╮`;

    return text;
};

// ================= COMMAND ORGANIZER =================
const getCategorizedCommands = () => {
    const arr = Array.isArray(commands) ? commands : Object.values(commands);

    const categories = [...new Set(arr.map(c => c.category))]
        .filter(cat => cat && cat !== 'undefined');

    const categorized = {};
    categories.forEach(cat => {
        const cmds = arr.filter(c => c.category === cat && c.pattern);
        if (cmds.length) categorized[cat] = cmds;
    });

    return { categorized, totalCommands: arr.length };
};

// ================= MEDIA TYPE =================
const getMediaType = (url) => {
    if (!url) return null;
    const u = url.toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(x => u.endsWith(x))) return 'image';
    if (['.mp4', '.mkv', '.webm'].some(x => u.endsWith(x))) return 'video';

    return null;
};

// ================= CONTEXT =================
const commonContextInfo = (sender) => ({
    mentionedJid: [sender],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363408401969787@newsletter',
        newsletterName: config.BOT_NAME,
        serverMessageId: 143
    }
});

// ================= ONLY MENU2 =================
cmd({
    pattern: "menu",
    alias: ["menu2", "allmenu", "fullmenu"],
    desc: "Show all commands",
    category: "main",
    react: "📜",
    filename: __filename
},
async (conn, mek, m, { from, sender }) => {

    const { categorized, totalCommands } = getCategorizedCommands();

    let text =
`╭─╣    \`${config.BOT_NAME} COMMANDS\`
│
│  ツ Owner : ${config.OWNER_NAME}
│  ツ Commands : ${totalCommands}
│  ツ Prefix : ${config.PREFIX}
│  ツ Mode : ${config.MODE}
│  ツ Runtime : ${runtime(process.uptime())}
│
╰───────╮`;

    for (const [cat, cmds] of Object.entries(categorized)) {
        text += formatCategory(cat, cmds);
    }

    text += `\n> Pick something useful this time.\n\n> ${config.DESCRIPTION || ''}`;

    const local = path.join(__dirname, '../lib/iconicmd.jpg');
    const type = getMediaType(config.BOT_MEDIA_URL);

    let media;

    try {
        await axios.head(config.BOT_MEDIA_URL, { timeout: 3000 });
        media = { [type || 'image']: { url: config.BOT_MEDIA_URL } };
    } catch {
        media = { image: { url: local } };
    }

    await conn.sendMessage(from, {
        ...media,
        caption: text,
        contextInfo: commonContextInfo(sender)
    }, { quoted: mek });

});