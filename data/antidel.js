// ============================================================
//  DARKZONE-MD Anti-Delete Database
//  Created By Irfan Ahmad
//  FIXED: "|| true" logic bug — anti-delete can now be toggled
//  FIXED: getAllAntiDeleteSettings was exported but never defined
//  FIXED: Old migration code removed
// ============================================================

const { DATABASE } = require('../lib/database');
const { DataTypes } = require('sequelize');
const config = require('../config');

const AntiDelDB = DATABASE.define('AntiDelete', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
        defaultValue: 1,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: config.ANTI_DELETE === 'true', // FIXED: removed "|| true"
    },
}, {
    tableName: 'antidelete',
    timestamps: false,
    hooks: {
        beforeCreate: (record) => { record.id = 1; },
        beforeBulkCreate: (records) => { records.forEach(r => { r.id = 1; }); },
    },
});

let isInitialized = false;

// ============================================================
//  INITIALIZE
// ============================================================
async function initializeAntiDeleteSettings() {
    if (isInitialized) return;
    try {
        await AntiDelDB.sync();
        await AntiDelDB.findOrCreate({
            where: { id: 1 },
            defaults: {
                status: config.ANTI_DELETE === 'true',
            },
        });
        isInitialized = true;
        console.log('[✅] Anti-delete initialized');
    } catch (error) {
        console.error('[❌] Anti-delete init error:', error.message);
        // Try to recover
        try {
            await AntiDelDB.sync({ force: true });
            await AntiDelDB.create({
                id: 1,
                status: config.ANTI_DELETE === 'true',
            });
            isInitialized = true;
        } catch (e) {
            console.error('[❌] Anti-delete recovery failed:', e.message);
        }
    }
}

// ============================================================
//  SET ANTI-DELETE STATUS
// ============================================================
async function setAnti(status) {
    try {
        await initializeAntiDeleteSettings();
        const [affectedRows] = await AntiDelDB.update(
            { status: !!status },
            { where: { id: 1 } }
        );
        return affectedRows > 0;
    } catch (error) {
        console.error('[AntiDel Set Error]:', error.message);
        return false;
    }
}

// ============================================================
//  GET ANTI-DELETE STATUS
// ============================================================
async function getAnti() {
    try {
        await initializeAntiDeleteSettings();
        const record = await AntiDelDB.findByPk(1);
        return record ? record.status : config.ANTI_DELETE === 'true';
    } catch (error) {
        console.error('[AntiDel Get Error]:', error.message);
        return config.ANTI_DELETE === 'true';
    }
}

// ============================================================
//  GET ALL SETTINGS (was exported but never defined — NOW FIXED!)
// ============================================================
async function getAllAntiDeleteSettings() {
    try {
        await initializeAntiDeleteSettings();
        const record = await AntiDelDB.findByPk(1);
        return {
            status: record ? record.status : config.ANTI_DELETE === 'true',
            path: config.ANTI_DEL_PATH || 'same',
        };
    } catch (error) {
        console.error('[AntiDel GetAll Error]:', error.message);
        return {
            status: config.ANTI_DELETE === 'true',
            path: config.ANTI_DEL_PATH || 'same',
        };
    }
}

module.exports = {
    AntiDelDB,
    initializeAntiDeleteSettings,
    setAnti,
    getAnti,
    getAllAntiDeleteSettings,
};