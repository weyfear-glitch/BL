const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const nukeTracker = new Map();
async function getAuditExecutor(guild, actionType) {
  try {
    const logs = await guild.fetchAuditLogs({ type: actionType, limit: 1 });
    const entry = logs.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < 5000) {
      return entry.executor;
    }
  } catch {}
  return null;
}
async function handleNuke(guild, executor, type, client) {
  if (!executor || executor.bot) return;
  const config = require('../config.json');
  const member = guild.members.cache.get(executor.id) || await guild.members.fetch(executor.id).catch(() => null);
  if (!member) return;
  if (member.permissions.has('Administrator') && !member.user.bot) return;
  await member.ban({ reason: `[ANTI-NUKE] Suppression massive de ${type}` }).catch(console.error);
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: '💣 Anti-Nuke — Suppression de salons', iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
    .setTitle('Un membre a été banni automatiquement')
    .setDescription(`> **${executor.tag}** a déclenché la protection anti-nuke en supprimant massivement des salons.`)
    .addFields(
      { name: '👤 Exécutant', value: `<@${executor.id}>\n\`${executor.tag}\`\n\`${executor.id}\``, inline: true },
      { name: '🗑️ Type d\'action', value: `\`${type}\``, inline: true },
      { name: '🔨 Sanction', value: '`Banni du serveur`', inline: true },
      { name: '⏱️ Fenêtre de détection', value: '`10 secondes`', inline: true },
      { name: '📋 Raison', value: `\`[ANTI-NUKE] Suppression massive de ${type}\``, inline: false }
    )
    .setThumbnail(executor.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Anti-Nuke • ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
    .setTimestamp();
  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (logChannel) logChannel.send({ embeds: [embed] });
}
function track(userId, type, tracker) {
  if (!tracker.has(userId)) tracker.set(userId, { channelDeletes: [], roleDeletes: [] });
  const entry = tracker.get(userId);
  const now = Date.now();
  entry[type] = entry[type].filter(t => now - t < 10000);
  entry[type].push(now);
  return entry[type].length;
}
module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    const config = require('../config.json');
    const p = config.protection.antiNuke;
    if (!p.enabled) return;
    const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    if (!executor) return;
    const count = track(executor.id, 'channelDeletes', nukeTracker);
    if (count >= p.channelDeleteThreshold) {
      nukeTracker.delete(executor.id);
      await handleNuke(channel.guild, executor, 'Suppression de salons', client);
    }
  }
};
