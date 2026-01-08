
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "simdata",
    alias: ["checknum", "siminfo", "numinfo"],
    desc: "Check Pakistani SIM card data",
    category: "tools",
    react: "📱",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a Pakistani phone number.\nExample: `.simdata 923001234567` or `.simdata 03001234567`");

        // Clean and format the number
        let number = q.replace(/[^0-9]/g, '');
        
        // Convert 03xx format to 923xx
        if (number.startsWith('0')) {
            number = '92' + number.substring(1);
        }
        
        // Validate Pakistani number
        if (!number.startsWith('92') || number.length !== 12) {
            await react("❌");
            return reply("❌ Invalid Pakistani number format.\nPlease use: 923001234567 or 03001234567");
        }

        const apiUrl = `https://fam-official.serv00.net/api/database.php?number=${number}`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        // Check if request was successful
        if (!result.success) {
            await react("❌");
            return reply("❌ No data found for this number.");
        }

        // Check if data array exists and has records
        if (!result.data || result.data.length === 0) {
            await react("❌");
            return reply("❌ No information available for this number in database.");
        }

        // Build the message
        let message = `📱 *SIM DATA INFORMATION*\n\n`;
        message += `📞 *Phone Number:* ${number}\n`;
        message += `📊 *Total Records Found:* ${result.data.length}\n`;
        message += `${'─'.repeat(35)}\n\n`;

        // Loop through all records
        result.data.forEach((record, index) => {
            if (record.name || record.cnic || record.address) {
                message += `📋 *Record ${index + 1}:*\n\n`;
                
                if (record.name && record.name.trim()) {
                    message += `👤 *Name:* ${record.name}\n`;
                }
                
                if (record.cnic && record.cnic.trim()) {
                    message += `🪪 *CNIC:* ${record.cnic}\n`;
                }
                
                if (record.address && record.address.trim()) {
                    message += `📍 *Address:* ${record.address}\n`;
                }
                
                message += `\n`;
            }
        });

        message += `${'─'.repeat(35)}\n`;
        message += `💳 *Credit:* ${result.credit}\n`;
        message += `✅ *Status:* Success`;

        await reply(message);
        await react("✅");
        
    } catch (e) {
        console.error("Error in SIM data command:", e);
        await react("❌");
        return reply("❌ An error occurred while fetching SIM data.\n\n*Error:* " + e.message);
    }
});
