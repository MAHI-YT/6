
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
        if (!q) return reply("Please provide a Pakistani phone number.\nExample: `.simdata 03427582213` or `.simdata 923427582213`");

        // Clean and format the number to the 03xx... format
        let number = q.replace(/[^0-9]/g, '');
        
        // Convert 923xx format to 03xx
        if (number.startsWith('92')) {
            number = '0' + number.substring(2);
        }
        
        // Validate Pakistani number (must be 11 digits and start with 0)
        if (!number.startsWith('0') || number.length !== 11) {
            await react("❌");
            return reply("Invalid Pakistani number format.\nPlease use: 03427582213 or 923427582213");
        }

        const apiUrl = `https://fam-official.serv00.net/api/database.php?number=${number}`;
        
        // React to show the process has started
        await react("⏳");
        
        const { data } = await axios.get(apiUrl);

        // Check if the API call was successful
        if (!data.success) {
            await react("❌");
            return reply("Failed to fetch data. The number might not be in the database.");
        }

        // Check if the data array exists and has items
        if (!data.data || data.data.length === 0) {
            await react("❌");
            return reply("No information found for this number.");
        }

        // Format the response
        let responseMessage = `📱 *SIM DATA INFORMATION*\n\n`;
        responseMessage += `📞 *Number:* ${number}\n\n`;

        // Loop through each result in the data array
        data.data.forEach((entry, index) => {
            responseMessage += `--- *Result ${index + 1}* ---\n`;
            
            if (entry.name && entry.name.trim() !== '') {
                responseMessage += `👤 *Name:* ${entry.name}\n`;
            }
            if (entry.cnic && entry.cnic.trim() !== '') {
                responseMessage += `🪪 *CNIC:* ${entry.cnic}\n`;
            }
            if (entry.address && entry.address.trim() !== '') {
                responseMessage += `📍 *Address:* ${entry.address}\n`;
            }
            responseMessage += `\n`; // Add space between results
        });

        responseMessage += `💳 *Credit:* ${data.credit}`;

        await reply(responseMessage);
        await react("✅");

    } catch (e) {
        console.error("Error in SIM data command:", e);
        await react("❌");
        reply("An error occurred while fetching SIM data. Please try again later.");
    }
});
