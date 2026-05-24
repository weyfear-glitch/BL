const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const protectStatus = {
  data: new SlashCommandBuilder()
    .setName('protect-status')
    .setDescription('Afficher le statut des protections du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadConfig();
    const p = config.protection;

    const status = (enabled) => enabled ? '🟢 Activé' : '🔴 Désactivé';

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🛡️ Statut des protections')
      .addFields(
        {
          name: '⚡ Anti-Raid',
          value: `${status(p.antiRaid.enabled)}\nSeuil : **${p.antiRaid.joinThreshold}** joins en **${p.antiRaid.joinWindow / 1000}s**\nAction : **${p.antiRaid.action}**`,
          inline: true
        },
        {
          name: '💣 Anti-Nuke',
          value: `${status(p.antiNuke.enabled)}\nSeuil salons : **${p.antiNuke.channelDeleteThreshold}** en **${p.antiNuke.timeWindow / 1000}s**\nSeuil rôles : **${p.antiNuke.roleDeleteThreshold}**`,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

const protectToggle = {
  data: new SlashCommandBuilder()
    .setName('protect-toggle')
    .setDescription('Activer/désactiver une protection')
    .addStringOption(opt =>
      opt.setName('module')
        .setDescription('Module à modifier')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Raid', value: 'antiRaid' },
          { name: 'Anti-Nuke', value: 'antiNuke' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const module = interaction.options.getString('module');
    const config = loadConfig();
    config.protection[module].enabled = !config.protection[module].enabled;
    saveConfig(config);

    const state = config.protection[module].enabled;
    const labels = { antiRaid: 'Anti-Raid', antiNuke: 'Anti-Nuke' };

    const embed = new EmbedBuilder()
      .setColor(state ? 0x2ecc71 : 0xe74c3c)
      .setTitle(`🛡️ ${labels[module]} ${state ? 'activé' : 'désactivé'}`)
      .setDescription(`La protection **${labels[module]}** a été ${state ? '**activée**' : '**désactivée**'}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

const protectConfig = {
  data: new SlashCommandBuilder()
    .setName('protect-config')
    .setDescription('Configurer les seuils d\'une protection')
    .addStringOption(opt =>
      opt.setName('module')
        .setDescription('Module à configurer')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Raid', value: 'antiRaid' },
          { name: 'Anti-Nuke', value: 'antiNuke' }
        ))
    .addIntegerOption(opt =>
      opt.setName('seuil').setDescription('Nombre d\'actions avant déclenchement').setRequired(false))
    .addIntegerOption(opt =>
      opt.setName('fenetre').setDescription('Fenêtre de temps en secondes').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const module = interaction.options.getString('module');
    const seuil = interaction.options.getInteger('seuil');
    const fenetre = interaction.options.getInteger('fenetre');
    const config = loadConfig();
    const p = config.protection[module];

    if (seuil !== null) {
      if (module === 'antiRaid') p.joinThreshold = seuil;
      else if (module === 'antiNuke') { p.channelDeleteThreshold = seuil; p.roleDeleteThreshold = seuil; }
    }

    if (fenetre !== null) {
      p.timeWindow = fenetre * 1000;
      if (module === 'antiRaid') p.joinWindow = fenetre * 1000;
    }

    saveConfig(config);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('⚙️ Configuration mise à jour')
      .addFields(
        { name: 'Module', value: module, inline: true },
        { name: 'Seuil', value: seuil !== null ? String(seuil) : 'inchangé', inline: true },
        { name: 'Fenêtre', value: fenetre !== null ? `${fenetre}s` : 'inchangée', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

module.exports = { commands: [protectStatus, protectToggle, protectConfig] };
