// plugins/part2.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

// ==================== HELPER FUNCTIONS ====================

// 1. YouTube MP4 Converter Helper
const ytmp4Headers = { accept: "application/json", "content-type": "application/json", "user-agent": "Mozilla/5.0" };

const pollMp4 = async (statusUrl) => {
    const { data } = await axios.get(statusUrl, { headers: ytmp4Headers });
    if (data.status === "completed") return data;
    if (data.status === "failed") throw new Error("Conversion failed");
    await new Promise(r => setTimeout(r, 2000));
    return pollMp4(statusUrl);
};

async function convertYouTubeMp4(url, quality = "720p") {
    try {
        const { data: meta } = await axios.get("https://www.youtube.com/oembed", { params: { url, format: "json" } });
        const payload = { url, os: "android", output: { type: "video", format: "mp4", quality } };

        let initRes;
        try { 
            initRes = await axios.post("https://hub.ytconvert.org/api/download", payload, { headers: ytmp4Headers }); 
        } catch { 
            initRes = await axios.post("https://api.ytconvert.org/api/download", payload, { headers: ytmp4Headers }); 
        }

        if (!initRes.data?.statusUrl) throw new Error("No status URL received");
        const result = await pollMp4(initRes.data.statusUrl);

        return { status: true, title: meta.title, downloadUrl: result.downloadUrl };
    } catch (err) {
        return { status: false, message: err.message };
    }
}

// 2. Gemini API Helper
async function geminiScraper(query) {
    try {
        const apiUrl = "https://dxz-ai.vercel.app/api/gemini";
        const response = await axios.get(apiUrl, {
            params: { text: query },
            headers: { 
                "Accept": "application/json", 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
            },
            timeout: 30000,
        });
        return response.data;
    } catch (error) {
        console.error("API Fetch Error:", error.message);
        return null;
    }
}


// ==================== COMMANDS ====================

// 1. text2img
cmd({
    pattern: "text2img",
    alias: ["t2i"],
    desc: "Generate image from text",
    category: "ai",
    react: "🎨",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command, isCreator, isAdmins }) => {
    // Restricted photo-sending capabilities to admins and the creator only
    if (!isCreator && !isAdmins) {
        return await reply("❌ Photo-sending and image generation capabilities are restricted to admins only.");
    }

    if (!q) {
        return await reply(`❌ Please provide a prompt.\n📌 *Example:* ${prefix}${command} A beautiful landscape`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '🎨', key: m.key } });

        const apiUrl = `https://omegatech-api.dixonomega.tech/api/ai/magicstudio?prompt=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        const caption = `🎨 *IMAGE GENERATOR*\n\n✨ *Prompt:* ${q}\n\n> *POWERED BY ${config.BOT_NAME}* 🚀`;

        await conn.sendMessage(from, { image: buffer, caption: caption }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✔️', key: m.key } });
    } catch (error) {
        await conn.sendMessage(from, { react: { text: '✖️', key: m.key } });
        await reply(`⚠️ *Error:* Failed to generate image. The prompt might be too complex or the server is busy.`);
    }
});

// 2. powerbrain
cmd({
    pattern: "powerbrain",
    alias: ["pbai"],
    desc: "Chat with PowerBrain AI",
    category: "ai",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q) return reply(`❌ *Provide a prompt!*\n\n*Example:* ${prefix}${command} hi`);

    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        const apiUrl = `https://www.movanest.xyz/v2/powerbrainai?query=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.results) return reply("❌ Failed to get response from AI.");

        const aiReply = `🤖 *${config.BOT_NAME}*\n\n${data.results}`;
        await reply(aiReply);
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (error) {
        console.error("PowerBrain AI Error:", error);
        reply("❌ API error or timeout. Please try again later.");
    }
});

// 3. gemini (Using Config variables instead of hardcoded names)
cmd({
    pattern: "gemini",
    alias: ["ai"],
    desc: "Chat with AI",
    category: "ai",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q) return reply(`❌ Please provide a prompt!\n📌 Usage: *${prefix}${command} Hello*`);

    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        
        // Dynamic prompt using config
        const botName = config.BOT_NAME || "AI Bot";
        const ownerName = config.OWNER_NAME || "Owner";
        const identityPrompt = `[System: You are ${botName}, an AI assistant strictly created by ${ownerName}. You are currently utilizing the 3-flash-preview model. Answer the following query.]\n\nUser: ${q}`;
        
        const data = await geminiScraper(identityPrompt);

        if (!data || !data.ok || !data.message) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return reply("❌ AI is not responding at the moment. Please try again later.");
        }

        const aiReply = `🤖 *${botName}*\n\n${data.message.trim()}\n\n> *© Created by ${ownerName}*`;
        await reply(aiReply);
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (error) {
        console.error("Gemini Error:", error);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        reply("❌ An unexpected error occurred.");
    }
});

// 4. thumbnail
cmd({
    pattern: "thumbnail",
    alias: ["thumb"],
    desc: "Download YouTube Video Thumbnail",
    category: "downloader",
    react: "🖼️",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q) return await reply(`❌ Please provide a YouTube URL or Video ID!\n📌 Usage: ${prefix}${command} https://youtu.be/xyz...`);

    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        const apiUrl = `https://user7-abbas-thumb-55.deno.dev/?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || data.status !== 'success') {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return await reply("❌ Thumbnail not found. Please check the URL.");
        }

        const thumbUrl = data.thumbnails.maxres || data.thumbnails.hd || data.thumbnails.sd || data.thumbnails.default;
        const caption = `🖼️ *YOUTUBE THUMBNAIL*\n\n🆔 *Video ID:* ${data.videoId}\n✨ *Quality:* High Definition\n🔗 *Source:* YouTube\n\n> *POWERED BY ${config.BOT_NAME}* 🚀`;

        await conn.sendMessage(from, { image: { url: thumbUrl }, caption: caption }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        console.error("Thumbnail Error:", e);
        await conn.sendMessage(from, { react: { text: "⚠️", key: m.key } });
        reply(`⚠️ Error: ${e.message}`);
    }
});

// 5. ytmp3
cmd({
    pattern: "ytmp3",
    alias: ["ytmp3dl"],
    desc: "Download YouTube MP3",
    category: "downloader",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q) return reply(`❌ *Link ya Name provide karein.*\nExample: ${prefix}${command} faded`);

    let waitMsg = await conn.sendMessage(from, { text: `⏳ *Searching via YTMP3...*\n"${q}"` }, { quoted: mek });

    try {
        const apiUrl = `https://apis.xwolf.space/download/mp3?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.success || !data.downloadUrl) {
            return await conn.sendMessage(from, { text: "❌ *Result not found.*", edit: waitMsg.key });
        }

        const { title, downloadUrl, thumbnail, youtubeUrl } = data;
        await conn.sendMessage(from, { text: `✅ *Track Found!*\n🎵 ${title}\n⬇️ *Sending File...*`, edit: waitMsg.key });

        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `⚡ POWERED BY ${config.BOT_NAME}`,
                    thumbnailUrl: thumbnail,
                    sourceUrl: youtubeUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        console.error("YTMP3 Error:", e);
        await conn.sendMessage(from, { text: "❌ *API Error.*", edit: waitMsg.key });
    }
});

// 6. mp3
cmd({
    pattern: "mp3",
    alias: ["mp3dl"],
    desc: "Download MP3 High Quality",
    category: "downloader",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q) return reply(`❌ *Song ka naam ya Link to do!*\n\n📌 *Example:*\n${prefix}${command} new sad song`);

    let waitMsg = await conn.sendMessage(from, { text: `⏳ *Searching & Processing...*\n"${q}"` }, { quoted: mek });

    try {
        const apiUrl = `https://apis.xwolf.space/download/ytmp3?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.success || !data.downloadUrl) {
            return await conn.sendMessage(from, { text: "❌ *Error:* Song nahi mila ya API busy hai.", edit: waitMsg.key });
        }

        const { title, downloadUrl, thumbnail, youtubeUrl } = data;
        await conn.sendMessage(from, { text: `✅ *Song Found!*\n🎵 *Title:* ${title}\n⬇️ *Uploading Audio...*`, edit: waitMsg.key });

        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `⚡ POWERED BY ${config.BOT_NAME}`,
                    thumbnailUrl: thumbnail,
                    sourceUrl: youtubeUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        console.error("MP3 Error:", e);
        await conn.sendMessage(from, { text: "❌ *Critical Error:* Please try again later.", edit: waitMsg.key });
    }
});

// 7. insta4
cmd({
    pattern: "insta4",
    alias: ["instagram4"],
    desc: "Download Instagram Reels & Videos",
    category: "downloader",
    react: "⬇️",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Please provide an Instagram URL.\n📌 Example: .insta4 https://www.instagram.com/reel/xyz...");

    try {
        await reply("⏳ *Downloading from Instagram...*");
        const apiUrl = `https://api.giftedtech.co.ke/api/download/instadl?apikey=gifted&url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.success || !data.result || !data.result.download_url) {
            return reply("❌ Media nahi mili. Shayad account private hai ya link galat hai.");
        }

        await conn.sendMessage(from, { 
            video: { url: data.result.download_url }, 
            caption: `✅ *Downloaded via ${config.BOT_NAME}*` 
        }, { quoted: mek });

    } catch (e) {
        console.error("Instagram Error:", e);
        return reply("❌ Error fetching video.");
    }
});

// 8. gitclone
cmd({
    pattern: "gitclone",
    alias: ["clone"],
    desc: "Download GitHub repository as ZIP",
    category: "downloader",
    react: "📦",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, prefix, command }) => {
    if (!args[0]) return await reply(`❌ *GitHub link missing!*\n📌 Example: ${prefix}${command} https://github.com/XT-Abbas/ICONIC-MD`);
    if (!/github\.com/.test(args[0])) return await reply("⚠️ *Invalid GitHub link!*");

    try {
        const regex = /github\.com\/([^/]+)\/([^/]+)/;
        const match = args[0].match(regex);
        if (!match) throw new Error("Invalid URL");

        let [, user, repo] = match;
        repo = repo.replace(/\.git$/, ""); 

        const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
        await reply(`*⬇️ Downloading repository...*\n*Repo:* ${user}/${repo}`);

        const response = await axios.get(zipUrl, { 
            responseType: 'arraybuffer', 
            headers: { "User-Agent": "Mozilla/5.0" } 
        });
        
        const contentDisposition = response.headers['content-disposition'];
        let fileName = `${repo}.zip`;
        if (contentDisposition) {
            const fnMatch = contentDisposition.match(/filename=(.*)/);
            if (fnMatch) fileName = fnMatch[1].replace(/["']/g, ''); 
        }

        await conn.sendMessage(from, {
            document: response.data, 
            fileName: fileName,
            mimetype: 'application/zip',
            caption: `*📦 Repo:* ${user}/${repo}\n*🔗 Link:* ${args[0]}\n\n> *POWERED BY ${config.BOT_NAME}*`
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        await reply(`❌ Download failed. Make sure the repo is public.\n*Error Details:* ${e.message}`);
    }
});

// 9. github
cmd({
    pattern: "github",
    alias: ["ghinfo"],
    desc: "Get GitHub user profile details",
    category: "search",
    react: "👨‍💻",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, prefix, command }) => {
    if (!args[0]) return await reply(`❌ *Username missing!*\n\n📌 Example: ${prefix}${command} Mr-Abbas7`);
    
    const username = args[0];

    try {
        await reply("⏳ *Fetching GitHub profile details...*");
        const res = await axios.get(`https://api.github.com/users/${username}`);
        const data = res.data;

        const joinedDate = new Date(data.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        const userBio = data.bio ? data.bio : "No description provided by user.";
        const caption = `*👨‍💻 GITHUB USER INFO*\n\n` +
            `*👤 Name:* ${data.name || 'Not provided'}\n` +
            `*🔗 Username:* ${data.login}\n` +
            `*📝 Description:* ${userBio}\n` +
            `*👥 Followers:* ${data.followers}\n` +
            `*🫂 Following:* ${data.following}\n` +
            `*📦 Public Repos:* ${data.public_repos}\n` +
            `*📅 Joined:* ${joinedDate}\n\n` +
            `> *POWERED BY ${config.BOT_NAME}*`;

        await conn.sendMessage(from, { image: { url: data.avatar_url }, caption: caption }, { quoted: mek });
    } catch (e) {
        console.error(e);
        if (e.response && e.response.status === 404) {
            await reply("❌ *User not found!* Please check the GitHub username and try again.");
        } else {
            await reply("❌ *Error fetching details.* This could be due to a network issue or GitHub API limits.");
        }
    }
});

// 10. mp4
cmd({
    pattern: "mp4",
    alias: ["mp4dl"],
    desc: "Download YouTube Video",
    category: "downloader",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix, command }) => {
    if (!q || !q.includes('youtu')) return reply(`❌ Please provide a valid YouTube link!\n📌 Usage: *${prefix}${command} https://youtu.be/...*`);

    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });
        const result = await convertYouTubeMp4(q);

        if (!result.status || !result.downloadUrl) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return reply("❌ Failed to fetch video. Please check the link.");
        }

        await conn.sendMessage(from, {
            video: { url: result.downloadUrl },
            caption: `🎬 *Title:* ${result.title}\n\n> *© POWERED BY ${config.BOT_NAME}*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (error) {
        console.error("YTMP4 Error:", error);
        await conn.sendMessage(from, { react: { text: "⚠️", key: m.key } });
        reply(`⚠️ Error: ${error.message}`);
    }
});
