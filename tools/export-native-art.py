# SPDX-License-Identifier: GPL-3.0-or-later
"""Exporta a esfera e os objetos diretamente do renderer Qt da Bolha."""
import argparse
import importlib
from pathlib import Path
import sys

from PySide6.QtCore import QRectF
from PySide6.QtGui import QImage, QPainter
from PySide6.QtWidgets import QApplication

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('repo', type=Path, help='Checkout do código da Bolha')
args = parser.parse_args()
repo = args.repo.resolve()
sys.path[:0] = [str(repo), str(repo / 'brain')]
character = importlib.import_module('bolha.character')
objects = importlib.import_module('bolha.objects')
app = QApplication([])
output = Path(__file__).resolve().parents[1] / 'assets'

def sheet(name, width, height, count, draw):
    image = QImage(width * count, height, QImage.Format_ARGB32_Premultiplied)
    image.fill(0)
    painter = QPainter(image)
    painter.setRenderHint(QPainter.Antialiasing)
    for index in range(count):
        painter.save()
        painter.translate(index * width, 0)
        draw(painter, index)
        painter.restore()
    painter.end()
    if not image.save(str(output / f'{name}.png')):
        raise RuntimeError(f'Falha ao salvar {name}')

def body(painter, index):
    painter.translate(120, 120)
    painter.scale(2, 2)
    character._body(painter, index / 4)

sheet('bolha-corpo', 240, 240, 5, body)
sheet('bolha-brinquedos', 88, 88, 2, lambda painter, index:
      (objects.paint_ball, objects.paint_peanut)[index](painter, 44, 44, 39))
sheet('bolha-notebook', 200, 144, 12, lambda painter, index:
      objects.paint_notebook(painter, QRectF(0, 0, 200, 144), working=True, phase=index / 8))
