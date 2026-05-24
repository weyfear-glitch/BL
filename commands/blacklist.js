const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BLACKLIST_PATH = path.join(__dirname, '../data/blacklist.json');

function loadBlacklist() {
  return JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
}

function saveBlacklist(data) {
  fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(data, null, 2));
}

function sendLog(client, guildId, embed) {
  const config = require('../config.json');
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (logChannel) logChannel.send({ embeds: [embed] });
}

const blacklistAdd = {
  data: new SlashCommandBuilder()
    .setName('blacklist-add')
    .setDescription('Ajouter un utilisateur à la blacklist')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Utilisateur à blacklister').setRequired(true))
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du bannissement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('raison') || 'Aucune raison précisée';
    const bl = loadBlacklist();

    if (bl.find(e => e.id === target.id)) {
      return interaction.reply({ content: `⚠️ ${target.tag} est déjà blacklisté.`, ephemeral: true });
    }

    bl.push({ id: target.id, tag: target.tag, reason, addedBy: interaction.user.id, addedAt: Date.now() });
    saveBlacklist(bl);

    // Bannir immédiatement s'il est sur le serveur
    const member = interaction.guild.members.cache.get(target.id);
    if (member) {
      await member.ban({ reason: `[BLACKLIST] ${reason}` }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🚫 Utilisateur blacklisté')
      .addFields(
        { name: 'Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Par', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Raison', value: reason }
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    sendLog(client, interaction.guild.id, embed);
    await interaction.reply({ embeds: [embed] });
  }
};

const blacklistRemove = {
  data: new SlashCommandBuilder()
    .setName('blacklist-remove')
    .setDescription('Retirer un utilisateur de la blacklist')
    .addStringOption(opt =>
      opt.setName('userid').setDescription('ID de l\'utilisateur').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const userId = interaction.options.getString('userid');
    let bl = loadBlacklist();
    const entry = bl.find(e => e.id === userId);

    if (!entry) {
      return interaction.reply({ content: '⚠️ Cet utilisateur n\'est pas dans la blacklist.', ephemeral: true });
    }

    bl = bl.filter(e => e.id !== userId);
    saveBlacklist(bl);

    // Débannir du serveur
    await interaction.guild.members.unban(userId, 'Retiré de la blacklist').catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Utilisateur retiré de la blacklist')
      .addFields(
        { name: 'Utilisateur', value: `${entry.tag} (${entry.id})`, inline: true },
        { name: 'Par', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    sendLog(client, interaction.guild.id, embed);
    await interaction.reply({ embeds: [embed] });
  }
};

const blacklistList = {
  data: new SlashCommandBuilder()
    .setName('blacklist-list')
    .setDescription('Voir la liste des utilisateurs blacklistés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const bl = loadBlacklist();

    if (bl.length === 0) {
      return interaction.reply({ content: '✅ La blacklist est vide.', ephemeral: true });
    }

    const lines = bl.map((e, i) =>
      `**${i + 1}.** ${e.tag} (\`${e.id}\`)\n   └ ${e.reason}`
    );

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`🚫 Blacklist — ${bl.length} utilisateur(s)`)
      .setDescription(lines.join('\n\n').slice(0, 4096))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

module.exports = { commands: [blacklistAdd, blacklistRemove, blacklistList] };
