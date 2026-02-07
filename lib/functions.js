// ============================================================
//  DARKZONE-MD Utility Functions
//  Created By Irfan Ahmad
//  Merged functions.js + functions2.js into ONE clean file
// ============================================================

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// ============================================================
//  FETCH BUFFER FROM URL
// ============================================================
const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1,
            },
            ...options,
            responseType: 'arraybuffer',
            timeout: 30000,
        });
        return res.data;
    } catch (e) {
        console.error('[getBuffer Error]:', e.message);
        return null;
    }
};

// ============================================================
//  GET GROUP ADMINS
// ============================================================
const getGroupAdmins = (participants) => {
    const admins = [];
    for (const p of participants) {
        if (p.admin === 'admin' || p.admin === 'superadmin') {
            admins.push(p.id);
        }
    }
    return admins;
};

// ============================================================
//  RANDOM FILENAME GENERATOR
// ============================================================
const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

// ============================================================
//  FORMAT LARGE NUMBERS (1000 → 1K)
// ============================================================
const h2k = (num) => {
    const units = ['', 'K', 'M', 'B', 'T', 'P', 'E'];
    const mag = Math.floor(Math.log10(Math.abs(num)) / 3);
    if (mag === 0) return num.toString();
    const scale = Math.pow(10, mag * 3);
    const scaled = num / scale;
    const formatted = scaled.toFixed(1).replace(/\.0$/, '');
    return formatted + units[mag];
};

// ============================================================
//  CHECK IF STRING IS URL
// ============================================================
const isUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/gi
    );
};

// ============================================================
//  JSON STRINGIFY PRETTY
// ============================================================
const Json = (data) => {
    return JSON.stringify(data, null, 2);
};

// ============================================================
//  FORMAT UPTIME
// ============================================================
const runtime = (seconds) => {
    seconds = Math.floor(Number(seconds));
    const d = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const h = Math.floor(seconds / 3600);
    seconds %= 3600;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

// ============================================================
//  SLEEP / DELAY
// ============================================================
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

// ============================================================
//  FETCH JSON FROM URL
// ============================================================
const fetchJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            ...options,
            timeout: 30000,
        });
        return res.data;
    } catch (err) {
        console.error('[fetchJson Error]:', err.message);
        return null;
    }
};

// ============================================================
//  CDN UPLOAD (from functions2.js)
// ============================================================
const empiretourl = async (filePath) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('originalFileName', filePath.split('/').pop());

    try {
        const response = await axios.post('https://cdn.empiretech.biz.id/api/upload.php', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Upload Error: ${error.response.status}`);
        }
        throw new Error(`Upload Error: ${error.message}`);
    }
};

// ============================================================
//  SHANNZ CDN UPLOAD
// ============================================================
const shannzCdn = async (filePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    try {
        const response = await axios.post('https://endpoint.web.id/server/upload', form, {
            headers: form.getHeaders(),
            timeout: 60000,
        });
        return response.data;
    } catch (error) {
        return { error: error.message };
    }
};

// ============================================================
//  EXPORTS
// ============================================================
module.exports = {
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    empiretourl,
    shannzCdn,
};