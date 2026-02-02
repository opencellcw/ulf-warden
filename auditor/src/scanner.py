"""
Security Scanner
Varre filesystem, processos e environment variables
"""

import os
import psutil
import re
from pathlib import Path
from typing import List, Set
from patterns import SecurityPatterns, ViolationMatch

class SecurityScanner:
    """Scanner de segurança"""

    def __init__(self, root_path: str = "/data"):
        self.root_path = Path(root_path)
        self.patterns = SecurityPatterns.get_compiled_patterns()
        self.violations: List[ViolationMatch] = []

        # Diretórios para ignorar
        self.ignore_dirs = {
            'node_modules', '.git', '__pycache__', '.venv',
            'venv', 'dist', 'build', '.next', '.cache'
        }

        # Extensões de arquivos para escanear
        self.scan_extensions = {
            '.js', '.ts', '.jsx', '.tsx', '.py', '.env',
            '.json', '.yaml', '.yml', '.conf', '.config',
            '.sh', '.bash', '.log', '.txt', '.md'
        }

    def scan_file(self, file_path: Path) -> List[ViolationMatch]:
        """Escaneia um arquivo específico"""
        violations = []

        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    # Verifica cada padrão
                    for pattern_name, (regex, config) in self.patterns.items():
                        matches = regex.finditer(line)
                        for match in matches:
                            matched_text = match.group(0)

                            # Verifica falso positivo
                            if SecurityPatterns.is_false_positive(matched_text, pattern_name):
                                continue

                            violations.append(ViolationMatch(
                                pattern_name=pattern_name,
                                file_path=str(file_path),
                                line_number=line_num,
                                matched_text=self._mask_sensitive(matched_text),
                                context=line.strip()[:100],
                                severity=config['severity']
                            ))
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")

        return violations

    def scan_filesystem(self) -> List[ViolationMatch]:
        """Escaneia todo o filesystem"""
        print(f"[Scanner] Scanning filesystem: {self.root_path}")
        violations = []

        for file_path in self._walk_directory(self.root_path):
            file_violations = self.scan_file(file_path)
            violations.extend(file_violations)

        return violations

    def scan_environment(self) -> List[ViolationMatch]:
        """Escaneia variáveis de ambiente"""
        print("[Scanner] Scanning environment variables")
        violations = []

        for key, value in os.environ.items():
            # Ignora vars conhecidas seguras
            if key in {'PATH', 'HOME', 'USER', 'SHELL', 'PWD', 'LANG'}:
                continue

            # Verifica patterns nos valores
            for pattern_name, (regex, config) in self.patterns.items():
                if regex.search(value):
                    violations.append(ViolationMatch(
                        pattern_name=pattern_name,
                        file_path='environment',
                        line_number=0,
                        matched_text=f"{key}={self._mask_sensitive(value)}",
                        context=f"Environment variable: {key}",
                        severity=config['severity']
                    ))

        return violations

    def scan_processes(self) -> List[ViolationMatch]:
        """Escaneia processos rodando"""
        print("[Scanner] Scanning running processes")
        violations = []

        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = proc.info.get('cmdline', [])
                    if not cmdline:
                        continue

                    cmd_str = ' '.join(cmdline)

                    # Verifica patterns nos comandos
                    for pattern_name, (regex, config) in self.patterns.items():
                        matches = regex.finditer(cmd_str)
                        for match in matches:
                            matched_text = match.group(0)

                            if SecurityPatterns.is_false_positive(matched_text, pattern_name):
                                continue

                            violations.append(ViolationMatch(
                                pattern_name=pattern_name,
                                file_path='process',
                                line_number=proc.info['pid'],
                                matched_text=self._mask_sensitive(matched_text),
                                context=f"Process: {proc.info['name']}",
                                severity=config['severity']
                            ))
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"Error scanning processes: {e}")

        return violations

    def run_full_audit(self) -> List[ViolationMatch]:
        """Executa auditoria completa"""
        print("[Auditor] Starting full security audit...")
        all_violations = []

        # Filesystem
        all_violations.extend(self.scan_filesystem())

        # Environment
        all_violations.extend(self.scan_environment())

        # Processes
        all_violations.extend(self.scan_processes())

        print(f"[Auditor] Audit complete. Found {len(all_violations)} violations.")
        return all_violations

    def _walk_directory(self, path: Path):
        """Generator para percorrer diretórios"""
        try:
            for item in path.iterdir():
                # Ignora diretórios na blacklist
                if item.is_dir():
                    if item.name in self.ignore_dirs:
                        continue
                    yield from self._walk_directory(item)
                elif item.is_file():
                    # Verifica extensão
                    if item.suffix in self.scan_extensions:
                        yield item
        except PermissionError:
            pass

    def _mask_sensitive(self, text: str) -> str:
        """Mascara dados sensíveis no output"""
        if len(text) <= 8:
            return "***"
        return text[:4] + "***" + text[-4:]

    def get_violations_by_severity(self) -> dict:
        """Agrupa violações por severidade"""
        result = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': []
        }

        for violation in self.violations:
            result[violation.severity].append(violation)

        return result
