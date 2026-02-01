const { cmd } = require("../command");

cmd({
  pattern: "post",
  alias: ["status", "story", "poststatus"],
  desc: "Post media or text to WhatsApp status",
  category: "utility",
  filename: __filename
}, async (client, message, match, { isCreator }) => {
  
  // Owner check
  if (!isCreator) {
    return await message.reply("*📛 This command is only for owner!*");
  }

  const quoted = message.quoted || message;

  // Get contacts list for status visibility
  const getStatusJidList = async () => {
    try {
      let jidList = [];
      
      // Get all group participants
      const groups = await client.groupFetchAllParticipating();
      for (let groupId in groups) {
        const participants = groups[groupId].participants;
        for (let p of participants) {
          if (!jidList.includes(p.id)) {
            jidList.push(p.id);
          }
        }
      }
      
      return jidList;
    } catch (error) {
      console.log("Error fetching contacts:", error);
      return [];
    }
  };

  // ═══════════════════════════════════════
  // 1️⃣ TEXT STATUS
  // ═══════════════════════════════════════
  if (!quoted.hasMedia) {
    const textContent = match || quoted.text;
    
    if (!textContent) {
      return await message.reply("⚠️ Please provide text or reply to a message!");
    }

    try {
      const jidList = await getStatusJidList();
      
      await client.sendMessage("status@broadcast", {
        text: textContent,
        backgroundColor: "#000000",
        font: 1
      }, {
        statusJidList: jidList
      });

      return await message.reply("✅ *Text status posted successfully!*");
    } catch (error) {
      console.log("Text Status Error:", error);
      return await message.reply(`❌ Failed to post text status!\n\n${error.message}`);
    }
  }

  // ═══════════════════════════════════════
  // 2️⃣ MEDIA STATUS (Image/Video/Audio)
  // ═══════════════════════════════════════
  if (quoted.hasMedia) {
    try {
      // Download media
      const media = await quoted.download();
      
      // Get caption (from quoted message or command text)
      const caption = quoted.caption || match || "";
      
      // Detect media type
      const mtype = quoted.mtype || quoted.type || "";
      
      // Get contacts for visibility
      const jidList = await getStatusJidList();
      
      let statusOptions = {
        statusJidList: jidList
      };

      let statusMessage = {};

      // ─────────────────────────────
      // 📷 IMAGE STATUS
      // ─────────────────────────────
      if (mtype.includes("image") || mtype.includes("Image")) {
        statusMessage = {
          image: media,
          caption: caption
        };
        
        await client.sendMessage("status@broadcast", statusMessage, statusOptions);
        return await message.reply("✅ *Image status posted successfully!*");
      }

      // ─────────────────────────────
      // 🎥 VIDEO STATUS
      // ─────────────────────────────
      if (mtype.includes("video") || mtype.includes("Video")) {
        statusMessage = {
          video: media,
          caption: caption
        };
        
        await client.sendMessage("status@broadcast", statusMessage, statusOptions);
        return await message.reply("✅ *Video status posted successfully!*");
      }

      // ─────────────────────────────
      // 🎵 AUDIO STATUS
      // ─────────────────────────────
      if (mtype.includes("audio") || mtype.includes("Audio")) {
        statusMessage = {
          audio: media,
          mimetype: "audio/mp4",
          ptt: false
        };
        
        await client.sendMessage("status@broadcast", statusMessage, statusOptions);
        return await message.reply("✅ *Audio status posted successfully!*");
      }

      // ─────────────────────────────
      // 📄 DOCUMENT/GIF STATUS
      // ─────────────────────────────
      if (mtype.includes("document") || mtype.includes("sticker")) {
        return await message.reply("⚠️ *Documents and stickers cannot be posted to status!*\n\nOnly image, video, and audio are supported.");
      }

      return await message.reply("⚠️ *Unknown media type!*");

    } catch (error) {
      console.log("Media Status Error:", error);
      return await message.reply(`❌ Failed to post media status!\n\n${error.message}`);
    }
  }

  return await message.reply(`
⚠️ *How to use this command:*

*Text Status:*
.post Hello World

*Image Status:*
Reply to an image with .post

*Video Status:*
Reply to a video with .post

*With Caption:*
Reply to media with .post Your caption here
  `);
});
