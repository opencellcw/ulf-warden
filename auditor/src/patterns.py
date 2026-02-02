"""
Security Audit Patterns
Detecta dados sensíveis específicos para CloudWalk/InfinitePay
"""

import re
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class ViolationMatch:
    pattern_name: str
    file_path: str
    line_number: int
    matched_text: str
    context: str
    severity: str  # 'critical' | 'high' | 'medium' | 'low'

class SecurityPatterns:
    """Padrões de segurança para detecção"""

    # Padrões gerais
    GENERAL_PATTERNS = {
        'passwords': {
            'regex': r'(?i)(password|passwd|pwd|senha)\s*[:=]\s*["\']([^"\']{3,})["\']',
            'severity': 'critical',
            'description': 'Senha hardcoded detectada'
        },
        'api_keys': {
            'regex': r'(?i)(api_key|apikey|api-key|token|auth_token)\s*[:=]\s*["\']([A-Za-z0-9_\-]{20,})["\']',
            'severity': 'critical',
            'description': 'API key hardcoded detectada'
        },
        'private_keys': {
            'regex': r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',
            'severity': 'critical',
            'description': 'Chave privada detectada'
        },
        'jwt_tokens': {
            'regex': r'eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*',
            'severity': 'high',
            'description': 'JWT token detectado'
        },
    }

    # Padrões financeiros Brasil
    BRAZILIAN_PATTERNS = {
        'credit_card': {
            'regex': r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
            'severity': 'critical',
            'description': 'Número de cartão de crédito detectado'
        },
        'cpf': {
            'regex': r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b',
            'severity': 'high',
            'description': 'CPF detectado'
        },
        'cnpj': {
            'regex': r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b',
            'severity': 'high',
            'description': 'CNPJ detectado'
        },
        'pix_key': {
            'regex': r'(?i)(pix_key|chave_pix|chavepix)\s*[:=]\s*["\']([^"\']+)["\']',
            'severity': 'high',
            'description': 'Chave PIX detectada'
        },
    }

    # Padrões CloudWalk/InfinitePay
    CLOUDWALK_PATTERNS = {
        'merchant_id': {
            'regex': r'(?i)(merchant_id|merchantid|merchant-id)\s*[:=]\s*["\']([^"\']+)["\']',
            'severity': 'high',
            'description': 'Merchant ID detectado'
        },
        'transaction_id': {
            'regex': r'(?i)(transaction_id|transactionid|txn_id)\s*[:=]\s*["\']([^"\']+)["\']',
            'severity': 'medium',
            'description': 'Transaction ID detectado'
        },
        'terminal_id': {
            'regex': r'(?i)(terminal_id|terminalid)\s*[:=]\s*["\']([^"\']+)["\']',
            'severity': 'medium',
            'description': 'Terminal ID detectado'
        },
        'webhook_secret': {
            'regex': r'(?i)(webhook_secret|webhook-secret)\s*[:=]\s*["\']([^"\']+)["\']',
            'severity': 'critical',
            'description': 'Webhook secret detectado'
        },
    }

    # Padrões de cloud providers
    CLOUD_PATTERNS = {
        'aws_key': {
            'regex': r'AKIA[0-9A-Z]{16}',
            'severity': 'critical',
            'description': 'AWS Access Key detectada'
        },
        'gcp_key': {
            'regex': r'AIza[0-9A-Za-z\-_]{35}',
            'severity': 'critical',
            'description': 'GCP API Key detectada'
        },
        'anthropic_key': {
            'regex': r'sk-ant-api03-[A-Za-z0-9\-_]{95}',
            'severity': 'critical',
            'description': 'Anthropic API Key detectada'
        },
        'openai_key': {
            'regex': r'sk-[A-Za-z0-9]{48}',
            'severity': 'critical',
            'description': 'OpenAI API Key detectada'
        },
    }

    # Padrões de logs inseguros
    LOG_PATTERNS = {
        'log_cpf': {
            'regex': r'(?i)(log|logger|print|console\.log).*\d{3}\.\d{3}\.\d{3}-\d{2}',
            'severity': 'high',
            'description': 'CPF sendo logado'
        },
        'log_card': {
            'regex': r'(?i)(log|logger|print|console\.log).*\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}',
            'severity': 'critical',
            'description': 'Cartão de crédito sendo logado'
        },
        'log_password': {
            'regex': r'(?i)(log|logger|print|console\.log).*(password|senha)',
            'severity': 'high',
            'description': 'Senha sendo logada'
        },
    }

    @classmethod
    def get_all_patterns(cls) -> Dict[str, Dict]:
        """Retorna todos os padrões consolidados"""
        all_patterns = {}
        all_patterns.update(cls.GENERAL_PATTERNS)
        all_patterns.update(cls.BRAZILIAN_PATTERNS)
        all_patterns.update(cls.CLOUDWALK_PATTERNS)
        all_patterns.update(cls.CLOUD_PATTERNS)
        all_patterns.update(cls.LOG_PATTERNS)
        return all_patterns

    @classmethod
    def get_compiled_patterns(cls) -> Dict[str, Tuple[re.Pattern, Dict]]:
        """Retorna padrões compilados para performance"""
        all_patterns = cls.get_all_patterns()
        compiled = {}
        for name, config in all_patterns.items():
            try:
                compiled[name] = (re.compile(config['regex']), config)
            except re.error as e:
                print(f"Warning: Failed to compile pattern {name}: {e}")
        return compiled

    @classmethod
    def is_false_positive(cls, matched_text: str, pattern_name: str) -> bool:
        """Detecta falsos positivos comuns"""
        false_positives = [
            # Exemplos de documentação
            'example.com', 'test@test.com', '000.000.000-00',
            '0000-0000-0000-0000', '123-45-6789',
            # Placeholders
            'YOUR_API_KEY', 'YOUR_TOKEN', 'REPLACE_ME',
            'xxx', 'yyy', 'zzz',
            # Test data
            'test_key', 'test_token', 'fake_',
        ]

        matched_lower = matched_text.lower()
        return any(fp in matched_lower for fp in false_positives)
