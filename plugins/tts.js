// plugins/tts.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js'; // Prefix aur Bot Name ke liye
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const ffmpegPath = ffmpegInstaller.path;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// COMMAND 1: tts (Urdu, Ghost, Girl)
// ==========================================
cmd({
    pattern: "tts",
    alias: ["voice"],
    desc: "Convert text to voice (Urdu, Ghost, Girl)",
    category: "tools",
    react: "🗣️",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    // Top pe prefix load kar liya taake 'undefined' na aaye
    const prefix = config.PREFIX || '.'; 
    const botName = config.BOT_NAME || 'ICONIC-MD';

    if (!args[0]) {
        return await reply(
            `╭───(    *${botName}* )───\n` +
            `├───≫ *TEXT TO SPEECH* ≪───\n` +
            `├ \n` +
            `├ *Usage:* ${prefix}tts <voice> <text>\n` +
            `├ *Voices:* urdu, ghost, girl\n` +
            `├ *Example 1:* ${prefix}tts urdu Hello how are you?\n` +
            `├ *Example 2:* ${prefix}tts Kya haal hai bhai\n` +
            `╰──────────────────☉`
        );
    }

    let voice = args[0].toLowerCase();
    let text = args.slice(1).join(' ');
    const validVoices = ['urdu', 'ghost', 'girl'];

    // Smart Logic: Default to 'ghost' if voice not specified
    if (!validVoices.includes(voice)) {
        text = args.join(' ');
        voice = 'ghost'; 
    } else if (!text) {
        return await reply(`❌ Please provide some text. Example: ${prefix}tts ${voice} hello there`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '🗣️', key: m.key } });

        // 1. Fetch Audio Buffer from your API
        const apiUrl = `https://mrabbas-abbas-voice-19.deno.dev/tts?voice=${voice}&text=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const rawBuffer = Buffer.from(response.data, 'binary');

        // 2. Temp File Setup
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const randomName = Math.floor(Math.random() * 100000);
        const inputPath = path.join(tempDir, `tts_in_${randomName}.mp3`);
        const outputPath = path.join(tempDir, `tts_out_${randomName}.ogg`);

        fs.writeFileSync(inputPath, rawBuffer);

        // 3. FFMPEG Conversion (Aapki working settings ke sath)
        const cmdConvert = `"${ffmpegPath}" -i "${inputPath}" -c:a libopus -b:a 48k -vbr on -compression_level 10 -frame_duration 20 -application voip "${outputPath}" -y`;

        exec(cmdConvert, async (error) => {
            if (error) {
                console.error("FFmpeg Error:", error);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                return await conn.sendMessage(from, {
                    audio: rawBuffer,
                    mimetype: 'audio/mpeg',
                    ptt: true
                }, { quoted: mek });
            }

            try {
                // Buffer mein read kar ke send karna (is se format kharab nahi hota)
                const finalBuffer = fs.readFileSync(outputPath);
                
                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                await conn.sendMessage(from, {
                    audio: finalBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                }, { quoted: mek });

            } catch (e) {
                console.error("Audio send error:", e);
                await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            } finally {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }
        });

    } catch (error) {
        console.error('TTS Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Failed to generate audio. API might be busy.`);
    }
});

// ==========================================
// COMMAND 2: tts2 (US & UK Voices)
// ==========================================
cmd({
    pattern: "tts2",
    alias: ["voice2"],
    desc: "Ultimate No-Login TTS (US & UK Voices)",
    category: "tools",
    react: "🗣️",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    const prefix = config.PREFIX || '.'; 
    const botName = config.BOT_NAME || 'ICONIC-MD';

    if (args.length < 2) {
        return await reply(
            `╭━━━『 *${botName} VOICE STUDIO* 』━━━\n` +
            `┃ \n` +
            `┃ 🗣️ *Usage:* ${prefix}tts2 <voice> <text>\n` +
            `┃\n` +
            `┣━━ 🇺🇸 *UNITED STATES*\n` +
            `┃ 1: ivy\n` +
            `┃ 2: kendra\n` +
            `┃ 3: justin\n` +
            `┃ 4: joey\n` +
            `┃ 5: matthew\n` +
            `┃ 6: salli\n` +
            `┃ 7: joanna\n` +
            `┃\n` +
            `┣━━ 🇬🇧 *UNITED KINGDOM*\n` +
            `┃ 1: brian\n` +
            `┃ 2: amy\n` +
            `┃ 3: emma\n` +
            `┃ 4: nicole\n` +
            `┃ 5: russell\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━☉`
        );
    }

    const voiceInput = args[0].toLowerCase();
    const text = args.slice(1).join(' ');

    const voices = {
        ivy: 'Ivy', kendra: 'Kendra', justin: 'Justin', joey: 'Joey', 
        matthew: 'Matthew', salli: 'Salli', joanna: 'Joanna',
        brian: 'Brian', amy: 'Amy', emma: 'Emma', nicole: 'Nicole', 
        russell: 'Russell'
    };

    const selectedVoice = voices[voiceInput];

    if (!selectedVoice) {
        return await reply(`❌ Voice *${voiceInput}* not found. Type \`${prefix}tts2\` to see available voices.`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '🗣️', key: m.key } });

        const payload = new URLSearchParams({
            msg: text,
            lang: selectedVoice,
            source: 'ttsmp3'
        });

        const userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36';

        const { data } = await axios.post('https://ttsmp3.com/makemp3_new.php', payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': userAgent,
                'Origin': 'https://ttsmp3.com',
                'Referer': 'https://ttsmp3.com/ai'
            }
        });

        if (data.Error === 1 || !data.MP3) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ Failed to generate audio. The text might be too long or server is busy.");
        }

        const audioUrl = `https://ttsmp3.com/created_mp3/${data.MP3}`;
        const mp3Res = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const rawBuffer = Buffer.from(mp3Res.data, 'binary');

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const randomName = Math.floor(Math.random() * 100000);
        const inputPath = path.join(tempDir, `tts2_in_${randomName}.mp3`);
        const outputPath = path.join(tempDir, `tts2_out_${randomName}.ogg`); 

        fs.writeFileSync(inputPath, rawBuffer);

        // FFMPEG command matching your working configuration
        const cmdConvert = `"${ffmpegPath}" -i "${inputPath}" -c:a libopus -b:a 48k -vbr on -compression_level 10 -frame_duration 20 -application voip "${outputPath}" -y`;

        exec(cmdConvert, async (error) => {
            if (error) {
                console.error("FFmpeg TTS2 Error:", error);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                return await conn.sendMessage(from, {
                    audio: rawBuffer,
                    mimetype: 'audio/mpeg',
                    ptt: true
                }, { quoted: mek });
            }

            try {
                // Read from file directly to buffer
                const finalBuffer = fs.readFileSync(outputPath);
                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                
                await conn.sendMessage(from, {
                    audio: finalBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                }, { quoted: mek });

            } catch (e) {
                console.error("Audio send error:", e);
                await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            } finally {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }
        });

    } catch (error) {
        console.error('TTSMP3 Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply('❌ Connection Error. The website might be down.');
    }
});
