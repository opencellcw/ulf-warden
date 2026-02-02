"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalSystem = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = require("./logger");
class ApprovalSystem {
    pendingApprovals = new Map();
    client = null;
    setClient(client) {
        this.client = client;
        this.setupInteractionHandler();
    }
    setupInteractionHandler() {
        if (!this.client)
            return;
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton())
                return;
            const buttonInteraction = interaction;
            const [action, requestId] = buttonInteraction.customId.split(':');
            if (!['approve', 'decline'].includes(action))
                return;
            const request = this.pendingApprovals.get(requestId);
            if (!request) {
                await buttonInteraction.reply({
                    content: '⚠️ Esta solicitação expirou ou já foi processada.',
                    ephemeral: true,
                });
                return;
            }
            // Check authorization
            if (!request.authorizedUsers.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({
                    content: '🚫 Você não tem permissão para aprovar/rejeitar esta solicitação.',
                    ephemeral: true,
                });
                return;
            }
            // Defer reply to avoid timeout
            await buttonInteraction.deferUpdate();
            try {
                if (action === 'approve') {
                    logger_1.log.info('[Approval] Request approved', { requestId, userId: buttonInteraction.user.id });
                    // Update message
                    await buttonInteraction.editReply({
                        content: '⏳ Processando aprovação...',
                        components: [],
                    });
                    // Execute approval callback
                    await request.onApprove();
                    await buttonInteraction.editReply({
                        content: `✅ **Aprovado por <@${buttonInteraction.user.id}>**\n\nMudanças aplicadas com sucesso!`,
                        components: [],
                    });
                }
                else {
                    logger_1.log.info('[Approval] Request declined', { requestId, userId: buttonInteraction.user.id });
                    await buttonInteraction.editReply({
                        content: `❌ **Rejeitado por <@${buttonInteraction.user.id}>**\n\nNenhuma mudança foi aplicada.`,
                        components: [],
                    });
                    await request.onDecline();
                }
                // Remove from pending
                this.pendingApprovals.delete(requestId);
            }
            catch (error) {
                logger_1.log.error('[Approval] Error processing approval', { error: error.message });
                await buttonInteraction.editReply({
                    content: `⚠️ Erro ao processar: ${error.message}`,
                    components: [],
                });
            }
        });
    }
    async requestApproval(channel, request) {
        // Create embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🔧 ${request.title}`)
            .setDescription(request.description)
            .setColor(0xFFA500) // Orange
            .setTimestamp();
        // Add changes as fields
        for (const change of request.changes) {
            const actionEmoji = {
                create: '➕',
                modify: '✏️',
                delete: '🗑️',
            }[change.action];
            let value = `${actionEmoji} **${change.action.toUpperCase()}**`;
            if (change.diff) {
                value += `\n\`\`\`diff\n${change.diff.substring(0, 200)}${change.diff.length > 200 ? '...' : ''}\n\`\`\``;
            }
            embed.addFields({
                name: change.file,
                value,
                inline: false,
            });
        }
        // Add footer
        embed.setFooter({
            text: `Solicitação: ${request.id} | Somente usuários autorizados podem aprovar`,
        });
        // Create buttons
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`approve:${request.id}`)
            .setLabel('✅ Approve')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId(`decline:${request.id}`)
            .setLabel('❌ Decline')
            .setStyle(discord_js_1.ButtonStyle.Danger));
        // Send message
        await channel.send({
            embeds: [embed],
            components: [row],
        });
        // Store pending approval
        this.pendingApprovals.set(request.id, request);
        logger_1.log.info('[Approval] Request created', {
            requestId: request.id,
            title: request.title,
            changesCount: request.changes.length,
        });
        // Auto-expire after 1 hour
        setTimeout(() => {
            if (this.pendingApprovals.has(request.id)) {
                logger_1.log.warn('[Approval] Request expired', { requestId: request.id });
                this.pendingApprovals.delete(request.id);
            }
        }, 60 * 60 * 1000);
    }
}
exports.approvalSystem = new ApprovalSystem();
