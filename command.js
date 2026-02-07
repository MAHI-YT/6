// ============================================================
//  DARKZONE-MD Command Handler
//  Created By Irfan Ahmad
// ============================================================

const fs = require('fs');
const path = require('path');

const CMD_STATUS_PATH = path.join(__dirname, 'assets', 'cmdstatus.json');

var commands = [];

// ============================================================
//  LOAD / SAVE COMMAND STATUS
// ============================================================

function loadCmdStatus() {
    try {
        if (fs.existsSync(CMD_STATUS_PATH)) {
            return JSON.parse(fs.readFileSync(CMD_STATUS_PATH, 'utf-8'));
        }
    } catch (e) { }
    return { botEnabled: true, disabled: [] };
}

function saveCmdStatus(data) {
    try {
        const dir = path.dirname(CMD_STATUS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CMD_STATUS_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[CMD] Error saving status:', e.message);
    }
}

// ============================================================
//  REGISTER COMMAND
// ============================================================

function cmd(info, func) {
    var data = { ...info };
    data.function = func;
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!data.desc) data.desc = '';
    if (!data.fromMe) data.fromMe = false;
    if (!data.category) data.category = 'misc';
    if (!data.filename) data.filename = 'Not Provided';

    // Prevent duplicate command registration
    const existingIndex = commands.findIndex(c => c.pattern === data.pattern);
    if (existingIndex !== -1) {
        commands[existingIndex] = data;
    } else {
        commands.push(data);
    }
    return data;
}

// ============================================================
//  BOT MASTER SWITCH (on/off entire bot)
// ============================================================

function setBotStatus(enabled) {
    const status = loadCmdStatus();
    status.botEnabled = !!enabled;
    saveCmdStatus(status);
}

function getBotStatus() {
    return loadCmdStatus().botEnabled;
}

// ============================================================
//  INDIVIDUAL COMMAND TOGGLE (enable/disable specific commands)
// ============================================================

function setCmdEnabled(cmdName, enabled) {
    const status = loadCmdStatus();
    if (!status.disabled) status.disabled = [];
    const name = cmdName.toLowerCase().trim();

    if (enabled) {
        status.disabled = status.disabled.filter(c => c !== name);
    } else {
        if (!status.disabled.includes(name)) {
            status.disabled.push(name);
        }
    }
    saveCmdStatus(status);
}

function isCmdEnabled(cmdName) {
    const status = loadCmdStatus();
    if (!status.botEnabled) return false;
    if (!status.disabled || status.disabled.length === 0) return true;
    return !status.disabled.includes(cmdName.toLowerCase().trim());
}

function getDisabledCmds() {
    const status = loadCmdStatus();
    return status.disabled || [];
}

// ============================================================
//  EXPORTS
// ============================================================

module.exports = {
    cmd,
    AddCommand: cmd,
    Function: cmd,
    Module: cmd,
    commands,

    // Bot Master Switch
    setBotStatus,
    getBotStatus,

    // Individual Command Toggle
    setCmdEnabled,
    isCmdEnabled,
    getDisabledCmds,
};