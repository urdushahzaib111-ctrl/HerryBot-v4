const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = "urdushahzaib111-ctrl";
const GITHUB_REPO = "HerryBot-v4";
const GITHUB_PATH = "keys.txt";

// Helper function to get raw content and SHA from GitHub API
async function getGitHubKeys() {
    if (!GITHUB_TOKEN) return { sha: null, content: "" };
    try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
        const headers = {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        const res = await axios.get(url, { headers });
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        return { sha: res.data.sha, content: content };
    } catch (e) {
        return { sha: null, content: "" };
    }
}

// Helper function to update GitHub keys.txt file
async function updateGitHubKeys(sha, contentString, commitMessage) {
    if (!GITHUB_TOKEN) return false;
    try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
        const headers = {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        const base64Content = Buffer.from(contentString).toString('base64');

        await axios.put(url, {
            message: commitMessage || "Auto Sync Keys",
            content: base64Content,
            sha: sha
        }, { headers });

        return true;
    } catch (e) {
        console.error("GitHub Sync Error:", e.response ? e.response.data : e.message);
        return false;
    }
}

async function getOrCreateUserKey(userId) {
    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 Days in Milliseconds

    let { sha, content } = await getGitHubKeys();
    let lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let activeRecords = [];
    let isFileModified = false;
    let existingUserRecord = null;

    // Process line-by-line & filter out expired keys
    for (let line of lines) {
        let parts = line.split('|');
        if (parts.length >= 2) {
            let key = parts[0].trim();
            let expiresAt = parseInt(parts[1].trim());
            let uid = parts[2] ? parts[2].trim() : null;

            // Check if key is still valid (Not expired)
            if (expiresAt > now) {
                activeRecords.push({ key, expiresAt, userId: uid });
                if (uid === userId) {
                    existingUserRecord = { key, expiresAt };
                }
            } else {
                // Key expired ho gayi hai, automatic drop ho jayegi
                isFileModified = true;
            }
        } else if (line.length > 0) {
            // Old simple text key handling fallback
            activeRecords.push({ key: line.trim(), expiresAt: now + THREE_DAYS_MS, userId: null });
        }
    }

    let finalKey = "";
    let finalExpiry = 0;
    let isNew = false;

    // Agar user ki already active key majood hai to wohi show karo
    if (existingUserRecord) {
        finalKey = existingUserRecord.key;
        finalExpiry = existingUserRecord.expiresAt;
        isNew = false;
    } else {
        // Nayi 3-day key generate karo
        let randomNum = Math.floor(10000 + Math.random() * 90000);
        finalKey = `Herry${randomNum}`;
        finalExpiry = now + THREE_DAYS_MS;
        isNew = true;

        activeRecords.push({ key: finalKey, expiresAt: finalExpiry, userId: userId });
        isFileModified = true;
    }

    // Agar key list update hui hai ya expired keys auto-remove hui hain, GitHub push karo
    if (isFileModified && sha) {
        let updatedLines = activeRecords.map(r => `${r.key}|${r.expiresAt}|${r.userId || ''}`);
        let newContentString = updatedLines.join('\n') + '\n';
        await updateGitHubKeys(sha, newContentString, `Update Keys (Auto Clean & Sync for User: ${userId})`);
    }

    // Remaining hours calculate karein display k liye
    let hoursLeftCalculated = Math.round((finalExpiry - now) / (1000 * 60 * 60));

    return {
        isNew: isNew,
        key: finalKey,
        hoursLeft: `${hoursLeftCalculated} Hours`,
        expiresAt: finalExpiry
    };
}

module.exports = { getOrCreateUserKey };
