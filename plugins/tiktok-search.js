// plugins/tiktoksearch.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "tiktoksearch",
    alias: ["tiktoks", "tiks"],
    react: "🔍",
    desc: "🔎 Search for TikTok videos",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ *Please provide a search query!*\n\nExample: `.tiktoksearch trending songs`");

        // ⏳ React - processing
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        await reply(`🔍 *Searching TikTok for:* ${q}`);

        const response = await fetch(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(q)}`);
        const data = await response.json();

        if (!data || !data.data || data.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ *No TikTok videos found for your query.*\nTry a different keyword.");
        }

        // Get up to 5 random results
        const results = data.data.slice(0, 5).sort(() => Math.random() - 0.5);
        
        let successCount = 0;
        
        for (const video of results) {
            try {
                const caption = `🎵 *${video.title || 'TikTok Video'}*\n\n👤 Author: ${video.author || 'Unknown'}\n⏱️ Duration: ${video.duration || "Unknown"}\n🔗 URL: ${video.link}\n\n_𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙸𝚌𝚘𝚗𝚒𝚌-𝙼𝚍-𝙱𝙾𝚃_`;

                if (video.nowm) {
                    await conn.sendMessage(from, {
                        video: { url: video.nowm },
                        caption: caption
                    }, { quoted: mek });
                    successCount++;
                    
                    // Small delay between sends
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (videoError) {
                console.error(`Error sending video ${video.title}:`, videoError);
                // Continue with next video
            }
        }

        if (successCount > 0) {
            // ✅ React - success
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            await reply("❌ *Failed to download any videos.*\nThe API might be temporarily unavailable.");
        }

    } catch (error) {
        console.error("Error in TikTokSearch command:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply("❌ *An error occurred while searching TikTok.*\nPlease try again later.");
    }
});
