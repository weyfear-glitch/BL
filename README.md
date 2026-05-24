# 🛡️ Discord Blacklist & Protect Bot

Bot Discord.js v14 avec système de **blacklist automatique** et **protection serveur** complète.

---

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

Ouvrir `config.json` et remplir :

| Champ | Description |
|-------|-------------|
| `token` | Token de ton bot (Discord Developer Portal) |
| `logChannelId` | ID du salon où envoyer les logs |
| `adminRoleId` | ID du rôle administrateur |

---

## 🚀 Lancer le bot

```bash
node index.js
```

---

## 📋 Commandes disponibles

### 🚫 Blacklist

| Commande | Description |
|----------|-------------|
| `/blacklist-add @user [raison]` | Blackliste un utilisateur et le bannit |
| `/blacklist-remove <userid>` | Retire un utilisateur de la blacklist |
| `/blacklist-list` | Affiche tous les utilisateurs blacklistés |

> Les utilisateurs blacklistés sont **bannis automatiquement** dès qu'ils rejoignent le serveur.

---

### 🛡️ Protection

| Commande | Description |
|----------|-------------|
| `/protect-status` | Voir l'état de toutes les protections |
| `/protect-toggle <module>` | Activer/désactiver un module |
| `/protect-config <module> [seuil] [fenetre]` | Modifier les seuils |

#### Modules disponibles

**⚡ Anti-Raid**
- Détecte les joins massifs en peu de temps
- Action par défaut : kick (configurable en ban)
- Seuil par défaut : 5 joins en 10 secondes

**💣 Anti-Nuke**
- Détecte les suppressions massives de salons ou de rôles
- Bannit automatiquement l'exécutant
- Seuil par défaut : 3 suppressions en 10 secondes

---

## 🔐 Permissions requises

Le bot doit avoir ces permissions sur le serveur :
- `Ban Members`
- `Kick Members`
- `Moderate Members` (timeout)
- `View Audit Log`
- `Manage Messages`
- `Read Message History`
- `Send Messages`

---

## 📁 Structure du projet

```
discord-bot/
├── index.js              ← Point d'entrée
├── config.json           ← Configuration
├── package.json
├── commands/
│   ├── blacklist.js      ← /blacklist-add, remove, list
│   └── protect.js        ← /protect-status, toggle, config
├── events/
│   ├── guildMemberAdd.js ← Blacklist auto + anti-raid
│   ├── channelDelete.js  ← Anti-nuke (salons)
│   └── roleDelete.js     ← Anti-nuke (rôles)
└── data/
    └── blacklist.json    ← Stockage de la blacklist
```

---

## ⚠️ Notes importantes

- Les **administrateurs** sont immunisés contre l'anti-nuke
- La blacklist est persistante (fichier JSON local)
- Les commandes sont **slash commands** et réservées aux admins
- Pour une utilisation en production, remplace le stockage JSON par une base de données (SQLite, MongoDB, etc.)
