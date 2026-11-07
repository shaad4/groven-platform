"""Generate local HTTP-only nginx fixtures from baseline/current frontend configs.

Run from the repository root after npm run build. Production config is untouched.
"""
import shutil
import subprocess
from pathlib import Path

output = Path('/tmp/groven-nginx-check')
output.mkdir(exist_ok=True)
for name, source in [
    ('before', subprocess.check_output(['git', 'show', '2d7b9b6:frontend/nginx.conf'], text=True)),
    ('after', Path('frontend/nginx.conf').read_text()),
]:
    source = source[source.rfind('\nserver {'):]
    source = source.replace('listen 443 ssl;', 'listen 80;')
    source = source.replace('server_name groven.in *.groven.in;', 'server_name localhost;')
    source = '\n'.join(line for line in source.splitlines() if 'ssl_certificate' not in line)
    (output / f'{name}.conf').write_text(source)
shutil.copytree('frontend/dist', output / 'dist', dirs_exist_ok=True)
for path in (output / 'dist').rglob('*'):
    path.chmod(0o755 if path.is_dir() else 0o644)
(output / 'dist').chmod(0o755)
print(output)
