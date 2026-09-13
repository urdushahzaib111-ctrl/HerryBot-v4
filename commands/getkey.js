const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateUserKey } = require('../keysystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getkey')
        .setDescription('Get your 3-Day access key / 3-Day key hasil karein'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const userId = interaction.user.id;
            const result = await getOrCreateUserKey(userId);

            if (!result.isNew) {
                // User Already Has An Active Key
                const embed = new EmbedBuilder()
                    .setColor('#FF9900')
                    .setTitle('⚠️ Active Key Already Exists!')
                    .setDescription(
                        `**ENGLISH:**\nYou already have an active key. You cannot generate a new key right now.\n\n` +
                        `**ROMAN URDU:**\nAapke paas pehle se active key maujood hai. Aap abhi nayi key generate nahi kar sakte.\n\n` +
                        `🔑 **Your Active Key:**\n\`\`\`${result.key}\`\`\``
                    )
                    .addFields(
                        { name: '⏳ Expiration Status', value: `\`${result.hoursLeft}\` left before this key expires.`, inline: false }
                    )
                    .setFooter({ text: 'If you forgot your key, copy it from above. / Key bhool gaye hain to upar se copy kar lein.' });

                return interaction.editReply({ embeds: [embed] });
            } else {
                // New Key Generated & Synced to GitHub
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ New Access Key Generated!')
                    .setDescription(
                        `**ENGLISH:**\nYour 3-day access key has been created and synced with the GitHub database!\n\n` +
                        `**ROMAN URDU:**\nAapki 3-day key ban gayi hai aur GitHub server par update ho gayi hai.\n\n` +
                        `🔑 **Your Access Key:**\n\`\`\`${result.key}\`\`\``
                    )
                    .addFields(
                        { name: '⏳ Validity Period', value: `Valid for **72 Hours (3 Days)**.`, inline: false }
                    )
                    .setFooter({ text: 'Do not share your key with anyone. / Apni key kisi ke sath share mat karein.' });

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error("Getkey Command Error:", error);
            return interaction.editReply({
                content: "❌ **Error:** Unable to process key generation right now. Please try again later."
            });
        }
    }
};
