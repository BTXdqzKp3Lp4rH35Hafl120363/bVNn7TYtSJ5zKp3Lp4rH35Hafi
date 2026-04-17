// plugins/menu.js - Stylish UI Version (No Logic Changed)
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd, commands } from '../command.js';
import { runtime } from '../lib/functions.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// small caps
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';
    const map = {
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',
        j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',
        s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
    };
    return text.toLowerCase().split('').map(c => map[c] || c).join('');
};

// 🔥 CATEGORY DESIGN
const formatCategory = (category, cmds) => {
    const valid = cmds.filter(c => c.pattern && c.pattern.trim() !== '');
    if (!valid.length) return '';

    let text = `\n╭─╣    \`${category.toUpperCase()} MENU\`\n│\n`;
    text += valid.map(cmd => `│  ツ .${cmd.pattern}`).join('\n');
    text += `\n│\n╰───────╮\n`;
    return text;
};

// 🔥 MENU OPTIONS
const formatMenuOptions = (categories) => {
    let out = '';
    let i = 1;
    for (const cat of categories) {
        out += `│  ツ ${i} ${toSmallCaps(cat)} ᴍᴇɴᴜ\n`;
        i++;
    }
    return out;
};

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

const getMediaType = (url) => {
    if (!url) return null;
    const u = url.toLowerCase();
    if (['.jpg','.jpeg','.png','.webp','.gif'].some(x=>u.endsWith(x))) return 'image';
    if (['.mp4','.mkv','.webm'].some(x=>u.endsWith(x))) return 'video';
    return null;
};

// organize commands
const getCategorizedCommands = () => {
    const arr = Array.isArray(commands) ? commands : Object.values(commands);
    const categories = [...new Set(arr.map(c => c.category))].filter(Boolean);

    const categorized = {};
    categories.forEach(cat => {
        const cmds = arr.filter(c => c.category === cat && c.pattern);
        if (cmds.length) categorized[cat] = cmds;
    });

    return { categorized, totalCommands: arr.length };
};

// ================= MENU =================
cmd({
    pattern: "menu",
    alias: ["m","help"],
    desc: "menu",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {

    const { categorized, totalCommands } = getCategorizedCommands();
    const cats = Object.keys(categorized);

    const caption =
`╭─╣    \`${config.BOT_NAME} INFO\`
│
│  ツ 𝐁𝐨𝐭 : ${config.BOT_NAME}
│  ツ 𝐎𝐰𝐧𝐞𝐫 : ${config.OWNER_NAME}
│  ツ 𝐕𝐞𝐫𝐬𝐢𝐨𝐧 : ${config.VERSION}
│  ツ 𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : ${runtime(process.uptime())}
│  ツ 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬 : ${totalCommands}
│
╰───────╮

╭─╣    \`SELECT MENU\`
│
${formatMenuOptions(cats)}│
╰───────╮

> Reply with number... or don’t, I’m not begging.

> ${config.DESCRIPTION || ''}`;

    let media;
    const local = path.join(__dirname, '../lib/iconicmd.jpg');
    const type = getMediaType(config.BOT_MEDIA_URL);

    try {
        await axios.head(config.BOT_MEDIA_URL);
        media = { [type]: { url: config.BOT_MEDIA_URL } };
    } catch {
        media = { image: { url: local } };
    }

    const sent = await conn.sendMessage(from, {
        ...media,
        caption,
        contextInfo: commonContextInfo(sender)
    }, { quoted: mek });

    const msgId = sent.key.id;

    const listener = async (msgData) => {
        const msg = msgData.messages[0];
        if (!msg.message) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === msgId;

        if (isReply) {
            conn.ev.off("messages.upsert", listener);

            const num = parseInt(text);
            if (num >= 1 && num <= cats.length) {
                const cat = cats[num-1];
                const cmds = categorized[cat];

                let menu =
`╭─╣    \`${cat.toUpperCase()} MENU\`
│
│  ツ Commands : ${cmds.length}
│
╰───────╮`;

                menu += formatCategory(cat, cmds);

                menu += `\n> Use ${config.PREFIX}menu again\n\n> ${config.DESCRIPTION || ''}`;

                await conn.sendMessage(from, {
                    ...media,
                    caption: menu,
                    contextInfo: commonContextInfo(sender)
                }, { quoted: msg });

            } else {
                reply(`❌ Invalid number (1-${cats.length})`);
            }
        }
    };

    conn.ev.on("messages.upsert", listener);

    setTimeout(() => {
        conn.ev.off("messages.upsert", listener);
    }, 20000);
});

// ================= MENU2 =================
cmd({
    pattern: "menu2",
    alias: ["allmenu"],
    desc: "full menu",
    category: "main",
    react: "📜",
    filename: __filename
},
async (conn, mek, m, { from, sender }) => {

    const { categorized, totalCommands } = getCategorizedCommands();

    let text =
`╭─╣    \`${config.BOT_NAME} COMMANDS\`
│
│  ツ Commands : ${totalCommands}
│  ツ Prefix : ${config.PREFIX}
│  ツ Mode : ${config.MODE}
│
╰───────╮`;

    for (const [cat, cmds] of Object.entries(categorized)) {
        text += formatCategory(cat, cmds);
    }

    text += `\n> Pick something useful this time.\n\n> ${config.DESCRIPTION || ''}`;

    let media;
    const local = path.join(__dirname, '../lib/iconicmd.jpg');

    try {
        await axios.head(config.BOT_MEDIA_URL);
        media = { image: { url: config.BOT_MEDIA_URL } };
    } catch {
        media = { image: { url: local } };
    }

    await conn.sendMessage(from, {
        ...media,
        caption: text,
        contextInfo: commonContextInfo(sender)
    }, { quoted: mek });

});