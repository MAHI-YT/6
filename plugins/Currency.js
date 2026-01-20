const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");

// ===== Database Setup ===== //
const DB_FILE = path.join(__dirname, "../database/whitelist.json");

// Ensure database directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize whitelist database
function initWhitelist() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = { numbers: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveWhitelist(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getWhitelist() {
  return initWhitelist();
}

// Safety Configuration
const DELAY = 2000; // 2 seconds delay between blocks

// ============================================================ //
// COMMAND 1: SAVE GROUP MEMBERS AS VCF (Contact File)
// ============================================================ //
cmd({
  pattern: "savemembers",
  alias: ["saveall", "vcf", "getmembers", "exportmembers"],
  desc: "Save all group members as VCF contact file",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner, isGroup }) => {
  try {
    // Owner check
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    
    // Group check
    if (!isGroup) {
      return await message.reply(
        `*📌 Save Members Command*\n\n` +
        `*Usage:*\n` +
        `Use this command in a group:\n\n` +
        `➤ .savemembers\n` +
        `➤ .vcf\n\n` +
        `*Result:* Creates a VCF file with all members named as:\n` +
        `• DARK ZONE MD 1\n` +
        `• DARK ZONE MD 2\n` +
        `• etc...`
      );
    }

    // Get group metadata
    const groupMetadata = await client.groupMetadata(message.chat);
    const participants = groupMetadata.participants;
    const groupName = groupMetadata.subject.replace(/[^a-zA-Z0-9]/g, "_");

    await message.reply(`🔄 *Processing ${participants.length} members...*\n\nPlease wait...`);

    // Create VCF content
    let vcfContent = "";
    let count = 1;
    const prefix = "DARK ZONE MD";

    for (let member of participants) {
      const jid = member.id;
      const number = jid.split("@")[0];
      
      // Create vCard format
      vcfContent += `BEGIN:VCARD\n`;
      vcfContent += `VERSION:3.0\n`;
      vcfContent += `FN:${prefix} ${count}\n`;
      vcfContent += `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n`;
      vcfContent += `END:VCARD\n`;
      
      count++;
    }

    // Save temp file
    const fileName = `${groupName}_Contacts.vcf`;
    const filePath = `./${fileName}`;
    fs.writeFileSync(filePath, vcfContent);

    // Send to user's inbox (private chat)
    const userJid = message.sender;
    
    await client.sendMessage(userJid, {
      document: fs.readFileSync(filePath),
      mimetype: "text/vcard",
      fileName: fileName,
      caption: 
        `✅ *VCF File Generated Successfully!*\n\n` +
        `📁 *Group:* ${groupMetadata.subject}\n` +
        `👥 *Total Members:* ${participants.length}\n` +
        `🏷️ *Name Format:* DARK ZONE MD 1, 2, 3...\n\n` +
        `*How to Save:*\n` +
        `1. Download this file\n` +
        `2. Open with Contacts app\n` +
        `3. Import all contacts\n\n` +
        `_All contacts will be saved to your phone!_`
    });

    // Confirm in group
    await message.reply(
      `✅ *Contact File Sent!*\n\n` +
      `📥 Check your private inbox\n` +
      `👥 Total: ${participants.length} contacts\n\n` +
      `_File sent to your DM for privacy_`
    );

    // Delete temp file
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error("SaveMembers Error:", error);
    await message.reply(`💢 Error: ${error.message}`);
  }
});


// ============================================================ //
// COMMAND 2: BLOCK ALL STRANGERS (Unknown Numbers)
// ============================================================ //
cmd({
  pattern: "blockall",
  alias: ["blockstrangers", "blockgroup", "massblock"],
  desc: "Block all unknown members in group",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner, isGroup }) => {
  try {
    // Owner check
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    
    // Group check
    if (!isGroup) {
      return await message.reply(
        `*🚫 Block All Command*\n\n` +
        `*Usage:*\n` +
        `Use this command in a group:\n\n` +
        `➤ .blockall\n` +
        `➤ .blockstrangers\n\n` +
        `*What it does:*\n` +
        `• Blocks all UNKNOWN members\n` +
        `• Skips SAVED/Whitelisted numbers\n` +
        `• Skips Owner & Bot\n\n` +
        `*First add safe numbers:*\n` +
        `➤ .whitelist add 923001234567`
      );
    }

    // Get group info
    const groupMetadata = await client.groupMetadata(message.chat);
    const participants = groupMetadata.participants;
    const botNumber = client.user.id.split(":")[0];
    const ownerNumber = message.sender.split("@")[0];

    // Get whitelist (saved contacts)
    const whitelist = getWhitelist();
    const safeNumbers = whitelist.numbers;

    // Confirmation message
    await message.reply(
      `⚠️ *BLOCK OPERATION STARTING*\n\n` +
      `📊 Total Members: ${participants.length}\n` +
      `✅ Whitelisted: ${safeNumbers.length}\n\n` +
      `*Will Skip:*\n` +
      `• Bot Number\n` +
      `• Owner Number\n` +
      `• Whitelisted Numbers\n\n` +
      `🔄 Processing...`
    );

    let blockedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const blockedNumbers = [];
    const skippedNumbers = [];

    for (let member of participants) {
      const jid = member.id;
      const number = jid.split("@")[0];

      // Skip Bot
      if (number === botNumber) {
        skippedNumbers.push(`${number} (Bot)`);
        skippedCount++;
        continue;
      }

      // Skip Owner
      if (number === ownerNumber) {
        skippedNumbers.push(`${number} (Owner)`);
        skippedCount++;
        continue;
      }

      // Skip Whitelisted (Saved Contacts)
      if (safeNumbers.includes(number)) {
        skippedNumbers.push(`${number} (Saved)`);
        skippedCount++;
        continue;
      }

      // Block the stranger
      try {
        await client.updateBlockStatus(jid, "block");
        blockedNumbers.push(number);
        blockedCount++;
        
        // Progress update every 10
        if (blockedCount % 10 === 0) {
          await message.reply(`🔄 Blocked ${blockedCount} members...`);
        }

        // Anti-ban delay
        await new Promise(resolve => setTimeout(resolve, DELAY));
        
      } catch (err) {
        failedCount++;
        console.log(`Failed to block: ${number}`);
      }
    }

    // Final Report
    let report = 
      `✅ *BLOCK OPERATION COMPLETE*\n\n` +
      `🚫 *Blocked:* ${blockedCount}\n` +
      `✅ *Skipped:* ${skippedCount}\n` +
      `❌ *Failed:* ${failedCount}\n\n`;

    if (blockedNumbers.length > 0) {
      report += `*Blocked Numbers:*\n`;
      report += blockedNumbers.slice(0, 10).map(n => `• ${n}`).join('\n');
      if (blockedNumbers.length > 10) {
        report += `\n... +${blockedNumbers.length - 10} more`;
      }
    }

    if (skippedNumbers.length > 0) {
      report += `\n\n*Skipped Numbers:*\n`;
      report += skippedNumbers.slice(0, 5).map(n => `• ${n}`).join('\n');
      if (skippedNumbers.length > 5) {
        report += `\n... +${skippedNumbers.length - 5} more`;
      }
    }

    await message.reply(report);

  } catch (error) {
    console.error("BlockAll Error:", error);
    await message.reply(`💢 Error: ${error.message}`);
  }
});


// ============================================================ //
// COMMAND 3: MANAGE WHITELIST (Saved Contacts)
// ============================================================ //
cmd({
  pattern: "whitelist",
  alias: ["safelist", "wl", "savedcontacts"],
  desc: "Manage whitelist - numbers that won't be blocked",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");

    // Get input
    let input = "";
    if (typeof match === "string") {
      input = match.trim();
    } else if (Array.isArray(match)) {
      input = match.join(" ").trim();
    } else if (match && typeof match === "object") {
      input = match.text || "";
    }

    const whitelist = getWhitelist();

    // Show help if empty
    if (!input || input === "") {
      if (whitelist.numbers.length === 0) {
        return await message.reply(
          `*📋 Whitelist - Empty*\n\n` +
          `No saved contacts yet!\n\n` +
          `*Commands:*\n` +
          `➤ .whitelist add 923001234567\n` +
          `➤ .whitelist add 923001234567,923009876543\n` +
          `➤ .whitelist remove 923001234567\n` +
          `➤ .whitelist clear\n` +
          `➤ .whitelist import - Import from group\n\n` +
          `_Whitelisted numbers won't be blocked!_`
        );
      }
      
      return await message.reply(
        `*📋 Whitelist*\n\n` +
        `*Total Saved:* ${whitelist.numbers.length}\n\n` +
        `*Numbers:*\n` +
        whitelist.numbers.slice(0, 20).map((n, i) => `${i + 1}. ${n}`).join('\n') +
        (whitelist.numbers.length > 20 ? `\n... +${whitelist.numbers.length - 20} more` : '') +
        `\n\n*Commands:*\n` +
        `➤ .whitelist add <number>\n` +
        `➤ .whitelist remove <number>\n` +
        `➤ .whitelist clear`
      );
    }

    const parts = input.split(" ");
    const action = parts[0].toLowerCase();
    const numbers = parts.slice(1).join(" ");

    // ===== ADD Numbers ===== //
    if (action === "add" || action === "a" || action === "+") {
      if (!numbers) {
        return await message.reply(
          `*Usage:*\n` +
          `.whitelist add 923001234567\n` +
          `.whitelist add 923001234567,923009876543`
        );
      }

      const newNumbers = numbers
        .split(/[\s,]+/)
        .map(n => n.replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 10 && n.length <= 15);

      if (newNumbers.length === 0) {
        return await message.reply("❌ No valid numbers found!");
      }

      let addedCount = 0;
      for (const num of newNumbers) {
        if (!whitelist.numbers.includes(num)) {
          whitelist.numbers.push(num);
          addedCount++;
        }
      }

      saveWhitelist(whitelist);
      
      return await message.reply(
        `✅ *Added ${addedCount} number(s) to Whitelist*\n\n` +
        `New numbers:\n${newNumbers.map(n => `• ${n}`).join('\n')}\n\n` +
        `Total in whitelist: ${whitelist.numbers.length}`
      );
    }

    // ===== REMOVE Numbers ===== //
    if (action === "remove" || action === "rem" || action === "del" || action === "-") {
      if (!numbers) {
        return await message.reply(`*Usage:* .whitelist remove 923001234567`);
      }

      const numToRemove = numbers.replace(/[^0-9]/g, '');
      
      if (!whitelist.numbers.includes(numToRemove)) {
        return await message.reply(`❌ Number ${numToRemove} not in whitelist!`);
      }

      whitelist.numbers = whitelist.numbers.filter(n => n !== numToRemove);
      saveWhitelist(whitelist);
      
      return await message.reply(
        `✅ Removed: ${numToRemove}\n\n` +
        `Remaining: ${whitelist.numbers.length} numbers`
      );
    }

    // ===== CLEAR All ===== //
    if (action === "clear" || action === "reset") {
      const count = whitelist.numbers.length;
      whitelist.numbers = [];
      saveWhitelist(whitelist);
      return await message.reply(`🗑️ Cleared all ${count} numbers from whitelist!`);
    }

    // ===== IMPORT from current group ===== //
    if (action === "import" || action === "importgroup") {
      if (!message.isGroup) {
        return await message.reply("❌ Use this command in a group!");
      }

      const groupMetadata = await client.groupMetadata(message.chat);
      const participants = groupMetadata.participants;

      let addedCount = 0;
      for (let member of participants) {
        const number = member.id.split("@")[0];
        if (!whitelist.numbers.includes(number)) {
          whitelist.numbers.push(number);
          addedCount++;
        }
      }

      saveWhitelist(whitelist);
      
      return await message.reply(
        `✅ *Imported ${addedCount} numbers from group*\n\n` +
        `Total in whitelist: ${whitelist.numbers.length}\n\n` +
        `_All current group members are now safe from blocking!_`
      );
    }

    // Unknown action
    return await message.reply(
      `❓ Unknown action: ${action}\n\n` +
      `Use: add, remove, clear, import`
    );

  } catch (error) {
    console.error("Whitelist Error:", error);
    await message.reply(`💢 Error: ${error.message}`);
  }
});


// ============================================================ //
// COMMAND 4: UNBLOCK ALL
// ============================================================ //
cmd({
  pattern: "unblockall",
  alias: ["massunblock"],
  desc: "Unblock all blocked contacts",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");

    await message.reply("🔄 *Fetching blocked contacts...*");

    // Get blocked list
    const blockedList = await client.fetchBlocklist();

    if (blockedList.length === 0) {
      return await message.reply("✅ No blocked contacts found!");
    }

    await message.reply(`🔓 *Unblocking ${blockedList.length} contacts...*`);

    let unblockCount = 0;
    let failCount = 0;

    for (const jid of blockedList) {
      try {
        await client.updateBlockStatus(jid, "unblock");
        unblockCount++;

        // Progress every 10
        if (unblockCount % 10 === 0) {
          await message.reply(`🔓 Unblocked ${unblockCount}/${blockedList.length}...`);
        }

        // Delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        failCount++;
      }
    }

    await message.reply(
      `✅ *Unblock Complete*\n\n` +
      `🔓 Unblocked: ${unblockCount}\n` +
      `❌ Failed: ${failCount}`
    );

  } catch (error) {
    console.error("UnblockAll Error:", error);
    await message.reply(`💢 Error: ${error.message}`);
  }
});
