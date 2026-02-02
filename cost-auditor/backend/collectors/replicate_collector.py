"""
Replicate API Cost Collector
"""
import os
import requests
from datetime import datetime, timedelta
from typing import Dict

class ReplicateCollector:
    def __init__(self):
        self.api_key = os.getenv('REPLICATE_API_TOKEN')
        self.base_url = 'https://api.replicate.com/v1'

    def get_usage(self, start_date: datetime = None, end_date: datetime = None) -> Dict:
        """Get usage from Replicate API"""
        if not self.api_key:
            return {'error': 'REPLICATE_API_TOKEN not configured'}

        headers = {
            'Authorization': f'Token {self.api_key}'
        }

        try:
            # Get account info
            account_resp = requests.get(
                f'{self.base_url}/account',
                headers=headers,
                timeout=10
            )
            account_data = account_resp.json()

            # Get billing info (if available)
            # Note: Replicate billing API may vary, adjust as needed
            return {
                'service': 'replicate',
                'account': account_data,
                'usage': self._get_predictions_usage(headers, start_date, end_date),
                'cost': self._calculate_cost()
            }

        except Exception as e:
            return {'error': str(e)}

    def _get_predictions_usage(self, headers: Dict, start_date: datetime, end_date: datetime) -> Dict:
        """Get predictions usage"""
        try:
            # List recent predictions
            predictions_resp = requests.get(
                f'{self.base_url}/predictions',
                headers=headers,
                timeout=10
            )
            predictions = predictions_resp.json()

            total_predictions = len(predictions.get('results', []))
            total_compute_time = sum(
                p.get('metrics', {}).get('predict_time', 0)
                for p in predictions.get('results', [])
            )

            return {
                'total_predictions': total_predictions,
                'total_compute_seconds': total_compute_time,
                'total_compute_minutes': total_compute_time / 60
            }

        except Exception as e:
            return {'error': str(e)}

    def _calculate_cost(self) -> Dict:
        """
        Calculate Replicate costs

        Pricing varies by model:
        - Image generation (Flux): ~$0.003 per image
        - Video generation: ~$0.05 per video
        - Compute time: varies by hardware tier
        """
        # This would need actual billing data from Replicate
        # For now, estimate based on predictions
        return {
            'total': 0.0,
            'currency': 'USD'
        }

    def get_current_month_cost(self) -> float:
        """Get current month cost"""
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0)
        data = self.get_usage(start_date=start_of_month)
        return data.get('cost', {}).get('total', 0.0)
