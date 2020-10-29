const axios = require("axios");
const config = require("../config.js");
const { registerBotCommand } = require("../botEngine.js");
const AWARD_POINT_REGEX = /<@!?(\d+)>\s?(\+\+|\u{2b50})/gu;

axios.defaults.headers.post['Authorization'] = `Token ${config.pointsbot.token}`

if (process.argv.includes('dev')) {
  return;
}

function getUserIdsFromMessage(text, regex) {
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null)
    matches.push(match[1].replace("!", ""));
  return matches;
}

registerBotCommand(
  /@!?(\d+)>\s?(\-\-)/,
  () =>
    "http://media.riffsy.com/images/636a97aa416ad674eb2b72d4a6e9ad6c/tenor.gif"
);

async function addPointsToUser(discord_id) {
  try {
    const pointsBotResponse = await axios.post(
      `https://theodinproject.com/api/points?discord_id=${discord_id}`
    );

    return pointsBotResponse.data;
  } catch (err) {
    throw new Error(err.message);
  }
}

async function lookUpUser(discord_id) {
  try {
    const pointsBotResponse = await axios.get(
      `https://theodinproject.com/api/points/${discord_id}`
    );
    return pointsBotResponse.data;
  } catch (err) {
    throw new Error(err.message);
  }
}

function exclamation(points) {
  if (points < 5) {
    return "Nice!";
  } else if (points < 25) {
    return "Sweet!";
  } else if (points < 99) {
    return "Woot!";
  } else if (points < 105) {
    return "HOLY CRAP!!";
  } else if (points > 199 && points < 206) {
    return "DAM SON:";
  } else if (points > 299 && points < 306) {
    return "OK YOU CAN STOP NOW:";
  } else {
    return "Woot!";
  }
}

function plural(points) {
  return points === 1 ? "point" : "points";
}

async function pointsBotCommand({ author, content, channel, client, guild }) {
  const userIds = getUserIdsFromMessage(content, AWARD_POINT_REGEX);
  userIds.forEach(async(userId, i) => {
    // this limits the number of calls per message to 5 to avoid abuse
    if (i > 4) {
      return
    }
    if (i == 4 ) {
      channel.send('you can only do 5 at a time..... ')
    }
    const user = await client.users.get(userId);
    if (user == author) {
      channel.send("http://media0.giphy.com/media/RddAJiGxTPQFa/200.gif");
      channel.send("You can't do that!");
      return;
    } else if (user === client.user) {
      channel.send("awwwww shucks... :heart_eyes:");
      return;
    }
    try {
      const pointsUser = await addPointsToUser(user.id);
      if (user) {
        const member = await guild.member(user)
        if (member && !member.roles.find(r => r.name==="club-40") && pointsUser.points > 39) {
          let pointsRole = guild.roles.find(r => r.name === "club-40")
          member.addRole(pointsRole)

          let clubChannel = client.channels.get('707225752608964628')
          if (clubChannel) {
            clubChannel.send(`HEYYY EVERYONE SAY HI TO ${user} the newest member of CLUB 40`)
          }
        }

        channel.send(
          `${exclamation(pointsUser.points)} ${user} now has ${
            pointsUser.points
          } ${plural(pointsUser.points)}`
        );
      }
    } catch (err) {}
  });
}

registerBotCommand(AWARD_POINT_REGEX, pointsBotCommand);

registerBotCommand(/\/points/, async function({
  content,
  client,
  channel,
  guild
}) {
  const userIds = getUserIdsFromMessage(content, /<@!?(\d+)>/g);
  userIds.forEach(async userId => {
    const user = await client.users.get(userId);
    try {
      const userPoints = await lookUpUser(user.id);
      const username = guild.members.get(userPoints.discord_id).displayName.replace(/\//g, "\\/");
      if (userPoints) {
        channel.send(`${username} has ${userPoints.points} points!`);
      }
    } catch (err) {}
  });
});

registerBotCommand(/\/leaderboard/, async function({ guild, content }) {
  try {
    const sEquals = content.split(" ").find(word => word.includes("start="));
    let start = sEquals ? sEquals.replace("start=", "") : 1;
    start = Math.max(start, 1);

    const nEquals = content.split(" ").find(word => word.includes("n="));
    let length = nEquals ? nEquals.replace("n=", "") : 5;
    length = Math.min(length, 25);
    length = Math.max(length, 1);

    const users = await axios.get(`https://theodinproject.com/api/points`);
    const data = users.data.filter(user => guild.members.get(user.discord_id));

    let usersList = "**leaderboard** \n";
    for (let i = (start-1); i < (length+start-1); i++) {
      const user = data[i];
      if (user) {
        const member = guild.members.get(user.discord_id);
        const username = member ? member.displayName.replace(/\//g, "\\/") : undefined;
        if (username) {
          if (i == 0) {
            usersList += `${i+1} - ${username} [${
              user.points
            } points] :tada: \n`;
          } else {
            usersList += `${i+1} - ${username} [${user.points} points] \n`;
          }
        } else {
          usersList += 'UNDEFINED \n'
        }
      }
    }
    return usersList;
  } catch (err) {
    console.log(err);
  }
});
