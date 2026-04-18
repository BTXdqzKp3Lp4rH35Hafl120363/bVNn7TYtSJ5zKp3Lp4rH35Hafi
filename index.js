import crypto from 'crypto';
import config from './config.js';
import axios from 'axios';
import zlib from 'zlib';
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser, isJidBroadcast, getContentType, proto, isJidGroup, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, downloadContentFromMessage, generateForwardMessageContent, generateWAMessageFromContent, generateMessageID, jidDecode, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { sms, downloadMediaMessage, AntiDelete, AntiEdit, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage, getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, getWarning, addWarning, clearWarning, delay, lidToPhone, cleanPN, GroupEvents, loadSession, addConnectionFunctions } from './lib/index.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import * as waStickerFormatter from 'wa-sticker-formatter';
import util from 'util';
import * as fileType from 'file-type';
import bodyParser from 'body-parser';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { File } from 'megajs';
import express from 'express';
import { commands, cmd } from './command.js';

// ============================================================
// 🔇 ADVANCED JUNK LOGS BLOCKER & ANTI-CRASH SYSTEM
// ============================================================
process.on('uncaughtException', function (err) {
    let e = String(err);
    if (e.includes('conflict') || e.includes('not-authorized') || e.includes('Socket connection timeout') || e.includes('rate-overlimit') || e.includes('Connection Closed') || e.includes('Timed Out') || e.includes('Value not found') || e.includes('Bad MAC') || e.includes('Session error')) return;
});

process.on('unhandledRejection', function (err) {
    let e = String(err);
    if (e.includes('conflict') || e.includes('not-authorized') || e.includes('Socket connection timeout') || e.includes('rate-overlimit') || e.includes('Connection Closed') || e.includes('Timed Out') || e.includes('Value not found') || e.includes('Bad MAC') || e.includes('Session error')) return;
});

const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

function isJunkLog(msg) {
    if (!msg) return false;
    const stringMsg = String(msg);
    const junkKeywords = [
        'Closing session:', 'SessionEntry', 'chains:', 'baseKey:', 
        'ratchet', 'PreKey', 'b0 7b', 'using WA v', 
        'bad-session', 'statues@broadcast', 'history sync',
        'auth state', 'MaxListenersExceededWarning',
        'Removing old closed session', 'currentRatchet', 
        'ephemeralKeyPair', 'privKey', 'pubKey', 'baseKeyType', 
        'remoteIdentityKey', 'signedKeyId', 'buffer', '<Buffer',
        'lastRemoteEphemeralKey', 'previousCounter', 'rootKey',
        'pendingPreKey', 'Bad MAC', 'Session error', 'libsignal', 
        'queue_job', 'SessionCipher', 'decryptMessage'
    ];
    return junkKeywords.some(keyword => stringMsg.includes(keyword));
}

console.log = function(...args) { if (!isJunkLog(args.join(' '))) originalConsoleLog.apply(console, args); };
console.info = function(...args) { if (!isJunkLog(args.join(' '))) originalConsoleInfo.apply(console, args); };
console.warn = function(...args) { if (!isJunkLog(args.join(' '))) originalConsoleWarn.apply(console, args); };
console.error = function(...args) { if (!isJunkLog(args.join(' '))) originalConsoleError.apply(console, args); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ownerNumber = ['923009690171']; // Add your number here
const tempDir = path.join(os.tmpdir(), 'cache-temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const clearTempDir = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        for (const file of files) {
            fs.unlink(path.join(tempDir, file), err2 => {});
        }
    });
};

setInterval(clearTempDir, 5 * 60 * 1000); 

const app = express();
const port = process.env.PORT || 7860;
app.use(express.static(path.join(__dirname, 'lib')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'lib', 'abbas.html')); });
app.listen(port, () => console.log(`Server listening on port ${port}`));

const sessionDir = process.env.EXTERNAL_SESSION_DIR || path.join(__dirname, 'sessions');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

const newsletterJids = ['120363408401969787@newsletter'];
const emojis = ['❤️', '👍', '😮', '😎', '💀'];

function addNewsletterAndStatusHandler(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.key) return;
            const jid = msg.key.remoteJid;

            if (newsletterJids && newsletterJids.includes(jid)) {
                try {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    const messageId = msg.key?.id;
                    if (!messageId) return;
                    await sock.sendMessage(jid, { react: { text: randomEmoji, key: msg.key } }).catch(() => {});
                } catch (e) {}
                return;
            }

            if (jid === 'status@broadcast' && msg.key.fromMe && config.AUTO_STATUS_SEEN === 'true') {
                try {
                    let participant = msg.key.participant;
                    if (participant && participant.includes('@lid')) {
                        try {
                            const phone = await lidToPhone(sock, participant);
                            if (phone) participant = phone + '@s.whatsapp.net';
                        } catch (e) {}
                    }
                    const readKey = { ...msg.key, participant: participant };
                    await sock.readMessages([readKey]).catch(() => {});
                } catch (e) {}
                return;
            }
        } catch (e) {}
    });
}

function addAntiDeleteHandler(sock) {
    sock.ev.on('messages.update', async (updates) => {
        try {
            for (const update of updates) {
                if (update.update && update.update.message === null) {
                    await AntiDelete(sock, updates).catch(() => {});
                }
            }
        } catch (e) {}
    });
}

function addGroupEventsHandler(sock) {
    sock.ev.on('group-participants.update', async (event) => {
        try { await GroupEvents(sock, event); } catch (e) {}
    });
}

function addAntiCallHandler(sock) {
    sock.ev.on('call', async (calls) => {
        try {
            if (config.ANTI_CALL !== 'true') return;
            for (const call of calls) {
                if (call.status !== 'offer') continue;
                const callId = call.id;
                const caller = call.from;
                await sock.rejectCall(callId, caller).catch(() => {});
                await delay(1000);
                await sock.sendMessage(caller, { text: config.REJECT_MSG || `*🛑 [ 𝚂𝚈𝚂𝚃𝙴𝙼 𝙰𝙻𝙴𝚁𝚃 ]\n📞 𝙲𝚊𝚕𝚕 𝙽𝚘𝚝 𝙰𝚕𝚕𝚘𝚠𝚎𝚍 𝚘𝚗 ᴛʜɪs ɴᴜᴍʙᴇʀ.\n🚫 𝙿𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗 𝙳𝚎𝚗𝚒𝚎𝚍.*` }).catch(() => {});
            }
        } catch (e) {}
    });
}

function addMessageHandler(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            let msg = messages[0];
            if (!msg || !msg.message) return;

            if (Object.keys(msg.message).includes('messageContextInfo') && !msg.message.conversation) return;

            msg.message = getContentType(msg.message) === 'ephemeralMessage' ? msg.message.ephemeralMessage.message : msg.message;
            if (msg.message.viewOnceMessageV2) {
                msg.message = getContentType(msg.message) === 'viewOnceMessageV2' ? msg.message.viewOnceMessageV2.message : msg.message;
            }

            await Promise.all([saveMessage(msg).catch(() => {})]);

            const mtype = getContentType(msg.message);

            if (mtype === 'protocolMessage' && msg.message.protocolMessage?.editedMessage) {
                await AntiEdit(sock, msg).catch(() => {});
                return;
            }

            const m = sms(sock, msg);
            const remoteJid = msg.key.remoteJid;
            const isMedia = (m.message && m.message.imageMessage) ? true : false;
            const quoted = mtype == 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];

            const body = mtype === 'conversation' ? msg.message.conversation : mtype === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : mtype == 'imageMessage' && msg.message.imageMessage.caption ? msg.message.imageMessage.caption : mtype == 'videoMessage' && msg.message.videoMessage.caption ? msg.message.videoMessage.caption : '';

            const isCmd = body && body.startsWith(config.PREFIX);
            const command = isCmd ? body.slice(config.PREFIX.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body ? body.trim().split(/ +/).slice(1) : [];
            const q = args.join(' ');
            const text = args.join(' ');
            const isGroup = remoteJid.endsWith('@g.us');
            
            // 🔥 FIXED LOGIC: Flawless JID Normalization for proper Admin detection
            const rawSender = msg.key.participant ? msg.key.participant : msg.key.remoteJid;
            const sender = rawSender ? jidNormalizedUser(rawSender) : '';
            const botNumber2 = jidNormalizedUser(sock.user.id);

            let senderNumber = sender ? sender.split('@')[0] : '';
            if (sender && sender.includes('@lid')) {
                senderNumber = await lidToPhone(sock, sender).catch(() => sender.split('@')[0]);
            }

            const botNumber = botNumber2.split('@')[0];
            const pushname = msg.pushName || 'Sin Nombre';
            const isMe = botNumber.includes(senderNumber);
            const isOwner = ownerNumber.includes(senderNumber) || isMe;

            let groupName = '';
            let groupAdmins = [];
            let participants = [];
            let isBotAdmins = false;
            let isAdmins = false;

            if (isGroup) {
                const groupMetadata = await sock.groupMetadata(remoteJid).catch(() => { return null; });
                if (groupMetadata) {
                    groupName = groupMetadata.subject || '';
                    participants = groupMetadata.participants || [];
                    
                    // Normalize all admins fetched from group metadata to ensure safe matching
                    const rawGroupAdmins = await getGroupAdmins(participants);
                    groupAdmins = rawGroupAdmins.map(jid => jidNormalizedUser(jid));

                    isBotAdmins = groupAdmins.includes(botNumber2);
                    // 🔥 ALWAYS ADMIN LOGIC: Bot's own number or owner is strictly bypassed here.
                    isAdmins = groupAdmins.includes(sender) || sender === botNumber2 || isMe || isOwner;
                }
            }

            const reply = (textReply) => { sock.sendMessage(remoteJid, { text: textReply }, { quoted: msg }).catch(() => {}); };
            const react = (emoji) => { sock.sendMessage(remoteJid, { react: { text: emoji, key: msg.key } }).catch(() => {}); };

            if (isGroup && !isAdmins && isBotAdmins && body) {
                let textBody = body ? body.replace(/[\s\u200b-\u200d\uFEFF]/g, '').toLowerCase() : '';
                const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:whatsapp\.com\/channel\/|chat\.whatsapp\.com\/|wa\.me\/)/gi;
                
                if (textBody && linkRegex.test(textBody)) {
                    if (msg.key.fromMe || sender === botNumber2) return;
                    
                    if (config.ANTI_LINK === 'true') {
                        if (!isAdmins) {
                            await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                            await sock.sendMessage(remoteJid, { text: '*🚨 Removed* @' + senderNumber + ' *has been removed.*', mentions: [sender] }, { quoted: msg }).catch(() => {});
                            await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove').catch(() => {});
                        }
                    } else if (config.ANTI_LINK === 'warn') {
                        if (!isAdmins) {
                            let warnCount = addWarning(senderNumber);
                            if (warnCount === 1) {
                                await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                                await sock.sendMessage(remoteJid, { text: '*⚠️ WARNING (1/2)*\n@' + senderNumber + ' *Links are not allowed in this group*\n> *Next time you will be removed*', mentions: [sender] }, { quoted: msg }).catch(() => {});
                            } else if (warnCount >= 2) {
                                await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                                await sock.sendMessage(remoteJid, { text: '*⚠️ Links are not allowed in this group.*\n*Please* @' + senderNumber + ' *from the group for sharing Links (2 warnings reached)*', mentions: [sender] }, { quoted: msg }).catch(() => {});
                                await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove').catch(() => {});
                                clearWarning(senderNumber);
                            }
                        }
                    } else if (config.ANTI_LINK === 'delete') {
                        if (!isAdmins) {
                            await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                            await sock.sendMessage(remoteJid, { text: '*⚠️ Links are not allowed in this group.*\n @' + senderNumber + ' *take note.*', mentions: [sender] }, { quoted: msg }).catch(() => {});
                        }
                    }
                }
            }

            const SUDO = Array.isArray(config.SUDO) ? config.SUDO : config.SUDO ? config.SUDO.split(',').map(s => s.trim()) : [];
            let isCreator = false;
            if (sender) {
                let resolvedSender = sender.includes('@lid') ? await lidToPhone(sock, sender).catch(() => sender.split('@')[0]) + '@s.whatsapp.net' : sender;
                isCreator = [botNumber + '@s.whatsapp.net', botNumber2, config.OWNER_NUMBER + '@s.whatsapp.net', ...SUDO].includes(resolvedSender) || isOwner;
            }

            if (!isMedia && config.AUTO_REACT === 'true' && senderNumber !== botNumber) {
                if (config.REACT_EMOJIS && config.REACT_EMOJIS.length > 0) {
                    const randomEmoji = config.REACT_EMOJIS[Math.floor(Math.random() * config.REACT_EMOJIS.length)];
                    try { await m.react(randomEmoji); } catch (e) {}
                }
            }

            if (!isMedia && senderNumber === botNumber && config.OWNER_REACT === 'true') {
                if (config.OWNER_EMOJIS && config.OWNER_EMOJIS.length > 0) {
                    const randomEmoji = config.OWNER_EMOJIS[Math.floor(Math.random() * config.OWNER_EMOJIS.length)];
                    try { await m.react(randomEmoji); } catch (e) {}
                }
            }

            const BANNED = config.BANNED ? (Array.isArray(config.BANNED) ? config.BANNED : config.BANNED.split(',').map(b => b.trim())) : [];
            const isBanned = senderNumber && BANNED.some(b => b.includes(senderNumber));
            if (isBanned) return;

            const ownerJid = config.OWNER_NUMBER + '@s.whatsapp.net';
            const isSudo = senderNumber && SUDO.some(s => s.includes(senderNumber));
            const isRealOwner = sender === ownerJid || isMe || isSudo || isCreator;

            if (!isRealOwner && config.MODE === 'private') return;
            if (!isRealOwner && isGroup && config.MODE === 'inbox') return;
            if (!isRealOwner && !isGroup && config.MODE === 'groups') return;

            const cmdContext = {
                from: remoteJid,
                quoted: quoted,
                body: body,
                isCmd: isCmd,
                command: command,
                args: args,
                q: q,
                text: text,
                isGroup: isGroup,
                sender: sender,
                senderNumber: senderNumber,
                botNumber2: botNumber2,
                botNumber: botNumber,
                pushname: pushname,
                isMe: isMe,
                isCreator: isCreator,
                isRealOwner: isRealOwner,
                groupName: groupName,
                participants: participants,
                groupAdmins: groupAdmins,
                isBotAdmins: isBotAdmins,
                isAdmins: isAdmins,
                reply: reply,
                react: react
            };

            if (isCmd) {
                const cmdName = command;
                const cmdObj = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
                if (cmdObj) {
                    try {
                        if (cmdObj.react) { sock.sendMessage(remoteJid, { react: { text: cmdObj.react, key: msg.key } }).catch(() => {}); }
                        await cmdObj.function(sock, msg, m, cmdContext);
                    } catch (e) {}
                }
            }

            for (const cmdObj of commands) {
                if (body && cmdObj.on === 'body') {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                } else if (text && cmdObj.on === 'text') {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                } else if (cmdObj.on === 'image' || (cmdObj.on === 'photo' && mtype === 'imageMessage')) {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                } else if (cmdObj.on === 'sticker' && msg.message?.stickerMessage) {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                }
            }

        } catch (e) {}
    });
}

function addConnectionUpdateHandler(sock, saveCreds) {
    sock.ev.on('connection.update', async (update) => {
        try {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) console.log('[🔰] No session found! Please add SESSION_ID in config');
            
            if (connection === 'close') {
                if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    console.log('[🔰] Connection lost, reconnecting silently...');
                    setTimeout(() => { connectToWA(); }, 3000);
                } else {
                    console.log('[🔰] Connection closed permanently. Please generate new session.');
                }
            } else if (connection === 'open') {
                console.log('[🔰] ICONIC MD connected to WhatsApp ✅');
                
                const pluginsDir = path.join(__dirname, 'plugins');
                try {
                    const files = fs.readdirSync(pluginsDir);
                    for (const file of files) {
                        if (path.extname(file).toLowerCase() === '.js') {
                            await import(path.join(pluginsDir, file));
                        }
                    }
                    console.log('[🔰] Plugins loaded smoothly ✅');
                } catch (e) {}

                try {
                    await sleep(2000);
                    const imgPath = path.join(__dirname, 'lib/iconicmd.jpg');
                    if (fs.existsSync(imgPath)) {
                        const msgOptions = {
                            image: { url: imgPath },
                            caption: '┏━━━━━━━━━━━━┓\n┃ ⚡ *ICONIC MD IS ALIVE* ⚡ ┃\n┗━━━━━━━━━━━━┛\n\n  *Created by RAO ABBAS* 🤖\n\n ❏ *Prefix:* [ ' + config.PREFIX + ' ]\n ❏ *Channel:* https://whatsapp.com/channel/0029Vb7lx2gEquiMB6IE550l\n ❏ *GitHub:* https://github.com/XT-Abbas\n\n 🍁 *Owner:* ' + config.OWNER_NAME + '\n 🖤 *Enjoy Our Services!*',
                            contextInfo: { forwardingScore: 5, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363408401969787@newsletter', newsletterName: 'ICONIC MD', serverMessageId: 143 } }
                        };
                        await sock.sendMessage(sock.user.id.split(':')[0] + '@s.whatsapp.net', msgOptions, { disappearingMessagesInChat: true, ephemeralExpiration: 100 }).catch(()=>{});
                        console.log('ICONIC-MD IS ACTIVE AND RUNNING FLAWLESSLY ✅');
                    }
                } catch (e) {}
            }
        } catch (e) {}
    });
}

async function connectToWA() {
    console.log('[ 🟠 ] Connecting to WhatsApp');
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    
    const session = await loadSession(sessionDir, config);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    let sock = makeWASocket({
        logger: pino({ level: 'silent' }), 
        browser: Browsers.macOS('Safari'),
        syncFullHistory: false, 
        auth: state,
        version: version,
        getMessage: async (key) => { return { conversation: 'Bot was offline' }; }
    });

    await addConnectionFunctions(sock);
    addConnectionUpdateHandler(sock, saveCreds);
    sock.ev.on('creds.update', saveCreds);
    
    addAntiDeleteHandler(sock);
    addGroupEventsHandler(sock);
    addAntiCallHandler(sock);
    addNewsletterAndStatusHandler(sock);
    addMessageHandler(sock);
}

setTimeout(() => { connectToWA(); }, 4000);
