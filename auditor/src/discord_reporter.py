"""
Discord Reporter
Envia alertas de segurança para Discord
"""

import os
import requests
from typing import List
from datetime import datetime
from patterns import ViolationMatch

class DiscordReporter:
    """Reporter de segurança para Discord"""

    SEVERITY_COLORS = {
        'critical': 0xFF0000,  # Vermelho
        'high': 0xFF6600,      # Laranja
        'medium': 0xFFCC00,    # Amarelo
        'low': 0x0099FF        # Azul
    }

    SEVERITY_EMOJIS = {
        'critical': '🚨',
        'high': '⚠️',
        'medium': '⚡',
        'low': 'ℹ️'
    }

    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or os.getenv('DISCORD_SECURITY_WEBHOOK')
        if not self.webhook_url:
            raise ValueError("DISCORD_SECURITY_WEBHOOK not configured")

    def send_audit_report(self, violations: List[ViolationMatch]) -> bool:
        """Envia relatório de auditoria"""
        if not violations:
            return self._send_success_report()

        # Agrupa por severidade
        by_severity = self._group_by_severity(violations)

        # Envia resumo
        self._send_summary(by_severity)

        # Envia detalhes das violações críticas e high
        for severity in ['critical', 'high']:
            if by_severity[severity]:
                self._send_violations(severity, by_severity[severity])

        return True

    def send_realtime_alert(self, violation: ViolationMatch) -> bool:
        """Envia alerta em tempo real para violações críticas"""
        embed = {
            "title": f"{self.SEVERITY_EMOJIS[violation.severity]} SECURITY ALERT",
            "description": f"**Violação detectada em tempo real!**",
            "color": self.SEVERITY_COLORS[violation.severity],
            "fields": [
                {
                    "name": "🔍 Tipo",
                    "value": violation.pattern_name.replace('_', ' ').title(),
                    "inline": True
                },
                {
                    "name": "📊 Severidade",
                    "value": violation.severity.upper(),
                    "inline": True
                },
                {
                    "name": "📁 Arquivo",
                    "value": f"`{violation.file_path}`",
                    "inline": False
                },
                {
                    "name": "📍 Linha",
                    "value": str(violation.line_number),
                    "inline": True
                },
                {
                    "name": "🔎 Match",
                    "value": f"`{violation.matched_text}`",
                    "inline": False
                },
                {
                    "name": "📝 Contexto",
                    "value": f"```\n{violation.context}\n```",
                    "inline": False
                }
            ],
            "timestamp": datetime.utcnow().isoformat()
        }

        return self._send_embed(embed)

    def _send_summary(self, by_severity: dict) -> bool:
        """Envia resumo da auditoria"""
        total = sum(len(v) for v in by_severity.values())

        description = "**Resumo da Auditoria de Segurança**\n\n"
        for severity in ['critical', 'high', 'medium', 'low']:
            count = len(by_severity[severity])
            if count > 0:
                emoji = self.SEVERITY_EMOJIS[severity]
                description += f"{emoji} **{severity.upper()}:** {count} violações\n"

        embed = {
            "title": "🛡️ Security Audit Report",
            "description": description,
            "color": self._get_summary_color(by_severity),
            "fields": [
                {
                    "name": "📊 Total",
                    "value": str(total),
                    "inline": True
                },
                {
                    "name": "⏰ Timestamp",
                    "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "inline": True
                }
            ],
            "footer": {
                "text": "Ulfberht Security Auditor"
            }
        }

        return self._send_embed(embed)

    def _send_violations(self, severity: str, violations: List[ViolationMatch]) -> bool:
        """Envia detalhes das violações"""
        # Agrupa por tipo
        by_type = {}
        for v in violations:
            if v.pattern_name not in by_type:
                by_type[v.pattern_name] = []
            by_type[v.pattern_name].append(v)

        for pattern_name, pattern_violations in by_type.items():
            # Limita a 10 violações por tipo
            limited = pattern_violations[:10]
            has_more = len(pattern_violations) > 10

            description = f"**Tipo:** {pattern_name.replace('_', ' ').title()}\n"
            description += f"**Encontradas:** {len(pattern_violations)} ocorrências\n\n"

            fields = []
            for i, v in enumerate(limited, 1):
                fields.append({
                    "name": f"#{i} - {v.file_path}:{v.line_number}",
                    "value": f"`{v.matched_text}`\n```\n{v.context[:100]}\n```",
                    "inline": False
                })

            if has_more:
                fields.append({
                    "name": "⚠️ Aviso",
                    "value": f"Mostrando apenas 10 de {len(pattern_violations)} violações.",
                    "inline": False
                })

            embed = {
                "title": f"{self.SEVERITY_EMOJIS[severity]} {severity.upper()} - {pattern_name}",
                "description": description,
                "color": self.SEVERITY_COLORS[severity],
                "fields": fields,
                "timestamp": datetime.utcnow().isoformat()
            }

            self._send_embed(embed)

        return True

    def _send_success_report(self) -> bool:
        """Envia relatório quando não há violações"""
        embed = {
            "title": "✅ Security Audit - All Clear",
            "description": "Nenhuma violação de segurança detectada!",
            "color": 0x00FF00,  # Verde
            "fields": [
                {
                    "name": "Status",
                    "value": "✓ Passed",
                    "inline": True
                },
                {
                    "name": "Timestamp",
                    "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "inline": True
                }
            ],
            "footer": {
                "text": "Ulfberht Security Auditor"
            }
        }

        return self._send_embed(embed)

    def _send_embed(self, embed: dict) -> bool:
        """Envia embed para Discord"""
        try:
            payload = {"embeds": [embed]}
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error sending to Discord: {e}")
            return False

    def _group_by_severity(self, violations: List[ViolationMatch]) -> dict:
        """Agrupa violações por severidade"""
        result = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': []
        }

        for v in violations:
            result[v.severity].append(v)

        return result

    def _get_summary_color(self, by_severity: dict) -> int:
        """Determina cor do resumo baseado em severidade"""
        if by_severity['critical']:
            return self.SEVERITY_COLORS['critical']
        elif by_severity['high']:
            return self.SEVERITY_COLORS['high']
        elif by_severity['medium']:
            return self.SEVERITY_COLORS['medium']
        else:
            return 0x00FF00  # Verde se só low ou nenhum
