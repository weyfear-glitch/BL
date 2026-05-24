const { EmbedBuilder, AuditLogEvent } = require('discord.js');

// Tracker partagé pour les suppressions
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

function track(userId, tracker, windowMs) {
  if (!tracker.has(userId)) tracker.set(userId, []);
  const now = Date.now();
  const times = tracker.get(userId).filter(t => now - t < windowMs);
  times.push(now);
  tracker.set(userId, times);
  return times.length;
}

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    const config = require('../config.json');
    const p = config.protection.antiNuke;
    if (!p.enabled) return;

    const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleDelete);
    if (!executor || executor.bot) return;

    const member = role.guild.members.cache.get(executor.id)
      || await role.guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;
    if (member.permissions.has('Administrator')) return;

    const count = track(executor.id, nukeTracker, p.timeWindow);

    if (count >= p.roleDeleteThreshold) {
      nukeTracker.delete(executor.id);
      await member.ban({ reason: '[ANTI-NUKE] Suppression massive de rôles' }).catch(console.error);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('💣 Anti-Nuke déclenché — Suppression de rôles')
        .addFields(
          { name: 'Exécutant', value: `${executor.tag} (${executor.id})`, inline: true },
          { name: 'Rôles supprimés', value: String(count), inline: true },
          { name: 'Action', value: 'Banni du serveur' }
        )
        .setTimestamp();

      const logChannel = role.guild.channels.cache.get(config.logChannelId);
      if (logChannel) logChannel.send({ embeds: [embed] });
    }
  }
};
