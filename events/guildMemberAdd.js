const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BLACKLIST_PATH = path.join(__dirname, '../data/blacklist.json');

// État anti-raid : comptage des joins récents par serveur
const joinTracker = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const config = require('../config.json');
    const guild = member.guild;

    // ─── BLACKLIST ───────────────────────────────────────────
    const blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
    const entry = blacklist.find(e => e.id === member.id);

    if (entry) {
      await member.ban({ reason: `[BLACKLIST] ${entry.reason}` }).catch(console.error);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🚫 Utilisateur blacklisté banni automatiquement')
        .addFields(
          { name: 'Utilisateur', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Raison', value: entry.reason }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) logChannel.send({ embeds: [embed] });
      return; // Pas besoin de continuer
    }

    // ─── ANTI-RAID ───────────────────────────────────────────
    const p = config.protection.antiRaid;
    if (!p.enabled) return;

    const now = Date.now();
    const guildId = guild.id;

    if (!joinTracker.has(guildId)) {
      joinTracker.set(guildId, []);
    }

    const joins = joinTracker.get(guildId);

    // Nettoyer les vieux joins hors de la fenêtre
    const recent = joins.filter(t => now - t < p.joinWindow);
    recent.push(now);
    joinTracker.set(guildId, recent);

    if (recent.length >= p.joinThreshold) {
      // Déclencher l'action anti-raid
      if (p.action === 'kick') {
        await member.kick('[ANTI-RAID] Raid détecté').catch(() => {});
      } else if (p.action === 'ban') {
        await member.ban({ reason: '[ANTI-RAID] Raid détecté' }).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor(0xff6b00)
        .setTitle('⚡ Anti-Raid déclenché')
        .setDescription(`**${recent.length}** joins détectés en moins de **${p.joinWindow / 1000}s**`)
        .addFields(
          { name: 'Action', value: p.action === 'kick' ? 'Kick' : 'Ban', inline: true },
          { name: 'Cible', value: `${member.user.tag} (${member.id})`, inline: true }
        )
        .setTimestamp();

      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) logChannel.send({ embeds: [embed] });

      // Reset après raid détecté
      joinTracker.set(guildId, []);
    }
  }
};
