// plugins/part1.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const ffmpegPath = ffmpegInstaller.path;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== HELPER FUNCTIONS ====================

// 1. YouTube Helper Functions
function dxzExtractId(url) { 
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function dxzRequest(url, data) {
    return axios.post(url, data, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
            'Content-Type': 'application/json',
            origin: 'https://cnvmp3.com',
            referer: 'https://cnvmp3.com/v51'
        }
    });
}

async function dxzDownload(yturl) {
    const dxzYoutubeId = dxzExtractId(yturl);
    if (!dxzYoutubeId) throw new Error('Invalid YouTube URL');

    const dxzFormatValue = 1; 
    const dxzFinalQuality = 4;

    const dxzCheck = await dxzRequest('https://cnvmp3.com/check_database.php', {
        youtube_id: dxzYoutubeId, quality: dxzFinalQuality, formatValue: dxzFormatValue
    });

    if (dxzCheck.data && dxzCheck.data.success) {
        return { title: dxzCheck.data.title, download: dxzCheck.data.download_url };
    }

    const dxzInit = await dxzRequest('https://cnvmp3.com/init_download.php', {
        youtube_id: dxzYoutubeId, quality: dxzFinalQuality, formatValue: dxzFormatValue
    });

    if (!dxzInit.data || !dxzInit.data.success) throw new Error('Init failed');

    let dxzStatus = false;
    let dxzFinalLink = '';

    while (!dxzStatus) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const dxzProgress = await dxzRequest('https://cnvmp3.com/progress.php', { id: dxzInit.data.id });
        
        if (dxzProgress.data && dxzProgress.data.success && dxzProgress.data.download_url) {
            dxzStatus = true;
            dxzFinalLink = dxzProgress.data.download_url;
        }
    }

    return { title: dxzInit.data.title, download: dxzFinalLink };
}

// 2. TikTok Search Helper
async function tiktokSearchVideo(query) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await axios("https://tikwm.com/api/feed/search", {
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    cookie: "current_language=en",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K)",
                },
                data: { keywords: query, count: 10, cursor: 0, web: 1, hd: 1 },
                method: "POST",
            });
            resolve(res.data.data);
        } catch (err) {
            reject(err);
        }
    });
}

// 3. Google Image Helper
async function googleImage(query) {
    const params = new URLSearchParams({ q: query, tbm: "isch", safe: "off" });
    const response = await fetch(`https://www.google.com/search?${params.toString()}`, {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
    });

    if (!response.ok) throw new Error("Network issue");

    const data = await response.text();
    const $ = cheerio.load(data);
    const pattern = /\[1,\[0,"(?<id>[\d\w\-_]+)",\["https?:\/\/(?:[^"]+)",\d+,\d+\]\s?,\["(?<url>https?:\/\/(?:[^"]+))",\d+,\d+\]/gm;
    const matches = $.html().matchAll(pattern);
    
    const urlSet = new Set();
    for (const match of matches) {
        if (match.groups?.url) {
            const decodedUrl = decodeURIComponent(JSON.parse(`"${match.groups.url}"`));
            if (/.*\.(jpeg|jpg|png|gif|bmp)$/i.test(decodedUrl)) {
                urlSet.add(decodedUrl);
            }
        }
    }
    return Array.from(urlSet);
}


// ==================== COMMANDS ====================

// 1. ytmp4
cmd({
    pattern: "ytmp4",
    alias: ["ytv"],
    desc: "Download YouTube Video (MP4)",
    category: "download",
    react: "🎥",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q || !q.includes('youtu')) {
        return reply(`❌ *Bhai, YouTube ka link do!*\n\n*Example:* ${prefix}${command} https://youtu.be/bTY1wbPHmy0`);
    }
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        const apiUrl = `https://www.movanest.xyz/v2/ytmp4?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.result) return reply("❌ *Video fetch karne mein masla aa gaya. Link check karo.*");

        const res = data.result;
        const qualities = res.quality_list;
        const videoData = qualities['720p'] || Object.values(qualities)[0];

        if (!videoData || !videoData.url) return reply("❌ *Video ka direct download link nahi mila.*");

        const caption = `🎥 *YOUTUBE DOWNLOADER*\n\n> *Title:* ${res.title}\n> *Channel:* ${res.channel}\n> *Duration:* ${res.duration} seconds\n> *Quality:* ${videoData.resolution}\n\n> *POWERED BY ${config.BOT_NAME}*`;

        await conn.sendMessage(from, { video: { url: videoData.url }, caption: caption }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (error) {
        console.error("YTMP4 Plugin Error:", error);
        reply("❌ *Video download failed, please try again later.*");
    }
});

// 2. youtube2 (Audio download)
cmd({
    pattern: "youtube2",
    alias: ["ytaudio"],
    desc: "Download YouTube Audio",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q || !q.includes('youtu')) {
        return reply(`❌ Please provide a valid YouTube link!\n📌 Usage: *${prefix}${command} https://youtu.be/...*`);
    }
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        const result = await dxzDownload(q);

        if (!result || !result.download) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return reply("❌ Failed to fetch audio. Please check the link.");
        }

        await conn.sendMessage(from, {
            audio: { url: result.download },
            mimetype: 'audio/mpeg',
            ptt: false,
            caption: `🎵 *Title:* ${result.title}\n\n> *© POWERED BY ${config.BOT_NAME}*`
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        console.error("YouTube Error:", e);
        await conn.sendMessage(from, { react: { text: "⚠️", key: m.key } });
        reply(`⚠️ An error occurred: ${e.message}`);
    }
});

// 3. tiktok4 (Renamed due to conflict)
cmd({
    pattern: "tiktok4",
    alias: ["tt4"],
    desc: "Download TikTok Video without Watermark",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q) return await reply(`❌ Please provide a TikTok URL!\n📌 Usage: ${prefix}${command} https://vm.tiktok.com/xyz...`);
    if (!q.includes("tiktok.com")) return await reply("⚠️ Invalid URL! Please provide a valid TikTok link.");

    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
    try {
        const apiUrl = `https://user7-abbas-tikto-91.deno.dev/?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || data.status !== 'success' || !data.video) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return await reply("❌ Failed to fetch video. Possible reasons:\n- Private Video\n- Deleted Video\n- API Error");
        }

        await conn.sendMessage(from, { react: { text: "⬇️", key: m.key } });

        const caption = `\n🎵 *TIKTOK DOWNLOADER*\n\n👤 *Author:* ${data.author || "Unknown"}\n📝 *Title:* ${data.title || "No Title"}\n⏱️ *Duration:* ${data.duration || "N/A"}\n\n> *POWERED BY ${config.BOT_NAME}*\n`;

        await conn.sendMessage(from, { video: { url: data.video }, caption: caption, mimetype: "video/mp4" }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        console.error("TikTok Plugin Error:", e);
        await conn.sendMessage(from, { react: { text: "⚠️", key: m.key } });
        reply(`⚠️ An error occurred: ${e.message}`);
    }
});

// 6. tomp3
cmd({
    pattern: "tomp3",
    alias: ["video2mp3"],
    desc: "Convert Video to Audio (MP3)",
    category: "tools",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const mime = mek.quoted?.mtype || mek.quoted?.mimetype || '';
    if (!mek.quoted || !/video/.test(mime)) return reply("❌ Please reply to a video to convert it.");

    try {
        await reply("🎵 *Converting to MP3...*\nPlease wait a moment.");

        const randomName = Math.floor(Math.random() * 10000);
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const videoPath = path.join(tempDir, `${randomName}.mp4`);
        const audioPath = path.join(tempDir, `${randomName}.mp3`);

        // ICONIC-MD uses conn.downloadMediaMessage or mek.quoted.download()
        let buffer;
        try {
            buffer = await mek.quoted.download();
        } catch {
            buffer = await conn.downloadMediaMessage(mek.quoted);
        }
        
        fs.writeFileSync(videoPath, buffer);

        const cmdConvert = `"${ffmpegPath}" -i "${videoPath}" -vn -ab 128k -ar 44100 -f mp3 "${audioPath}"`;

        exec(cmdConvert, async (error) => {
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            if (error) return reply("❌ Error converting video.");

            await conn.sendMessage(from, { 
                audio: { url: audioPath }, 
                mimetype: 'audio/mp4', 
                fileName: `${config.BOT_NAME.replace(/\s+/g, '-')}-${randomName}.mp3`
            }, { quoted: mek });

            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        });

    } catch (e) {
        console.error(e);
        reply("❌ Failed to download or convert media.");
    }
});

// 7. tiktoksearch2 (Renamed due to conflict)
cmd({
    pattern: "tiktoksearch2",
    alias: ["ttsearch2"],
    desc: "Search and download TikTok video",
    category: "search",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Please provide a search query! \nExample: .tiktoksearch2 funny cats");

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        await reply("🔍 Searching TikTok...");
        
        const query = encodeURIComponent(q);
        const { data } = await axios.get(`https://api.giftedtech.co.ke/api/search/tiktoksearch?apikey=gifted&query=${query}`);

        if (data && data.success && data.results) {
            const result = data.results;
            const caption = `🎥 *TIKTOK SEARCH RESULT*\n\n📌 *Title:* ${result.title}\n🔗 *Music Link:* ${result.music}\n\n⚡ *POWERED BY ${config.BOT_NAME}*`;

            await conn.sendMessage(from, { video: { url: result.no_watermark }, caption: caption, gifPlayback: false }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ No results found or API error.");
        }
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        return reply("❌ Failed to fetch video. Please try again later.");
    }
});

// 8. stiktok
cmd({
    pattern: "stiktok",
    alias: ["searchtiktok"],
    desc: "Search for TikTok Videos",
    category: "search",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, q, command, reply }) => {
    if (!q) return reply(`⚠️ *Oops!* You forgot to provide a keyword!\n\n📌 Example:\n*.${command} funny cat*`);

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        let search = await tiktokSearchVideo(q);

        if (!search || !search.videos || search.videos.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ No videos found for this keyword.");
        }

        let firstVideo = search.videos[0];
        let teks = `🎥 *${firstVideo.title}*\n\n🆔 *ID:* ${firstVideo.video_id}\n👤 *User:* ${firstVideo.author.unique_id}\n⏱️ *Duration:* ${firstVideo.duration}s\n❤️ *Likes:* ${firstVideo.digg_count}\n💬 *Comments:* ${firstVideo.comment_count}\n🔁 *Shares:* ${firstVideo.share_count}\n\n`;

        teks += `⬇️ *Top 5 Results:*\n\n`;
        for (let i = 0; i < Math.min(5, search.videos.length); i++) {
            let v = search.videos[i];
            teks += `${i + 1}. 🎵 *${v.title}* (${v.duration}s)\n🔗 https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}\n`;
        }
        
        setTimeout(() => reply(teks), 1000);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
    } catch (error) {
        await conn.sendMessage(from, { react: { text: '⚠️', key: m.key } });
        reply("⚠️ Error fetching data from TikTok.");
    }
});



// 10. audio2
cmd({
    pattern: "audio2",
    alias: ["ytaudio2"],
    desc: "Download YouTube Audio",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q || !q.includes('youtu')) return reply(`❌ Please provide a valid YouTube link!\n📌 Usage: *${prefix}${command} https://youtu.be/...*`);

    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        const result = await dxzDownload(q);

        if (!result || !result.download) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return reply("❌ Failed to fetch audio. Please check the link.");
        }

        await conn.sendMessage(from, {
            audio: { url: result.download },
            mimetype: 'audio/mpeg',
            ptt: false,
            caption: `🎵 *Title:* ${result.title}\n\n> *© POWERED BY ${config.BOT_NAME}*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: "⚠️", key: m.key } });
        reply(`⚠️ An error occurred: ${e.message}`);
    }
});
