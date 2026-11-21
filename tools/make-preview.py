"""Empacota a demonstração em um HTML que abre direto no navegador."""
import argparse
import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
args = parser.parse_args()

def data_url(path, mime):
    data = path.read_bytes()
    return f'data:{mime};base64,' + base64.b64encode(data).decode('ascii')

html = (root / 'index.html').read_text()
html = html.replace(
    '<link rel="stylesheet" href="style.css">',
    '<style>\n' + (root / 'style.css').read_text().replace(
        'assets/inter-latin.woff2', data_url(root / 'assets/inter-latin.woff2', 'font/woff2')
    ) + '</style>',
)
html = html.replace(
    'assets/bolha-mark.svg',
    data_url(root / 'assets/bolha-mark.svg', 'image/svg+xml'),
)
images = {path.stem: data_url(path, 'image/png') for path in (root / 'assets').glob('bolha-*.png')}
html = html.replace(
    '<script src="bolha-draw.js" defer></script>',
    '<script>window.bolhaAssets = ' + json.dumps(images) + ';</script>\n'
    '<script>\n' + (root / 'bolha-draw.js').read_text() + '</script>',
)
html = html.replace(
    '<script src="script.js" defer></script>',
    '<script>\n' + (root / 'script.js').read_text() + '</script>',
)
assert 'href="style.css"' not in html and 'src="script.js"' not in html
args.output.write_text(html)
