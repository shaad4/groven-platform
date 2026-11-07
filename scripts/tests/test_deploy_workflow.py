"""Validate orchestration with a fake Docker command; never deploy anything."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'deploy-production.sh'


class DeploymentOrderingTests(unittest.TestCase):
    def run_deploy(self, fail=''):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docker = root / 'docker'
            docker.write_text('''#!/usr/bin/env python3
import json, os, sys
with open(os.environ['DEPLOY_TEST_LOG'], 'a') as log:
    log.write(json.dumps(sys.argv[1:]) + '\\n')
match = os.environ.get('DEPLOY_TEST_FAIL')
sys.exit(1 if match and match in ' '.join(sys.argv[1:]) else 0)
''')
            docker.chmod(0o755)
            env = dict(os.environ, PATH=f'{root}:' + os.environ['PATH'],
                       GROVEN_ALLOW_DEPLOY='1', DEPLOY_TEST_LOG=str(root / 'calls'), DEPLOY_TEST_FAIL=fail)
            result = subprocess.run(['bash', str(SCRIPT), '--execute'], env=env, capture_output=True, text=True)
            calls = [json.loads(line) for line in (root / 'calls').read_text().splitlines()]
            return result, [' '.join(call) for call in calls]

    def test_build_then_stop_then_migrate_then_restart(self):
        result, calls = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        positions = [next(i for i, call in enumerate(calls) if fragment in call)
                     for fragment in (' build ', 'check --deploy', ' stop ', 'migrate --noinput', 'migrate --check', '--force-recreate')]
        self.assertEqual(positions, sorted(positions))
        stop = calls[positions[2]]
        for service in ('nginx', 'backend', 'daphne', 'celery_worker', 'celery_beat'):
            self.assertIn(service, stop)

    def test_failed_build_does_not_stop_services(self):
        result, calls = self.run_deploy(' build ')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(' stop ' in call for call in calls))

    def test_failed_preflight_does_not_stop_services(self):
        result, calls = self.run_deploy('check --deploy')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(' stop ' in call for call in calls))

    def test_failed_migration_does_not_restart_application(self):
        result, calls = self.run_deploy('migrate --noinput')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any('--force-recreate' in call for call in calls))
        self.assertIn('maintenance', result.stderr)

    def test_failed_restart_stops_partial_new_release(self):
        result, calls = self.run_deploy('--force-recreate')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(' stop ', calls[-1])

    def test_no_accidental_execution(self):
        result = subprocess.run(['bash', str(SCRIPT)], capture_output=True)
        self.assertEqual(result.returncode, 64)

if __name__ == '__main__':
    unittest.main()
