const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const BLACKLIST_PATH = path.join(__dirname, '../data/blacklist.json');
const joinTracker = new Map();
module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const config = require('../config.json');
    const guild = member.guild;
    const blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
    const entry = blacklist.find(e => e.id === member.id);
    if (entry) {
      await member.ban({ reason: `[BLACKLIST] ${entry.reason}` }).catch(console.error);
      const embed = new EmbedBuilder()
        .setColor(0x992d22)
        .setAuthor({ name: '🚫 Blacklist — Ban automatique', iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTitle('Un utilisateur blacklisté a tenté de rejoindre')
        .setDescription(`> **${member.user.tag}** est présent sur la blacklist et a été banni automatiquement à son arrivée.`)
        .addFields(
          { name: '👤 Utilisateur', value: `<@${member.id}>\n\`${member.user.tag}\`\n\`${member.id}\``, inline: true },
          { name: '🔨 Sanction', value: '`Banni du serveur`', inline: true },
          { name: '📋 Raison', value: `\`${entry.reason}\``, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Blacklist • ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp();
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) logChannel.send({ embeds: [embed] });
      return; 
    }
    const p = config.protection.antiRaid;
    if (!p.enabled) return;
    const now = Date.now();
    const guildId = guild.id;
    if (!joinTracker.has(guildId)) {
      joinTracker.set(guildId, []);
    }
    const joins = joinTracker.get(guildId);
    const recent = joins.filter(t => now - t < p.joinWindow);
    recent.push(now);
    joinTracker.set(guildId, recent);
    if (recent.length >= p.joinThreshold) {
      if (p.action === 'kick') {
        await member.kick('[ANTI-RAID] Raid détecté').catch(() => {});
      } else if (p.action === 'ban') {
        await member.ban({ reason: '[ANTI-RAID] Raid détecté' }).catch(() => {});
      }
      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setAuthor({ name: '⚡ Anti-Raid — Raid détecté', iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTitle('Une vague de joins suspecte a été bloquée')
        .setDescription(`> **${recent.length}** membres ont rejoint en moins de **${p.joinWindow / 1000}s**, dépassant le seuil configuré.`)
        .addFields(
          { name: '👤 Cible', value: `<@${member.id}>\n\`${member.user.tag}\`\n\`${member.id}\``, inline: true },
          { name: '🔨 Sanction', value: p.action === 'kick' ? '`Kick`' : '`Ban`', inline: true },
          { name: '📊 Joins détectés', value: `\`${recent.length}\``, inline: true },
          { name: '⏱️ Fenêtre de temps', value: `\`${p.joinWindow / 1000} secondes\``, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Anti-Raid • ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp();
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) logChannel.send({ embeds: [embed] });
      joinTracker.set(guildId, []);
    }
  }
};
