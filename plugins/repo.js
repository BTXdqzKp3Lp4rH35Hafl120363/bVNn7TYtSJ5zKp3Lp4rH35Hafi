// plugins/repo.js - ESM Version
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to validate media URL and determine type
const getMediaType = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return null;
    }
    
    const urlLower = url.toLowerCase();
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (imageExtensions.some(ext => urlLower.endsWith(ext))) {
        return 'image';
    }
    
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.gif'];
    if (videoExtensions.some(ext => urlLower.endsWith(ext))) {
        return 'video';
    }
    
    return null;
};

cmd({
    pattern: "repo",
    alias: ["sc", "script", "repository"],
    desc: "Fetch information about a GitHub repository.",
    react: "📂",
    category: "main",
    filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
    const githubRepoURL = 'https://github.com/XT-Abbas/ICONIC-MD';

    try {
        await conn.sendPresenceUpdate('composing', from);
        
        const [, username, repoName] = githubRepoURL.match(/github\.com\/([^/]+)\/([^/]+)/);

        const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}`);
        const repoData = response.data;

        // 🔥 Pair removed
        const formattedInfo = `
╭─〔 *KHAN-MD REPOSITORY* 〕
│
├─ *📌 Repository Name:* ${repoData.name}
├─ *👑 Owner:* RAO ABBAS
├─ *⭐ Stars:* ${repoData.stargazers_count}
├─ *⑂ Forks:* ${repoData.forks_count}
├─ *📝 Description:* ${repoData.description || 'World Best WhatsApp Bot by RAO ABBS'}
│
├─ *🔗 GitHub Link:*
│   ${repoData.html_url}
│
├─ *🌐 Join Channel:*
│   https://whatsapp.com/channel/0029Vb7lx2gEquiMB6IE550l
│
╰─ *⚡ Powered by ICONIC-MD*
`.trim();

        let mediaData;
        const localImagePath = path.join(__dirname, '../lib/iconicmd.jpg');
        const mediaType = getMediaType(config.BOT_MEDIA_URL);
        
        if (mediaType === 'image' || mediaType === 'video') {
            try {
                await axios.head(config.BOT_MEDIA_URL, { timeout: 3000 });
                mediaData = { [mediaType]: { url: config.BOT_MEDIA_URL } };
            } catch {
                mediaData = { image: { url: localImagePath } };
            }
        } else {
            mediaData = { image: { url: localImagePath } };
        }

        await conn.sendMessage(from, {
            ...mediaData,
            caption: formattedInfo,
            contextInfo: { 
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363408401969787@newsletter',
                    newsletterName: config.BOT_NAME || 'ICONIC-MD',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error("Error in repo command:", error);
        reply("❌ Sorry, something went wrong while fetching the repository information. Please try again later.");
    }
});