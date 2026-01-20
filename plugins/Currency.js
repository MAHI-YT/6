const { cmd } = require("../command");
const fs = require("fs");

// Safety Configuration
const DELAY = 2000; // 2 seconds delay between blocks to avoid ban

// ============ COMMAND 1: Save Group Members (VCF Generator) ============
cmd({
  pattern: "savemembers",
  alias: ["saveall", "vcfmembers"],
  desc: "Generate a contact file (VCF) for all group members",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner, isGroup }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    if (!isGroup) return await message.reply("*👥 This command can only be used in groups*");

    const groupMetadata = await client.groupMetadata(message.chat);
    const participants = groupMetadata.participants;
    
    await message.reply(`🔄 Processing ${participants.length} members...`);

    let vcfContent = "";
    let count = 1;
    const prefix = "DARK ZONE MD";

    for (let mem of participants) {
      const jid = mem.id;
      const number = jid.split("@")[0];
      
      // Create V-Card format
      vcfContent += `BEGIN:VCARD\n`;
      vcfContent += `VERSION:3.0\n`;
      vcfContent += `FN:${prefix} ${count}\n`;
      vcfContent += `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n`;
      vcfContent += `END:VCARD\n`;
      
      count++;
    }

    const fileName = `./${groupMetadata.subject}_contacts.vcf`;
    fs.writeFileSync(fileName, vcfContent);

    // Send the file to user's inbox
    await client.sendMessage(message.sender, {
      document: fs.readFileSync(fileName),
      mimetype: "text/vcard",
      fileName: `${groupMetadata.subject}_Contacts.vcf`,
      caption: `✅ *Contacts Generated*\n\n👥 Total: ${participants.length}\n📌 Prefix: ${prefix}\n\n*Instructions:* Open this file on your phone to save all contacts at once.`
    });

    await message.reply("✅ Contact file has been sent to your private inbox!");
    
    // Delete temp file
    fs.unlinkSync(fileName);

  } catch (error) {
    console.error(error);
    await message.reply("💢 Error generating contact file.");
  }
});

// ============ COMMAND 2: Block Strangers in Group ============
cmd({
  pattern: "blockstrangers",
  alias: ["blockall", "cleanmembers"],
  desc: "Block all group members who are not in contacts",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner, isGroup }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    if (!isGroup) return await message.reply("*👥 This command can only be used in groups*");

    const groupMetadata = await client.groupMetadata(message.chat);
    const participants = groupMetadata.participants;
    const botNumber = client.user.id.split(":")[0];
    const ownerNumber = message.sender.split("@")[0];

    await message.reply(`⚠️ *WARNING*\n\nStarting to block unknown members in this group. I will skip the Owner and Bot.`);

    let blockCount = 0;
    let skipCount = 0;

    for (let mem of participants) {
      const jid = mem.id;
      const number = jid.split("@")[0];

      // 1. Skip if it's the Bot itself
      if (number === botNumber) continue;

      // 2. Skip if it's the Owner
      if (number === ownerNumber) {
        skipCount++;
        continue;
      }

      // 3. Logic to check if contact is "Known"
      // Note: This works if the bot's store has the contact name
      const contact = client.contacts ? client.contacts[jid] : null;
      const isSaved = contact && (contact.name || contact.verify);

      if (isSaved) {
        skipCount++;
        console.log(`Skipping saved contact: ${number}`);
        continue;
      }

      // 4. Block the stranger
      try {
        await client.updateBlockStatus(jid, "block");
        blockCount++;
        console.log(`Blocked: ${number}`);
        
        // Anti-ban delay
        await new Promise(resolve => setTimeout(resolve, DELAY));
      } catch (err) {
        console.log(`Failed to block: ${number}`);
      }
    }

    await message.reply(
      `✅ *Operation Complete*\n\n` +
      `🚫 Blocked: ${blockCount} strangers\n` +
      `🛡️ Skipped: ${skipCount} (Owner/Saved Contacts)`
    );

  } catch (error) {
    console.error(error);
    await message.reply("💢 Error during block operation.");
  }
});
