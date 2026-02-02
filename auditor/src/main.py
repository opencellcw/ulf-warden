#!/usr/bin/env python3
"""
Ulfberht Security Auditor
Monitora e reporta violações de segurança
"""

import os
import sys
import time
import argparse
from scanner import SecurityScanner
from discord_reporter import DiscordReporter

def run_audit(scan_path: str, discord_webhook: str) -> int:
    """Executa auditoria completa"""
    print("=" * 60)
    print("🛡️  ULFBERHT SECURITY AUDITOR")
    print("=" * 60)
    print(f"Scan path: {scan_path}")
    print(f"Discord webhook: {'configured' if discord_webhook else 'not configured'}")
    print("=" * 60)

    try:
        # Inicializa scanner
        scanner = SecurityScanner(root_path=scan_path)

        # Executa scan
        violations = scanner.run_full_audit()

        # Reporta no Discord
        if discord_webhook:
            print("\n[Reporter] Sending report to Discord...")
            reporter = DiscordReporter(webhook_url=discord_webhook)
            reporter.send_audit_report(violations)
        else:
            print("\n[Reporter] Discord webhook not configured, skipping report.")

        # Printa resumo no console
        print(f"\n{'='*60}")
        print("📊 AUDIT SUMMARY")
        print(f"{'='*60}")

        by_severity = scanner.get_violations_by_severity()
        for severity in ['critical', 'high', 'medium', 'low']:
            count = len(by_severity[severity])
            if count > 0:
                print(f"  {severity.upper():8} : {count} violations")

        total = len(violations)
        print(f"  {'TOTAL':8} : {total} violations")
        print(f"{'='*60}\n")

        # Exit code baseado em violações
        if by_severity['critical']:
            print("❌ CRITICAL violations found. Exiting with code 2.")
            return 2
        elif by_severity['high']:
            print("⚠️  HIGH violations found. Exiting with code 1.")
            return 1
        elif violations:
            print("ℹ️  Violations found but not critical. Exiting with code 0.")
            return 0
        else:
            print("✅ No violations found. All clear!")
            return 0

    except Exception as e:
        print(f"❌ Error during audit: {e}")
        import traceback
        traceback.print_exc()
        return 3

def watch_mode(scan_path: str, discord_webhook: str, interval: int = 1800):
    """Modo watch - executa auditoria periodicamente"""
    print(f"[Watch] Starting watch mode (interval: {interval}s)")

    while True:
        run_audit(scan_path, discord_webhook)
        print(f"\n[Watch] Sleeping for {interval} seconds...")
        time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(
        description='Ulfberht Security Auditor - Detecta dados sensíveis'
    )

    parser.add_argument(
        '--path',
        default=os.getenv('AUDIT_PATH', '/data'),
        help='Path to scan (default: /data)'
    )

    parser.add_argument(
        '--webhook',
        default=os.getenv('DISCORD_SECURITY_WEBHOOK'),
        help='Discord webhook URL'
    )

    parser.add_argument(
        '--watch',
        action='store_true',
        help='Run in watch mode (continuous monitoring)'
    )

    parser.add_argument(
        '--interval',
        type=int,
        default=1800,
        help='Watch mode interval in seconds (default: 1800 = 30min)'
    )

    parser.add_argument(
        '--once',
        action='store_true',
        help='Run audit once and exit'
    )

    args = parser.parse_args()

    # Validações
    if not args.webhook:
        print("⚠️  Warning: Discord webhook not configured.")
        print("   Set DISCORD_SECURITY_WEBHOOK environment variable.")
        print("   Reports will be printed to console only.\n")

    # Executa
    if args.watch:
        watch_mode(args.path, args.webhook, args.interval)
    else:
        exit_code = run_audit(args.path, args.webhook)
        sys.exit(exit_code)

if __name__ == '__main__':
    main()
