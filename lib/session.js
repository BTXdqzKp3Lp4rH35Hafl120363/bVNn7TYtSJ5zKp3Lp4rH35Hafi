import fsSync from "fs";
import path from "path";
import zlib from 'zlib';

export async function loadSession(sessionDir, config) {
    try {
        if (!config.SESSION_ID) {
            console.log('No SESSION_ID provided - QR login will be generated');
            return false;
        }

        console.log('[⏳] CHECKING SESSION_ID FORMAT...');
        
        const credsPath = path.join(sessionDir, 'creds.json');
        
        // Only handle Base64 format (IK~)
        if (config.SESSION_ID.startsWith('AB~')) {
            console.log('🔁 DETECTED BASE64 SESSION FORMAT');
            const [header, b64data] = config.SESSION_ID.split('~');

            if (header !== "AB" || !b64data) {
                throw new Error("❌ Invalid Base64 session format. Expected 'AB~...'");
            }

            try {
                const cleanB64 = b64data.replace('...', '').trim();
                const compressedData = Buffer.from(cleanB64, 'base64');
                const decompressedData = zlib.gunzipSync(compressedData);
                
                // Write directly to creds.json
                fsSync.writeFileSync(credsPath, decompressedData);
                console.log("✅ Base64 Session written to file");
                return true;
            } catch (parseError) {
                console.error('❌ Failed to parse session data:', parseError.message);
                return false;
            }
        }
        
        console.log('❌ Unknown SESSION_ID format. Must start with AB~');
        return false;
        
    } catch (error) {
        console.error('❌ Error loading session:', error.message);
        return false;
    }
}

export default loadSession;
