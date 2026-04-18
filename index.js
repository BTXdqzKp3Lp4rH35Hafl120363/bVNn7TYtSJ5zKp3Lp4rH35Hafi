import crypto from 'crypto';
import config from './config.js';
import axios from 'axios';
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser, isJidBroadcast, getContentType, proto, isJidGroup, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, downloadContentFromMessage, generateForwardMessageContent, generateWAMessageFromContent, generateMessageID, jidDecode, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { sms, downloadMediaMessage, AntiDelete, AntiEdit, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage, getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, getWarning, addWarning, clearWarning, delay, lidToPhone, cleanPN, GroupEvents, loadSession, addConnectionFunctions } from './lib/index.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import * as stickerFormatter from 'wa-sticker-formatter';
import util from 'util';
import * as fileType from 'file-type';
import bodyParser from 'body-parser';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { commands, cmd } from './command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ownerNumber = [config.OWNER_NUMBER || '923009690171'];
const prefix = config.PREFIX;
const tempDir = path.join(os.tmpdir(), 'cache-temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const clearTempDir = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            console.error('[ ❌ ] Error clearing temp directory', { 'Error': err.message });
            return;
        }
        for (const file of files) {
            fs.unlink(path.join(tempDir, file), err2 => {
                if (err2) console.error('[ ❌ ] Error deleting temp file', { 'File': file, 'Error': err2.message });
            });
        }
    });
};
setInterval(clearTempDir, 5 * 60 * 1000);

const app = express();
const port = process.env.PORT || 7860;

app.use(express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => {
    res.redirect('/abbas.html');
});
app.listen(port, () => console.log('Server running on port ' + port));

const newsletterJids = ['120363408401969787@newsletter', '120363425776996033@newsletter'];
const emojis = ['❤️', '👍', '😮', '😎', '💀'];

function addNewsletterAndStatusHandler(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.key) return;
            const remoteJid = msg.key.remoteJid;

            if (newsletterJids && newsletterJids.includes(remoteJid)) {
                try {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    const serverId = msg.key?.server_id;
                    if (!serverId) return;
                    await sock.newsletterReactMessage(remoteJid, serverId.toString(), randomEmoji).catch(() => {});
                } catch (e) { return; }
                return;
            }

            if (remoteJid === 'status@broadcast' && msg.key.fromMe && config.AUTO_STATUS_SEEN === 'true') {
                try {
                    let participant = msg.key.participant;
                    if (participant && participant.includes('lid')) {
                        try {
                            const phone = await lidToPhone(sock, participant);
                            if (phone) participant = phone + '@s.whatsapp.net';
                        } catch (e) {}
                    }
                    const updatedKey = { ...msg.key, participant: participant };
                    await sock.readMessages([updatedKey]).catch(() => {});
                } catch (e) { return; }
                return;
            }
        } catch (err) {}
    });
}

function addAntiDeleteHandler(sock) {
    sock.ev.on('messages.update', async updates => {
        try {
            for (const update of updates) {
                if (update.update && update.update.message === null) {
                    await AntiDelete(sock, updates).catch(err => {
                        if (err.message?.includes('rate-overlimit') || err.message?.includes('429')) return;
                        console.error('[ 🗑️ ] Anti-delete error:', err.message);
                    });
                }
            }
        } catch (err) {
            console.error('[ANTI-DELETE ERROR]', err);
        }
    });
}

function addGroupEventsHandler(sock) {
    sock.ev.on('group-participants.update', async event => {
        try {
            await GroupEvents(sock, event);
        } catch (err) {
            console.error('[👥] Group events error:', err.message);
        }
    });
}

function addAntiCallHandler(sock) {
    sock.ev.on('call', async calls => {
        try {
            if (config.ANTI_CALL !== 'true') return;
            for (const call of calls) {
                if (call.status !== 'offer') continue;
                const callId = call.id;
                const callerId = call.from;
                await sock.rejectCall(callId, callerId).catch(() => {});
                await delay(1000);
                await sock.sendMessage(callerId, { text: config.REJECT_MSG || '*📞 ᴄαℓℓ ɴσт αℓℓσωє∂ ιɴ тнιѕ ɴᴜмвєʀ уσυ ∂σɴт нανє ᴘєʀмιѕѕισɴ 📵*' }).catch(() => {});
            }
        } catch (err) {}
    });
}

function addMessageHandler(sock) {
    sock.ev.on('messages.upsert', async event => {
        try {
            let msg = event.messages[0];
            if (!msg || !msg.message) return;

            msg.message = getContentType(msg.message) === 'ephemeralMessage' ? msg.message.ephemeralMessage.message : msg.message;
            if (msg.message.viewOnceMessageV2) {
                msg.message = getContentType(msg.message) === 'ephemeralMessage' ? msg.message.ephemeralMessage.message.viewOnceMessageV2.message : msg.message.viewOnceMessageV2.message;
            }

            await Promise.all([saveMessage(msg).catch(() => {})]);

            const m = sms(sock, msg);
            const msgType = getContentType(msg.message);

            if (msgType === 'protocolMessage' && msg.message.protocolMessage?.type) {
                await AntiEdit(sock, msg).catch(err => {
                    console.error('[✏️] Anti-edit error:', err.message);
                });
                return;
            }

            const remoteJid = msg.key.remoteJid;
            const quotedMsg = msgType == 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
            const body = msgType === 'conversation' ? msg.message.conversation : msgType === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : msgType == 'imageMessage' && msg.message.imageMessage.caption ? msg.message.imageMessage.caption : msgType == 'videoMessage' && msg.message.videoMessage.caption ? msg.message.videoMessage.caption : '';

            const isCmd = body && body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
            const args = body ? body.trim().split(/ +/).slice(1) : [];
            const q = args.join('');
            const text = args.join(' ');
            const isGroup = remoteJid.endsWith('@g.us');
            const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
            const senderNumber = sender ? sender.split('@')[0] : '';
            const botNumber = sock.user.id.split(':')[0];
            const pushname = msg.pushName || 'Sin Nombre';
            const isMe = botNumber === senderNumber;
            const isRealOwner = ownerNumber.includes(senderNumber) || isMe;
            const botNumber2 = await jidNormalizedUser(sock.user.id);
            const fromMe = m.message && m.message.fromMe ? true : false;

            let groupName = '', groupAdmins = [], groupParticipants = [], isBotAdmins = false, isAdmins = false;

            if (isGroup) {
                const groupMetadata = await sock.groupMetadata(remoteJid).catch(() => { return null; });
                if (groupMetadata) {
                    groupName = groupMetadata.subject || '';
                    groupParticipants = groupMetadata.participants || [];
                    groupAdmins = await getGroupAdmins(groupParticipants);
                    isBotAdmins = groupAdmins.includes(botNumber2);
                    isAdmins = groupAdmins.includes(sender);
                }
            }

            const reply = (textReply) => {
                sock.sendMessage(remoteJid, { text: textReply }, { quoted: msg }).catch(() => {});
            };
            const react = (emoji) => {
                sock.sendMessage(remoteJid, { react: { text: emoji, key: msg.key } }).catch(() => {});
            };

            // Anti-Link Logic
            if (isGroup && !isAdmins && isBotAdmins && body) {
                let textBody = body ? body.replace(/[\s\u200b-\u200d\uFEFF]/g, '').toLowerCase() : '';
                const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:whatsapp\.com\/channel\/|chat\.whatsapp\.com\/|wa\.me\/)/gi;

                if (textBody && linkRegex.test(textBody)) {
                    if (msg.key.fromMe || sender === botNumber2) return;
                    if (config.ANTI_LINK === 'true') {
                        if (!isAdmins) {
                            await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                            await sock.sendMessage(remoteJid, { text: '*⚠️ Links are not allowed in this group.*\n> *You have been removed.*' }, { quoted: msg }).catch(() => {});
                            await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove').catch(() => {});
                        }
                    } else if (config.ANTI_LINK === 'warn') {
                        if (!isAdmins) {
                            let warnCount = addWarning(sender);
                            if (warnCount === 1) {
                                await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                                await sock.sendMessage(remoteJid, { text: '*⚠️ WARNING (1/2)*\n*Links are not allowed in this group*\n> *Next time you will be removed*' }, { quoted: msg }).catch(() => {});
                            } else if (warnCount >= 2) {
                                await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                                await sock.sendMessage(remoteJid, { text: '*🚨 You have been removed from the group for sharing Links (2 warnings reached)*' }, { quoted: msg }).catch(() => {});
                                await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove').catch(() => {});
                                clearWarning(sender);
                            }
                        }
                    } else if (config.ANTI_LINK === 'delete') {
                        if (!isAdmins) {
                            await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
                            await sock.sendMessage(remoteJid, { text: '*⚠️ Links are not allowed in this group.*\n*Please take note.*' }, { quoted: msg }).catch(() => {});
                        }
                    }
                }
            }

            const sudoUsers = Array.isArray(config.SUDO) ? config.SUDO : config.SUDO ? config.SUDO.split(',').map(v => v.toLowerCase()) : [];
            let isCreator = false;
            if (sender) {
                isCreator = [botNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net', botNumber2, ...sudoUsers].includes(sender);
            }

            if (!fromMe && config.AUTO_REACT === 'true' && senderNumber !== botNumber) {
                if (config.REACT_EMOJIS && config.REACT_EMOJIS.length > 0) {
                    const randomEmoji = config.REACT_EMOJIS[Math.floor(Math.random() * config.REACT_EMOJIS.length)];
                    try { await m.react(randomEmoji); } catch (err) {}
                }
            }

            if (!fromMe && senderNumber === botNumber && config.OWNER_REACT === 'true') {
                if (config.OWNER_EMOJIS && config.OWNER_EMOJIS.length > 0) {
                    const randomOwnerEmoji = config.OWNER_EMOJIS[Math.floor(Math.random() * config.OWNER_EMOJIS.length)];
                    try { await m.react(randomOwnerEmoji); } catch (err) {}
                }
            }

            const bannedUsers = config.BANNED ? Array.isArray(config.BANNED) ? config.BANNED : config.BANNED.split(',').map(v => v.trim()) : [];
            const isBanned = sender && bannedUsers.some(u => u.includes(sender));
            if (isBanned) return;

            const isSudo = sender && sudoUsers.some(u => u.includes(sender));
            const hasAccess = isMe || isSudo;

            if (!hasAccess && config.MODE === 'private') return;
            if (!hasAccess && isGroup && config.MODE === 'inbox') return;
            if (!hasAccess && !isGroup && config.MODE === 'groups') return;

            const cmdContext = {
                from: remoteJid, quoted: quotedMsg, body: body, isCmd: isCmd, command: command,
                args: args, q: q, text: text, isGroup: isGroup, sender: sender, senderNumber: senderNumber,
                botNumber2: botNumber2, botNumber: botNumber, pushname: pushname, isMe: isMe,
                isCreator: isCreator, isRealOwner: isRealOwner, groupName: groupName, participants: groupParticipants,
                groupAdmins: groupAdmins, isBotAdmins: isBotAdmins, isAdmins: isAdmins, reply: reply, react: react
            };

            if (isCmd) {
                const cmdName = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false;
                const matchedCmd = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
                
                if (matchedCmd) {
                    try {
                        if (matchedCmd.react) sock.sendMessage(remoteJid, { react: { text: matchedCmd.react, key: msg.key } }).catch(() => {});
                        await matchedCmd.function(sock, msg, m, cmdContext);
                    } catch (err) {
                        try { await reply('⚠️ Error: ' + (err.message || 'Command failed')); } catch (e) {}
                    }
                }
            }

            // Execute non-prefix or regex based commands
            for (const cmdObj of commands) {
                if (body && cmdObj.on === 'body') {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                } else if (msg.q && cmdObj.on === 'text') {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                } else if (cmdObj.on === 'image' || (cmdObj.on === 'photo' && msg.type === 'imageMessage')) {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                } else if (cmdObj.on === 'sticker' && msg.type === 'stickerMessage') {
                    try { await cmdObj.function(sock, msg, m, cmdContext); } catch (e) {}
                }
            }
        } catch (e) {}
    });
}

function addConnectionUpdateHandler(sock, saveCreds) {
    sock.ev.on('connection.update', async update => {
        try {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                const sessionPath = path.join(__dirname, 'sessions', 'creds.json');
                if (!fs.existsSync(sessionPath)) {
                    console.log('[🔰] No session found! Please add SESSION_ID in config');
                    console.log('[🔰] Get your session ID using pair site');
                }
            }
            if (connection === 'close') {
                if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    console.log('[🔰] Connection lost, reconnecting in 5 seconds...');
                    setTimeout(() => { connectToWA(); }, 5000);
                } else {
                    console.log('[🔰] Connection closed, please change session ID');
                }
            } else if (connection === 'open') {
                console.log('[🔰] ICONIC MD connected to WhatsApp ✅'); // Changed to Qadeer AI
                const pluginsDir = path.join(__dirname, 'plugins');
                try {
                    const pluginFiles = fs.readdirSync(pluginsDir);
                    for (const file of pluginFiles) {
                        if (path.extname(file).toLowerCase() === '.js') {
                            await import(path.join(pluginsDir, file));
                        }
                    }
                    console.log('[🔰] Plugins installed successfully ✅');
                } catch (err) {
                    console.error('[ ❌ ] Error loading plugins', { 'Error': err.message });
                }

                try {
                    await sleep(2000);
                    const imagePath = path.join(__dirname, 'lib/khanmd.jpg'); // You can rename this image file locally
                    if (fs.existsSync(imagePath)) {
                        const startupMsg = {
                            image: { url: imagePath },
                            caption: `╭─〔 *🤖 ICONIC MD IS ACTIVE ✅* 〕─\n├─▸ *Ultra Super Fast Powerfull ⚠️*\n│     *World Best BOT*\n*\n╰─➤ *Your Smart WhatsApp Bot is Ready To use 🍁!*\n\n- *🖤 Thank You for Choosing ICONIC MD!*\n\n╭──〔 🔗 *Information* 〕\n├─ 🧩 *Prefix:* = ${prefix}\n├─ 📢 *Creator:* RAO ABBAS\n╰─🚀 *Powered by ICONIC MD*`,
                            contextInfo: {
                                forwardingScore: 5,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363408401969787@newsletter',
                                    newsletterName: 'ICONIC MD',
                                    serverMessageId: 143
                                }
                            }
                        };
                        await sock.sendMessage(sock.user.id.split(':')[0] + '@s.whatsapp.net', startupMsg, { disappearingMessagesInChat: true, ephemeralExpiration: 100 });
                        console.log('[✅] Session loaded successfully');
                    }
                } catch (err) {
                    console.log('[🔰] Error sending messages:', err);
                }
            }
        } catch (err) {
            console.log('[CONNECTION HANDLER ERROR]', err);
        }
    });
}

async function connectToWA() {
    console.log('[ 🟠 ] Connecting to WhatsApp');
    const sessionDir = path.join(__dirname, 'sessions');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    const sessionLoaded = await loadSession(sessionDir, config);
    if (sessionLoaded) console.log('[✅] Session loaded successfully');

    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/sessions/');
    var { version } = await fetchLatestBaileysVersion();
    let sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Safari'),
        syncFullHistory: true,
        auth: state,
        version: version,
        getMessage: async () => ({})
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
