"""
ElevenLabs API Cost Collector
"""
import os
import requests
from datetime import datetime, timedelta
from typing import Dict

class ElevenLabsCollector:
    def __init__(self):
        self.api_key = os.getenv('ELEVENLABS_API_KEY')
        self.base_url = 'https://api.elevenlabs.io/v1'

    def get_usage(self) -> Dict:
        """Get usage from ElevenLabs API"""
        if not self.api_key:
            return {'error': 'ELEVENLABS_API_KEY not configured'}

        headers = {
            'xi-api-key': self.api_key
        }

        try:
            # Get subscription info (includes usage)
            resp = requests.get(
                f'{self.base_url}/user/subscription',
                headers=headers,
                timeout=10
            )
            data = resp.json()

            character_count = data.get('character_count', 0)
            character_limit = data.get('character_limit', 0)
            tier = data.get('tier', 'free')

            return {
                'service': 'elevenlabs',
                'subscription': {
                    'tier': tier,
                    'character_count': character_count,
                    'character_limit': character_limit,
                    'character_remaining': character_limit - character_count,
                    'usage_percent': (character_count / character_limit * 100) if character_limit > 0 else 0
                },
                'cost': self._calculate_cost(tier, character_count)
            }

        except Exception as e:
            return {'error': str(e)}

    def _calculate_cost(self, tier: str, character_count: int) -> Dict:
        """
        Calculate ElevenLabs costs

        Pricing (2026):
        - Free: $0/month, 10k characters
        - Starter: $5/month, 30k characters
        - Creator: $22/month, 100k characters
        - Pro: $99/month, 500k characters
        - Scale: $330/month, 2M characters
        """
        tier_pricing = {
            'free': 0,
            'starter': 5,
            'creator': 22,
            'pro': 99,
            'scale': 330
        }

        base_cost = tier_pricing.get(tier, 0)

        # Additional characters beyond limit are charged separately
        # (implementation would depend on actual overage pricing)

        return {
            'base_subscription': base_cost,
            'overage': 0.0,
            'total': base_cost,
            'currency': 'USD'
        }

    def get_current_month_cost(self) -> float:
        """Get current month cost"""
        data = self.get_usage()
        return data.get('cost', {}).get('total', 0.0)
