
const { cmd } = require("../command");
const fs = require("fs");
const axios = require("axios");

cmd({
  pattern: "roast",
  alias: ["insult", "burn"],
  desc: "Generate a roast",
  category: "fun",
  filename: __filename
}, async (client, message, match) => {
  try {
    const response = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
    const roast = response.data.insult;

    const mentioned = message.mentionedJid?.[0];
    const target = mentioned ? `@${mentioned.split("@")[0]}` : "You";

    await client.sendMessage(message.from, {
      text: `🔥 *ROAST*\n\n${target}, ${roast}`,
      mentions: mentioned ? [mentioned] : []
    });

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});


/////////////////////////

cmd({
  pattern: "wouldyourather",
  alias: ["wyr", "rather", "would"],
  desc: "Would you rather game",
  category: "fun",
  filename: __filename
}, async (client, message, match) => {
  try {
    const response = await axios.get("https://would-you-rather-api.abaanshanid.repl.co/");
    const data = response.data;

    const result = `
╔═══════════════════════════╗
    🤔 *WOULD YOU RATHER*
╠═══════════════════════════╣

*Option A:* ${data.data.split(" or ")[0]}

       *OR*

*Option B:* ${data.data.split(" or ")[1]}

╚═══════════════════════════╝
_Reply with A or B!_
    `;

    await message.reply(result);

  } catch (error) {
    // Fallback questions
    const questions = [
      "Be able to fly OR Be invisible",
      "Have unlimited money OR Unlimited love",
      "Live in the past OR Live in the future",
      "Be famous OR Be rich",
      "Have no phone OR No internet"
    ];
    
    const random = questions[Math.floor(Math.random() * questions.length)];
    await message.reply(`🤔 *Would you rather:*\n\n${random.replace(" OR ", "\n\n*OR*\n\n")}`);
  }
});

 /////////////////////////////////////////

cmd({
  pattern: "iplookup",
  alias: ["ip", "ipinfo", "iptrack"],
  desc: "Get IP address information",
  category: "utility",
  filename: __filename
}, async (client, message, match) => {
  if (!match) {
    return await message.reply("⚠️ Provide an IP address!\n\nExample: `.ip 8.8.8.8`");
  }

  try {
    // ip-api.com (Free)
    const response = await axios.get(`http://ip-api.com/json/${match}?fields=66846719`);
    const data = response.data;

    if (data.status === "fail") {
      return await message.reply("❌ Invalid IP address!");
    }

    const result = `
╔═══════════════════════════╗
    🌐 *IP LOOKUP*
╠═══════════════════════════╣
┃ 📍 *IP:* ${data.query}
┃ 🌍 *Country:* ${data.country} ${data.countryCode}
┃ 🏙️ *City:* ${data.city}
┃ 📮 *ZIP:* ${data.zip}
┃ 🗺️ *Region:* ${data.regionName}
┃ ⏰ *Timezone:* ${data.timezone}
┃ 🏢 *ISP:* ${data.isp}
┃ 🔗 *AS:* ${data.as}
┃ 📡 *Mobile:* ${data.mobile ? "Yes" : "No"}
┃ 🛡️ *Proxy/VPN:* ${data.proxy ? "Yes" : "No"}
┃ 📌 *Coords:* ${data.lat}, ${data.lon}
╚═══════════════════════════╝
    `;

    await message.reply(result);

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});



///////////////////////////////



cmd({
  pattern: "earthquake",
  alias: ["eq", "quake", "seismic"],
  desc: "Get latest earthquake data",
  category: "info",
  filename: __filename
}, async (client, message, match) => {
  try {
    // USGS Earthquake API (Free)
    const response = await axios.get(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson"
    );

    const quakes = response.data.features.slice(0, 5);

    let result = `
╔═══════════════════════════╗
    🌍 *RECENT EARTHQUAKES*
╠═══════════════════════════╣
`;

    for (let quake of quakes) {
      const props = quake.properties;
      const time = new Date(props.time).toLocaleString();
      
      result += `
┃ 📍 *${props.place}*
┃ 💥 Magnitude: ${props.mag}
┃ ⏰ Time: ${time}
┃ 🔗 ${props.url}
╠═══════════════════════════╣`;
    }

    result += `
╚═══════════════════════════╝`;

    await message.reply(result);

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});



////////////////////////////////////////////

cmd({
  pattern: "crypto",
  alias: ["coin", "btc", "eth", "price"],
  desc: "Get cryptocurrency prices",
  category: "finance",
  filename: __filename
}, async (client, message, match) => {
  const coin = match?.toLowerCase() || "bitcoin";

  try {
    // CoinGecko API (Free, no key needed)
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coin}`
    );

    const data = response.data;
    const market = data.market_data;

    const result = `
╔═══════════════════════════╗
    💰 *${data.name.toUpperCase()}*
╠═══════════════════════════╣
┃ 🏷️ Symbol: ${data.symbol.toUpperCase()}
┃ 💵 Price (USD): $${market.current_price.usd.toLocaleString()}
┃ 💷 Price (PKR): Rs ${market.current_price.pkr?.toLocaleString() || "N/A"}
╠═══════════════════════════╣
┃ 📈 24h High: $${market.high_24h.usd.toLocaleString()}
┃ 📉 24h Low: $${market.low_24h.usd.toLocaleString()}
┃ 📊 24h Change: ${market.price_change_percentage_24h.toFixed(2)}%
╠═══════════════════════════╣
┃ 🏆 Market Rank: #${data.market_cap_rank}
┃ 💎 Market Cap: $${(market.market_cap.usd / 1e9).toFixed(2)}B
╚═══════════════════════════╝
    `;

    await message.reply(result);

  } catch (error) {
    await message.reply(`❌ Coin not found or error occurred!`);
  }
});






/////////////////////////////////////



let scheduledMessages = [];

cmd({
  pattern: "schedule",
  alias: ["sched", "timer", "remind"],
  desc: "Schedule a message",
  category: "utility",
  filename: __filename
}, async (client, message, match, { isAdmin, isGroup }) => {
  if (isGroup && !isAdmin) return await message.reply("❌ Admin only!");

  if (!match) {
    return await message.reply(`
⏰ *SCHEDULE MESSAGE*

*Usage:*
.schedule time|message

*Examples:*
.schedule 5m|Meeting starts now!
.schedule 1h|Reminder: Submit your work
.schedule 30s|Quick reminder

*Time formats:*
s = seconds, m = minutes, h = hours
    `);
  }

  const [timeStr, ...msgParts] = match.split("|");
  const schedMessage = msgParts.join("|").trim();

  if (!timeStr || !schedMessage) {
    return await message.reply("⚠️ Invalid format!");
  }

  // Parse time
  let ms = 0;
  const time = parseInt(timeStr);
  
  if (timeStr.includes("s")) ms = time * 1000;
  else if (timeStr.includes("m")) ms = time * 60 * 1000;
  else if (timeStr.includes("h")) ms = time * 60 * 60 * 1000;
  else ms = time * 1000; // Default seconds

  if (ms > 24 * 60 * 60 * 1000) {
    return await message.reply("⚠️ Maximum schedule time is 24 hours!");
  }

  const scheduleId = Date.now();
  
  scheduledMessages.push({
    id: scheduleId,
    chat: message.from,
    message: schedMessage,
    time: Date.now() + ms
  });

  setTimeout(async () => {
    try {
      await client.sendMessage(message.from, {
        text: `⏰ *SCHEDULED MESSAGE*\n\n${schedMessage}`
      });
    } catch (e) {
      console.log("Schedule error:", e);
    }
  }, ms);

  const executeTime = new Date(Date.now() + ms).toLocaleTimeString();
  
  await message.reply(`✅ *Message Scheduled!*\n\n⏰ Will be sent at: ${executeTime}\n📝 Message: ${schedMessage}`);
});







//////////////////////////////////////////




let confessionMode = {};

cmd({
  pattern: "confession",
  alias: ["confess", "anonymous"],
  desc: "Send anonymous confession to group",
  category: "fun",
  filename: __filename
}, async (client, message, match, { isGroup }) => {
  if (isGroup) {
    return await message.reply("⚠️ Send this command in my DM to confess anonymously!");
  }

  if (!match) {
    return await message.reply(`
📝 *ANONYMOUS CONFESSION*

*Usage:*
.confession groupJid|Your confession message

*Example:*
.confession 123456789-123456@g.us|I secretly like someone in this group

*How to get Group JID:*
Use .groupid in the group
    `);
  }

  const [groupJid, confessionText] = match.split("|");

  if (!groupJid || !confessionText) {
    return await message.reply("⚠️ Invalid format! Use: .confession groupJid|message");
  }

  try {
    await client.sendMessage(groupJid.trim(), {
      text: `
╔═══════════════════════════╗
    🎭 *ANONYMOUS CONFESSION*
╠═══════════════════════════╣

${confessionText.trim()}

╚═══════════════════════════╝
_Someone from this group confessed anonymously_
      `
    });

    await message.reply("✅ *Confession sent anonymously!*");

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});








///////////////////////


// Store message counts
let activityData = {};

// Message listener for tracking
const trackActivity = (from, sender) => {
  if (!activityData[from]) activityData[from] = {};
  if (!activityData[from][sender]) activityData[from][sender] = 0;
  activityData[from][sender]++;
};

cmd({
  pattern: "activity",
  alias: ["active", "mostactive", "topactive"],
  desc: "Show most active members",
  category: "group",
  filename: __filename
}, async (client, message, match, { isGroup }) => {
  if (!isGroup) return await message.reply("❌ Group only!");

  const groupActivity = activityData[message.from] || {};
  
  if (Object.keys(groupActivity).length === 0) {
    return await message.reply("⚠️ No activity data yet! Bot needs to track messages first.");
  }

  const sorted = Object.entries(groupActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let result = `
╔═══════════════════════════╗
    🏆 *MOST ACTIVE MEMBERS*
╠═══════════════════════════╣
`;

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  for (let i = 0; i < sorted.length; i++) {
    const [jid, count] = sorted[i];
    const number = jid.split("@")[0];
    result += `┃ ${medals[i]} @${number} - ${count} msgs\n`;
  }

  result += `╚═══════════════════════════╝`;

  await client.sendMessage(message.from, {
    text: result,
    mentions: sorted.map(([jid]) => jid)
  });
});

// Export tracker for use in main file
module.exports.trackActivity = trackActivity;






//////////////////////////////////////////////

cmd({
  pattern: "groupanalytics",
  alias: ["gstats", "groupstats", "analytics"],
  desc: "Show detailed group analytics",
  category: "group",
  filename: __filename
}, async (client, message, match, { isGroup, isAdmin }) => {
  if (!isGroup) return await message.reply("❌ Group only command!");
  if (!isAdmin) return await message.reply("❌ Admin only command!");

  await message.reply("📊 *Analyzing group...*");

  try {
    const groupMeta = await client.groupMetadata(message.from);
    const participants = groupMeta.participants;
    
    let admins = 0;
    let superAdmins = 0;
    let members = 0;
    let countryStats = {};
    
    for (let p of participants) {
      if (p.admin === "superadmin") superAdmins++;
      else if (p.admin === "admin") admins++;
      else members++;
      
      // Country detection from phone number
      const number = p.id.split("@")[0];
      let country = "Unknown";
      
      if (number.startsWith("92")) country = "🇵🇰 Pakistan";
      else if (number.startsWith("91")) country = "🇮🇳 India";
      else if (number.startsWith("1")) country = "🇺🇸 USA";
      else if (number.startsWith("44")) country = "🇬🇧 UK";
      else if (number.startsWith("971")) country = "🇦🇪 UAE";
      else if (number.startsWith("966")) country = "🇸🇦 Saudi";
      else if (number.startsWith("880")) country = "🇧🇩 Bangladesh";
      
      countryStats[country] = (countryStats[country] || 0) + 1;
    }

    // Sort countries by count
    const sortedCountries = Object.entries(countryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => `┃ ${country}: ${count}`)
      .join("\n");

    const createdDate = new Date(groupMeta.creation * 1000).toLocaleDateString();

    const result = `
╔═══════════════════════════╗
    📊 *GROUP ANALYTICS*
╠═══════════════════════════╣
┃ 📛 *Name:* ${groupMeta.subject}
┃ 📅 *Created:* ${createdDate}
┃ 👥 *Total Members:* ${participants.length}
╠═══════════════════════════╣
    👑 *HIERARCHY*
┃ 🔱 Super Admins: ${superAdmins}
┃ ⚜️ Admins: ${admins}
┃ 👤 Members: ${members}
╠═══════════════════════════╣
    🌍 *TOP COUNTRIES*
${sortedCountries}
╠═══════════════════════════╣
┃ 🔒 *Restricted:* ${groupMeta.restrict ? "Yes" : "No"}
┃ 📢 *Announce:* ${groupMeta.announce ? "Yes" : "No"}
╚═══════════════════════════╝
    `;

    await message.reply(result);

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});




////////////////////////////////

cmd({
  pattern: "carbon",
  alias: ["code", "codess", "codeimg"],
  desc: "Create beautiful code screenshot",
  category: "utility",
  filename: __filename
}, async (client, message, match) => {
  const code = match || (message.quoted?.text);
  
  if (!code) {
    return await message.reply("⚠️ Provide code!\n\nExample: `.carbon console.log('Hello')`");
  }

  try {
    const response = await axios.post("https://carbonara.solopov.dev/api/cook", {
      code: code,
      backgroundColor: "#1F1F1F",
      theme: "dracula",
      language: "auto",
      fontFamily: "Fira Code",
      fontSize: "14px",
      lineNumbers: true,
      paddingVertical: "50px",
      paddingHorizontal: "50px"
    }, {
      responseType: "arraybuffer"
    });

    await client.sendMessage(message.from, {
      image: Buffer.from(response.data),
      caption: "✅ *Code Screenshot Generated!*"
    });

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});















///////////////////////////////////////

cmd({
  pattern: "handwriting",
  alias: ["hw", "write", "texttohand"],
  desc: "Convert text to handwriting",
  category: "utility",
  filename: __filename
}, async (client, message, match) => {
  if (!match) {
    return await message.reply("⚠️ Provide text!\n\nExample: `.handwriting Hello World`");
  }

  try {
    // Using patorjk handwriting API
    const url = `https://api.patorjk.com/api/v1/handwriting?text=${encodeURIComponent(match)}&style=cursive`;
    
    // Alternative: Using text to handwriting API
    const apiUrl = `https://apis.xditya.me/write?text=${encodeURIComponent(match)}`;
    
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

    await client.sendMessage(message.from, {
      image: Buffer.from(response.data),
      caption: "✅ *Text converted to handwriting!*"
    });

  } catch (error) {
    await message.reply(`❌ Error: ${error.message}`);
  }
});

