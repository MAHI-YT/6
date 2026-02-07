// ============================================================
//  DARKZONE-MD Emoji Mix Utility
//  Created By Irfan Ahmad
// ============================================================

const axios = require('axios');

async function fetchEmix(emoji1, emoji2) {
    try {
        if (!emoji1 || !emoji2) {
            throw new Error('Please provide two emojis.');
        }

        const apiUrl = `https://levanter.onrender.com/emix?q=${encodeURIComponent(emoji1)},${encodeURIComponent(emoji2)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });

        if (response.data && response.data.result) {
            return response.data.result;
        }
        throw new Error('No valid image found.');
    } catch (error) {
        console.error('[Emix Error]:', error.message);
        throw new Error('Failed to fetch emoji mix.');
    }
}

module.exports = { fetchEmix };