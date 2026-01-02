const { cmd } = require("../command");
// CORRECT IMPORT FOR JIMP 1.6.0 - Use destructuring
const { Jimp } = require("jimp");

cmd({
  pattern: "fixpp",
  alias: ["newpp"],
  react: "🖼️",
  desc: "Fixed version for Jimp 1.6.0",
  category: "tools",
  filename: __filename
}, async (client, message, match, { from, isCreator }) => {
  try {
    // Authorization
    const botJid = client.user?.id || (client.user.id.split(":")[0] + "@s.whatsapp.net");
    if (message.sender !== botJid && !isCreator) {
      return await client.sendMessage(from, {
        text: "*📛 This command can only be used by the bot or its owner.*"
      }, { quoted: message });
    }

    if (!message.quoted?.mtype?.includes("image")) {
      return await client.sendMessage(from, { 
        text: "*⚠️ Please reply to an image to set as profile picture*" 
      }, { quoted: message });
    }

    await client.sendMessage(from, { 
      text: "*⏳ Processing image, please wait...*" 
    }, { quoted: message });

    // Download image
    const imageBuffer = await message.quoted.download();
    
    // Process image - Use Jimp.read with destructured Jimp
    const image = await Jimp.read(imageBuffer);
    
    // Just resize to square (skip blur/composite for now)
    image.resize(640, Jimp.AUTO);
    
    // Get buffer
    const finalImage = await image.getBufferAsync(Jimp.MIME_JPEG);
    
    // Update profile
    await client.updateProfilePicture(botJid, finalImage);
    
    await client.sendMessage(from, { 
      text: "*✅ Bot's profile picture updated successfully!*" 
    }, { quoted: message });

  } catch (error) {
    console.error("fixpp Error:", error);
    await client.sendMessage(from, {
      text: `*❌ Error updating profile picture:*\n${error.message}\n\nTry: \`npm install jimp@latest\``
    }, { quoted: message });
  }
});
