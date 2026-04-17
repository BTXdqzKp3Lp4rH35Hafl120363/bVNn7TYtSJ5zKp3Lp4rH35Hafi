// plugins/menu.js - ESM Version
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd, commands } from '../command.js';
import { runtime } from '../lib/functions.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Safe Context Info (Updated with Channel Forward Info)
const commonContextInfo = (senderJid) => ({
    mentionedJid: [senderJid],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363408401969787@newsletter',
        newsletterName: "ICONIC-MD",
        serverMessageId: 143
    }
});

// Bot Header
const generateHeader = (totalCommands) => {
    return `╭━━〔 *${config.BOT_NAME}* 〕━━┈
┃ 👑 *Owner:* ${config.OWNER_NAME}
┃ ⚡ *Prefix:* [ ${config.PREFIX} ]
┃ ⚙️ *Mode:* ${config.MODE}
┃ 🏷️ *Version:* ${config.VERSION}
┃ 📜 *Plugins:* ${totalCommands}
┃ ⏳ *Uptime:* ${runtime(process.uptime())}
╰━━━━━━━━━━━━━━━┈`;
};

// ===============================
// COMMAND: menu (Hardcoded Static List)
// ===============================
cmd({
    pattern: "menu",
    alias: ["m", "allmenu", "fullmenu"],
    desc: "Show all bot commands",
    category: "main",
    react: "📜",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);
        
        // Count total plugins loaded to show in the header
        const commandsArray = Array.isArray(commands) ? commands : Object.values(commands);
        let totalCommands = commandsArray.length;
        
        // Define prefix for the menu string
        const prefix = config.PREFIX;

        // Custom Hardcoded Menu provided by User
        const hardcodedMenu = `╭━「 🤖 𝗔𝗜 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}gemini
┃ ➪ ${prefix}text2img
┃ ➪ ${prefix}powerbrain
╰━━━━━━━━━━━

╭━「 ⚡ 𝗔𝗡𝗧𝗜 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}anti-call
┃ ➪ ${prefix}antidelete
┃ ➪ ${prefix}antiedit
┃ ➪ ${prefix}antilink
╰━━━━━━━━━━━

╭━「 🌀 𝗢𝗧𝗛𝗘𝗥 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}getpp
┃ ➪ ${prefix}mee
╰━━━━━━━━━━━

╭━「 🔎 𝗦𝗘𝗔𝗥𝗖𝗛 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}define
┃ ➪ ${prefix}stiktok
┃ ➪ ${prefix}github
┃ ➪ ${prefix}tiktoksearch
┃ ➪ ${prefix}tiktoksearch2
╰━━━━━━━━━━━

╭━「 📌 𝗠𝗔𝗜𝗡 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}id
┃ ➪ ${prefix}raw
┃ ➪ ${prefix}tourl
┃ ➪ ${prefix}fetch
┃ ➪ ${prefix}menu
┃ ➪ ${prefix}ping
┃ ➪ ${prefix}ping2
┃ ➪ ${prefix}alive
┃ ➪ ${prefix}uptime
┃ ➪ ${prefix}getlid
╰━━━━━━━━━━━

╭━「 👑 𝗢𝗪𝗡𝗘𝗥 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}vv
┃ ➪ ${prefix}vv2
┃ ➪ ${prefix}vv3
┃ ➪ ${prefix}update
┃ ➪ ${prefix}forward
┃ ➪ ${prefix}block
┃ ➪ ${prefix}unblock
╰━━━━━━━━━━━

╭━「 🧰 𝗧𝗢𝗢𝗟𝗦 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}tts
┃ ➪ ${prefix}tts2
┃ ➪ ${prefix}calc
┃ ➪ ${prefix}attp
┃ ➪ ${prefix}ttmp3
┃ ➪ ${prefix}tomp3
┃ ➪ ${prefix}sticker
╰━━━━━━━━━━━

╭━「 🎭 𝗙𝗨𝗡 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}emix
┃ ➪ ${prefix}emoji
┃ ➪ ${prefix}aura
┃ ➪ ${prefix}roast
┃ ➪ ${prefix}8ball
┃ ➪ ${prefix}character
┃ ➪ ${prefix}ringtone
┃ ➪ ${prefix}lovetest
┃ ➪ ${prefix}compatibility
┃ ➪ ${prefix}compliment
╰━━━━━━━━━━━

╭━「 📥 𝗗𝗟 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}apk
┃ ➪ ${prefix}fb
┃ ➪ ${prefix}ytv
┃ ➪ ${prefix}mp3
┃ ➪ ${prefix}mp4
┃ ➪ ${prefix}play
┃ ➪ ${prefix}song
┃ ➪ ${prefix}igmp3
┃ ➪ ${prefix}igdl
┃ ➪ ${prefix}igdl2
┃ ➪ ${prefix}igdl3
┃ ➪ ${prefix}insta4
┃ ➪ ${prefix}tiktok
┃ ➪ ${prefix}tiktok2
┃ ➪ ${prefix}tiktok3
┃ ➪ ${prefix}tiktok4
┃ ➪ ${prefix}ytmp3
┃ ➪ ${prefix}ytmp4
┃ ➪ ${prefix}ytpost
┃ ➪ ${prefix}audio2
┃ ➪ ${prefix}youtube2
┃ ➪ ${prefix}dlnpm
┃ ➪ ${prefix}megadl
┃ ➪ ${prefix}pinterest
┃ ➪ ${prefix}gitclone
┃ ➪ ${prefix}drama
┃ ➪ ${prefix}capcut
┃ ➪ ${prefix}tsticker
┃ ➪ ${prefix}download
┃ ➪ ${prefix}mediafire
┃ ➪ ${prefix}thumbnail
╰━━━━━━━━━━━

╭━「 👥 𝗚𝗥𝗢𝗨𝗣 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}poll
┃ ➪ ${prefix}out
┃ ➪ ${prefix}newgc
┃ ➪ ${prefix}end
┃ ➪ ${prefix}kick
┃ ➪ ${prefix}add
┃ ➪ ${prefix}leave
┃ ➪ ${prefix}hidetag
┃ ➪ ${prefix}tag
┃ ➪ ${prefix}tagall
┃ ➪ ${prefix}join
┃ ➪ ${prefix}link
┃ ➪ ${prefix}ginfo
┃ ➪ ${prefix}invite
┃ ➪ ${prefix}gcpp
┃ ➪ ${prefix}revoke
┃ ➪ ${prefix}delete
┃ ➪ ${prefix}accept
┃ ➪ ${prefix}reject
┃ ➪ ${prefix}mute
┃ ➪ ${prefix}unmute
┃ ➪ ${prefix}demote
┃ ➪ ${prefix}promote
┃ ➪ ${prefix}everyone
┃ ➪ ${prefix}rejectall
┃ ➪ ${prefix}acceptall
┃ ➪ ${prefix}requests
┃ ➪ ${prefix}groupstatus
┃ ➪ ${prefix}updategdesc
┃ ➪ ${prefix}updategname
╰━━━━━━━━━━━

╭━「 ⚙ 𝗦𝗘𝗧𝗧𝗜𝗡𝗚 𝗠𝗘𝗡𝗨 」
┃ ➪ ${prefix}setprefix
┃ ➪ ${prefix}mode
┃ ➪ ${prefix}botdp
┃ ➪ ${prefix}botname
┃ ➪ ${prefix}ownername
┃ ➪ ${prefix}setowner
┃ ➪ ${prefix}description
┃ ➪ ${prefix}rejectmsg
┃ ➪ ${prefix}delpath
┃ ➪ ${prefix}editpath
┃ ➪ ${prefix}ban
┃ ➪ ${prefix}unban
┃ ➪ ${prefix}banlist
┃ ➪ ${prefix}addsudo
┃ ➪ ${prefix}delsudo
┃ ➪ ${prefix}sudolist
┃ ➪ ${prefix}mentionreply
┃ ➪ ${prefix}setwelcome
┃ ➪ ${prefix}setgoodbye
┃ ➪ ${prefix}welcome
┃ ➪ ${prefix}goodbye
┃ ➪ ${prefix}setting
┃ ➪ ${prefix}envlist
┃ ➪ ${prefix}autoreact
┃ ➪ ${prefix}statusview
┃ ➪ ${prefix}autoread
┃ ➪ ${prefix}alwaysonline
┃ ➪ ${prefix}autotyping
┃ ➪ ${prefix}autorecording
┃ ➪ ${prefix}autodl
┃ ➪ ${prefix}autosticker
┃ ➪ ${prefix}autoreply
┃ ➪ ${prefix}adminaction
┃ ➪ ${prefix}ownerreact
┃ ➪ ${prefix}reactemojis
┃ ➪ ${prefix}owneremoji
╰━━━━━━━━━━━`;

        // Combine Header, Hardcoded Menu, and Description
        let finalMenu = `${generateHeader(totalCommands)}\n\n${hardcodedMenu}\n\n> ${config.DESCRIPTION || ''}`;
        
        const localImagePath = path.join(__dirname, '../lib/iconicmd.jpg');

        // Send with Image if exists, otherwise send as Text
        if (fs.existsSync(localImagePath)) {
            await conn.sendMessage(from, {
                image: fs.readFileSync(localImagePath),
                caption: finalMenu,
                contextInfo: commonContextInfo(m.sender)
            }, { quoted: m });
        } else {
            await conn.sendMessage(from, { 
                text: finalMenu, 
                contextInfo: commonContextInfo(m.sender) 
            }, { quoted: m });
        }

    } catch (e) { 
        console.error("Menu Error:", e); 
        reply(`❌ Error:\n${e.message}`); 
    } 
});
