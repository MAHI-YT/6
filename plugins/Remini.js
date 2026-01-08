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
        const { data } = await axios.get(apiUrl);

        if (!data || !data.success) {
            await react("❌");
            return reply("Failed to fetch SIM data or number not found in database.");
        }

        // Check if data exists
        if (!data.data || Object.keys(data.data).length === 0) {
            await react("❌");
            return reply("No information found for this number in the database.");
        }

        // Format the response with actual data
        let response = `📱 *SIM DATA INFORMATION*\n\n`;
        response += `📞 *Number:* ${number}\n\n`;
        
        const simData = data.data;
        
        if (simData.name) response += `👤 *Name:* ${simData.name}\n`;
        if (simData.owner) response += `👤 *Owner Name:* ${simData.owner}\n`;
        if (simData.cnic) response += `🪪 *CNIC:* ${simData.cnic}\n`;
        if (simData.address) response += `📍 *Address:* ${simData.address}\n`;
        if (simData.city) response += `🏙️ *City:* ${simData.city}\n`;
        if (simData.network) response += `📡 *Network:* ${simData.network}\n`;
        
        // Add any other fields that might be present
        for (let key in simData) {
            if (!['name', 'owner', 'cnic', 'address', 'city', 'network'].includes(key)) {
                response += `${key}: ${simData[key]}\n`;
            }
        }
        
        response += `\n💳 *Credit:* ${data.credit || 'FAMOFC'}`;

        await reply(response);
        await react("✅");
    } catch (e) {
        console.error("Error in SIM data command:", e);
        await react("❌");
        reply("An error occurred while fetching SIM data. Please check the number and try again.");
    }
});
