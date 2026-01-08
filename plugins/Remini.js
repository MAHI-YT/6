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
            return reply("Invalid Pakistani number format.\nPlease use: 923001234567 or 03001234567");
        }

        const apiUrl = `https://fam-official.serv00.net/api/database.php?number=${number}`;
        const response = await axios.get(apiUrl);

        // Format the response
        let message = `📱 *SIM DATA INFORMATION*\n\n`;
        message += `📞 *Number:* ${number}\n\n`;
        
        if (response.data) {
            const result = response.data;
            
            // Check if success
            if (result.success === false) {
                await react("❌");
                return reply("Number not found in database.");
            }
            
            // Check for data object
            if (result.data && typeof result.data === 'object') {
                const info = result.data;
                
                if (info.name) message += `👤 *Name:* ${info.name}\n`;
                if (info.owner) message += `👤 *Owner:* ${info.owner}\n`;
                if (info.cnic) message += `🪪 *CNIC:* ${info.cnic}\n`;
                if (info.address) message += `📍 *Address:* ${info.address}\n`;
                if (info.city) message += `🏙️ *City:* ${info.city}\n`;
                if (info.network) message += `📡 *Network:* ${info.network}\n`;
            } else if (typeof result.data === 'string' && result.data.trim()) {
                message += `📋 *Data:*\n${result.data}\n`;
            }
            
            if (result.credit) message += `\n💳 *Credit:* ${result.credit}`;
            if (result.success) message += `\n✅ *Status:* Success`;
        }

        await reply(message);
        await react("✅");
        
    } catch (e) {
        console.error("Error in SIM data command:", e);
        await react("❌");
        return reply("An error occurred while fetching SIM data.\nError: " + e.message);
    }
});
