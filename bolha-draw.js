// SPDX-License-Identifier: GPL-3.0-or-later
// Geometria de bolha/character.py e bolha/facial_motion.py, Bolha v0.5.9.0.
(() => {
  'use strict';

  const profiles = {
    observando: [5.2, 6.4, 0, 0, 0, .25],
    contente: [5.2, 6, 0, 2, .4, .55],
    feliz: [5.2, 6.4, 0, 6, 1, .88],
    curioso: [5.7, 7.2, -.4, -5, 1.7, .12],
    bravo: [5.8, 5.4, .2, -26, -2.2, -.55],
    assustado: [6.1, 9.8, -.3, -6, 2.8, -.12],
    dormindo: [5.2, 6.4, 1, 21, -2.9, .12],
    timido: [4.9, 4.8, 1.1, -11, -.5, .3],
    atento: [5.4, 7.4, -.7, 0, 2.2, .04],
    travesso: [5.6, 4.7, -.1, -7, .9, .66],
    comemorando: [6.4, 7.2, -.3, 7, 2, .95],
  };
  const gold = '#ffd364';
  const dawn = '#fff4cf';
  const radians = Math.PI / 180;
  const image = name => {
    const img = new Image();
    img.src = window.bolhaAssets?.[name] ?? 'assets/' + name + '.png';
    return img;
  };
  const body = image('bolha-corpo');
  const toys = image('bolha-brinquedos');
  const notebook = image('bolha-notebook');

  function oval(ctx, x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (color) {
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function curve(ctx, x, y, cx, cy, ex, ey, width) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawBody(ctx, anger) {
    if (body.naturalWidth) {
      const cell = anger * 4;
      const first = Math.floor(cell);
      ctx.drawImage(body, first * 240, 0, 240, 240, -60, -60, 120, 120);
      if (first < 4 && cell > first) {
        ctx.globalAlpha = cell - first;
        ctx.drawImage(body, (first + 1) * 240, 0, 240, 240, -60, -60, 120, 120);
        ctx.globalAlpha = 1;
      }
      return;
    }
    // Mantém um quadro visível enquanto o PNG é decodificado.
    const ring = ctx.createLinearGradient(-47, -47, 47, 47);
    ring.addColorStop(0, anger > .5 ? '#ff2e4c' : '#b45da6');
    ring.addColorStop(.5, '#8a79c1');
    ring.addColorStop(1, '#6c96b5');
    oval(ctx, 0, 0, 49, 49, ring);
    oval(ctx, 0, 0, 46.8, 46.8, '#18181d');
  }

  function drawFeatures(ctx, pose) {
    const { emotion, anger, gx, gy, blink, left, right, ear, blend } = pose;
    let [rx, ry, eyeY, tilt, rise] = profiles[emotion] ?? profiles.observando;
    if (emotion === 'bravo') {
      const neutral = profiles.observando;
      [rx, ry, eyeY, tilt, rise] = [rx, ry, eyeY, tilt, rise]
        .map((value, index) => neutral[index] + (value - neutral[index]) * blend);
    }
    ctx.strokeStyle = gold;

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 17.5 + gx * 4.4, -18 - rise + gy * 2.8 - side * gx * 1.2);
      ctx.rotate((side * (tilt + ear) + gx * 14) * radians);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4.8, -2);
      ctx.quadraticCurveTo(-1, -12, 0, -12);
      ctx.quadraticCurveTo(1, -12, 4.8, -2);
      ctx.stroke();
      ctx.restore();
    }

    for (const side of [-1, 1]) {
      const closed = Math.max(blink, side < 0 ? left : right);
      const x = side * 18 * (1 - .12 * Math.abs(gx)) + gx * 7.1;
      const y = eyeY + gy * 3.6;
      if (closed > .94) {
        curve(ctx, x - 5.3, y - 1, x, y + 3, x + 5.3, y - 1, 2.5);
        continue;
      }
      if (emotion === 'feliz' && !left && !right) {
        curve(ctx, x - 5.3, y + 2, x, y - 5, x + 5.3, y + 2, 2.5);
        continue;
      }
      if (emotion === 'comemorando') {
        ctx.beginPath();
        for (const [dx, dy] of [[0, -7], [1.9, -2.2], [6.3, 0], [1.9, 2.2], [0, 7], [-1.9, 2.2], [-6.3, 0], [-1.9, -2.2]]) {
          ctx.lineTo(x + dx, y + dy * (1 - closed));
        }
        ctx.closePath();
        ctx.fillStyle = gold;
        ctx.fill();
        continue;
      }

      const h = ry * (1 - closed) + .7 * closed;
      oval(ctx, x, y, rx + 1, h + 1, 'rgba(255,211,100,.12)');
      ctx.save();
      if (emotion === 'bravo' || emotion === 'travesso') {
        const lid = emotion === 'bravo' ? 1 - (.86 + .12 * anger) * blend : .48;
        const slope = emotion === 'bravo' ? side * (-.43 - .14 * anger) * blend : 0;
        const edge = rx + 1;
        const top = y - h * lid;
        ctx.beginPath();
        ctx.moveTo(x - edge, top - slope * edge);
        ctx.lineTo(x + edge, top + slope * edge);
        ctx.lineTo(x + edge, y + h + 1);
        ctx.lineTo(x - edge, y + h + 1);
        ctx.closePath();
        ctx.clip();
      }
      oval(ctx, x, y, rx, h, gold);
      if (h > 3) {
        ctx.clip();
        oval(ctx, x - 1.2 + gx * 1.45, y - 2 + gy * 1.1, 1.05, 1.05, dawn);
      }
      ctx.restore();
    }
  }

  function drawMouth(ctx, pose) {
    const { emotion, mouth, gx, chew, cursor, blend } = pose;
    const nativeCurve = (profiles[emotion] ?? profiles.observando)[5];
    const smile = emotion === 'bravo' ? .25 + (nativeCurve - .25) * blend : nativeCurve;
    const width = (7.2 + 9.5 * mouth) * (emotion === 'dormindo' ? .65 : 1);
    const height = 16 * mouth;
    const y = 18 + chew * .75;
    const centre = y + 6 * smile;
    const slant = gx * 1.1;
    ctx.strokeStyle = gold;
    if (mouth > .025) {
      ctx.beginPath();
      ctx.moveTo(-width, y + slant);
      ctx.quadraticCurveTo(0, centre - height * .8, width, y - slant);
      ctx.quadraticCurveTo(0, centre + height * 1.2, -width, y + slant);
      ctx.closePath();
      ctx.lineWidth = 1.75;
      ctx.fillStyle = '#2f1026';
      ctx.fill();
      ctx.stroke();
      if (smile > .4 && mouth > .23) {
        ctx.save();
        ctx.clip();
        oval(ctx, 0, y + height * .55 + 3, width * .55, height * .32 + 1, '#f9b3bd');
        ctx.restore();
      }
    } else {
      curve(ctx, -width, y + slant, 0, centre, width, y - slant, 2);
    }
    if (chew > 0) {
      ctx.strokeStyle = 'rgba(255,211,100,.7)';
      for (const side of [-1, 1]) {
        curve(ctx, side * 25, 10, side * (28 + chew * 4), 17, side * 25, 22, 1.6);
      }
    }
    if (cursor) {
      ctx.save();
      ctx.translate(0, y - 2);
      ctx.rotate(-12 * radians);
      ctx.beginPath();
      for (const [x, y] of [[-3, -5], [-3, 4], [0, 2], [2, 6], [4, 5], [2, 1], [5, 0]]) {
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#fff4db';
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = '#2b2236';
      ctx.stroke();
      ctx.restore();
    }
  }

  function fit(canvas) {
    const width = Math.round(canvas.clientWidth * Math.min(2, window.devicePixelRatio || 1));
    const height = Math.round(canvas.clientHeight * Math.min(2, window.devicePixelRatio || 1));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function draw(canvas, pose = {}) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    if (!width || !height) return;
    const state = { emotion: 'observando', anger: 0, gx: 0, gy: 0, blink: 0, left: 0, right: 0,
      ear: 0, mouth: 0, chew: 0, cursor: false, blend: 1, ...pose };
    if (state.emotion === 'dormindo') state.gx = state.gy = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.setTransform(width / 120, 0, 0, height / 120, width / 2, height / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawBody(ctx, state.anger);
    ctx.save();
    oval(ctx, 0, 0, 43, 43);
    ctx.clip();
    drawFeatures(ctx, state);
    if (pose.mouthEnabled !== false || state.cursor) drawMouth(ctx, state);
    ctx.restore();
  }

  function drawObject(canvas, kind, frame = 0) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (kind === 'notebook' && notebook.naturalWidth) {
      ctx.drawImage(notebook, (frame % 12) * 200, 0, 200, 144, 0, 0, width, height);
    } else if (toys.naturalWidth && kind !== 'notebook') {
      const sourceX = kind === 'peanut' ? 88 : 0;
      ctx.drawImage(toys, sourceX, 0, 88, 88, 0, 0, width, height);
    } else {
      return false;
    }
    return true;
  }

  window.BolhaArt = { fit, draw, drawObject };
})();
