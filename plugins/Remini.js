
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

        if (!data) {
            await react("❌");
            return reply("Failed to fetch SIM data. Please try again later.");
        }

        // Format the response
        let response = `📱 *SIM DATA INFORMATION*\n\n`;
        response += `📞 *Number:* ${number}\n`;
        
        if (typeof data === 'object') {
            for (let key in data) {
                response += `${key}: ${data[key]}\n`;
            }
        } else {
            response += data;
        }

        await reply(response);
        await react("✅");
    } catch (e) {
        console.error("Error in SIM data command:", e);
        await react("❌");
        reply("An error occurred while fetching SIM data. Please check the number and try again.");
    }
});
