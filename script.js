// SPDX-License-Identifier: GPL-3.0-or-later
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const art = window.BolhaArt;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = $('demoScreen'), petButton = $('demoCharacter'), petCanvas = $('demoBolha');
  const ballButton = $('demoToy'), ballCanvas = ballButton.querySelector('canvas');
  const notebookButton = $('demoNotebook'), notebookCanvas = notebookButton.querySelector('canvas');
  const taskbar = stage.querySelector('.desktop-taskbar');
  const status = $('demoStatus'), note = $('demoMessage'), effects = $('demoEffects');
  const contextMenu = $('demoMenu');
  const choices = [...document.querySelectorAll('.expression-button')];
  const actions = Object.fromEntries([...document.querySelectorAll('.demo-panel [data-action]')]
    .map(button => [button.dataset.action, button]));

  const pet = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, radius: 52, size: 140 };
  const ball = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, radius: 19, size: 46 };
  const pointer = { x: 0, y: 0, time: 0, present: false };
  const look = { gx: 0, gy: 0 };
  let width = 0, ground = 0, initialized = false, grabbed = null, suppressClick = 0;
  let state = 'observando', emotionTime = 0, anger = 0, activity = '', paused = false;
  let pilot = false, caught = false, lastAlt = -Infinity, lastCaress = -Infinity, caressDistance = 0;
  let clock = 0, last = 0, noteUntil = 0, nextMove = 2, nextKick = 0, nextWink = 7.4;
  let winkAt = -Infinity, squash = 0;
  let juggle = null, notebookFrame = -1, lastToyFrame = '';
  let demoVisible = true, animation = 0, particleList = [];
  let thoughtHide = 0;
  const thoughts = ['Oi, humano!', 'Isso faz cócegas!', 'De novo? ♡', 'Tô de olho em você.'];
  const expressions = {
    observando: 'Bolha está observando', feliz: 'Bolha está feliz', curioso: 'Bolha está curiosa',
    bravo: 'Bolha está brava', dormindo: 'Bolha pegou no sono', atento: 'Bolha está concentrada',
    travesso: 'Bolha quer brincar', assustado: 'Bolha tomou um susto', comemorando: 'Bolha está comemorando',
  };

  function say(text) {
    if (status.textContent !== text) status.textContent = text;
  }

  function message(text, duration = 2.4) {
    window.clearTimeout(thoughtHide);
    note.textContent = text;
    note.hidden = false;
    noteUntil = clock + duration;
    note.classList.add('visible');
    positionNote();
  }

  function hideMessage() {
    if (!note.classList.contains('visible')) return;
    note.classList.remove('visible');
    thoughtHide = window.setTimeout(() => { note.hidden = true; }, motion.matches ? 0 : 130);
  }

  function setExpression(value, text = expressions[value]) {
    state = value;
    emotionTime = clock;
    if (text) say(text);
    for (const button of choices) {
      const selected = button.dataset.expression === value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  function reflectControls() {
    actions.toy.setAttribute('aria-pressed', String(!ballButton.hidden));
    actions.toy.textContent = ballButton.hidden ? 'Mostrar brinquedo' : 'Guardar brinquedo';
    actions.notebook.setAttribute('aria-pressed', String(activity === 'notebook'));
    actions.juggle.setAttribute('aria-pressed', String(activity === 'juggle'));
    actions.cursor.setAttribute('aria-pressed', String(pilot));
    actions.pause.setAttribute('aria-pressed', String(paused));
    actions.pause.textContent = paused ? 'Retomar' : 'Pausar';
  }

  function setToyVisible(visible) {
    ballButton.hidden = !visible;
    if (visible) {
      const offset = pet.x < width / 2 ? 1 : -1;
      Object.assign(ball, {
        x: clamp(pet.x + offset * (pet.radius + ball.radius + 37), ball.radius + 9, width - ball.radius - 9),
        y: Math.max(ball.radius, Math.min(ground - ball.radius, pet.y - 15)),
        vx: 0, vy: 0, spin: 0,
      });
      fitArt();
    }
    reflectControls();
  }

  function finishActivity() {
    activity = '';
    juggle = null;
    notebookButton.hidden = true;
    reflectControls();
  }

  function stopGuide() {
    pilot = caught = false;
    stage.classList.remove('cursor-caught');
    reflectControls();
  }

  function selectExpression(value) {
    pause(false);
    stopGuide();
    finishActivity();
    if (value === 'dormindo') {
      pet.vx *= .25;
      pet.spin = 0;
      message('Boa noite…');
    } else if (value === 'feliz') {
      burst(['♡', '♥', '♡'], pet.x, pet.y - pet.radius * .5);
    }
    setExpression(value);
    nextMove = clock + 2;
  }

  function caress() {
    pause(false);
    if (clock - lastCaress < .45) return;
    lastCaress = clock;
    anger *= .47;
    if (state === 'dormindo') {
      setExpression('curioso', 'Bolha acordou com o carinho');
    } else {
      setExpression('feliz');
    }
    burst(['♡', '♥', '♡'], pet.x, pet.y - pet.radius * .5);
    message(thoughts[Math.floor(Math.random() * thoughts.length)]);
  }

  function pause(value) {
    if (value === paused) return;
    paused = value;
    last = 0;
    if (paused) {
      stopGuide();
      hideMessage();
      say('Bolha pausada');
    } else {
      say(expressions[state]);
    }
    reflectControls();
    requestFrame();
  }

  function startJuggling() {
    finishActivity();
    stopGuide();
    setToyVisible(true);
    activity = 'juggle';
    juggle = { count: 0, target: 1 + Math.floor(Math.random() * 100), start: clock + .38 };
    pet.vx = pet.spin = 0;
    setExpression('travesso', 'Bolha vai fazer embaixadinhas');
  }

  function chooseActivity(name) {
    if (name === 'pause') {
      pause(!paused);
      return;
    }
    pause(false);
    if (name === 'toy') {
      const show = ballButton.hidden;
      finishActivity();
      stopGuide();
      setToyVisible(show);
      setExpression(show ? 'travesso' : 'observando', show ? 'Bolha quer brincar' : 'Brinquedo guardado');
    } else if (name === 'cursor') {
      if (pilot) {
        stopGuide();
        setExpression('observando');
      } else {
        finishActivity();
        pilot = true;
        setExpression('curioso', 'Mova o ponteiro pelo desktop e clique para soltá-lo');
        stage.focus({ preventScroll: true });
      }
    } else if (activity === name) {
      finishActivity();
      setExpression('observando');
    } else if (name === 'juggle') {
      startJuggling();
    } else if (name === 'notebook') {
      finishActivity();
      stopGuide();
      activity = 'notebook';
      pet.vx = pet.spin = 0;
      notebookButton.hidden = false;
      notebookFrame = -1;
      fitArt();
      setExpression('atento', 'Bolha está usando o notebook');
    }
    reflectControls();
  }

  function fitArt() {
    art.fit(petCanvas);
    if (!ballButton.hidden) art.fit(ballCanvas);
    if (!notebookButton.hidden) art.fit(notebookCanvas);
  }

  function resize() {
    width = stage.clientWidth;
    ground = stage.clientHeight - taskbar.offsetHeight;
    pet.size = petButton.offsetWidth;
    pet.radius = pet.size * 49 / 120;
    ball.size = parseFloat(getComputedStyle(ballButton).width);
    ball.radius = ball.size * 39 / 88;
    if (!initialized) {
      pet.x = width * .55;
      pet.y = ground - pet.radius;
      initialized = true;
    }
    for (const body of [pet, ball]) {
      body.x = clamp(body.x, body.radius + 5, width - body.radius - 5);
      body.y = clamp(body.y, body.radius, ground - body.radius);
    }
    lastToyFrame = '';
    notebookFrame = -1;
    fitArt();
    render();
  }

  function local(event) {
    const box = stage.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function pointerMove(event) {
    const point = local(event);
    const now = performance.now();
    const step = Math.max(.012, Math.min(.16, (now - pointer.time) / 1000));
    if (pointer.present && !paused && !grabbed && event.pointerType !== 'touch') {
      const dx = point.x - pointer.x, dy = point.y - pointer.y;
      if (distance(point, pet) < pet.radius * .86 && !pilot && !activity) {
        caressDistance += Math.abs(dx);
        if (caressDistance > 40) {
          caress();
          caressDistance = 0;
        }
      } else {
        caressDistance = 0;
      }
      if (!ballButton.hidden && !activity && distance(point, ball) < ball.radius + 19 && Math.hypot(dx, dy) > 1.8) {
        ball.vx = clamp(ball.vx + dx / step * .28, -380, 380);
        if (dy < -2) ball.vy = Math.min(ball.vy, clamp(dy / step * .56, -430, -90));
        ball.spin = ball.vx * 1.6;
      }
    }
    Object.assign(pointer, point, { time: now, present: true });
  }

  function beforeGrab(event, body, button) {
    if (event.button !== 0 || grabbed || (body === ball && activity)) return;
    const point = local(event);
    if (distance(point, body) > body.radius + 4) return;
    pause(false);
    if (body === pet) finishActivity();
    const now = performance.now();
    grabbed = { body, button, id: event.pointerId, now, offsetX: body.x - point.x,
      offsetY: body.y - point.y, start: point, moved: false, samples: [{ x: body.x, y: body.y, now }] };
    body.vx = body.vy = body.spin = 0;
    button.setPointerCapture(event.pointerId);
    button.classList.add('dragging');
  }

  function moveGrab(event) {
    if (grabbed?.id !== event.pointerId) return;
    const point = local(event), { body, samples, start, offsetX, offsetY } = grabbed;
    const now = performance.now();
    grabbed.moved ||= distance(start, point) > 5;
    if (grabbed.moved && body === pet && state === 'dormindo') {
      setExpression('curioso', 'Bolha acordou quando foi movida');
    }
    body.x = clamp(point.x + offsetX, body.radius + 4, width - body.radius - 4);
    body.y = clamp(point.y + offsetY, body.radius, ground - body.radius);
    samples.push({ x: body.x, y: body.y, now });
    while (samples.length > 2 && samples[1].now < now - 90) samples.shift();
  }

  function releaseGrab(event) {
    if (grabbed?.id !== event.pointerId) return;
    const { body, button, samples, moved, now } = grabbed;
    grabbed = null;
    button.classList.remove('dragging');
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    const elapsed = performance.now() - now;
    if (moved || elapsed > 550 || event.type !== 'pointerup') suppressClick = performance.now() + 320;
    const start = samples[0], end = samples.at(-1);
    const delta = Math.max(.025, (end.now - start.now) / 1000);
    if (moved && event.type === 'pointerup' && performance.now() - end.now < 92) {
      body.vx = clamp((end.x - start.x) / delta * .93, -950, 950);
      body.vy = clamp((end.y - start.y) / delta * .83, -800, 820);
    }
    body.spin = clamp(body.vx * .72, -610, 610);
    if (body === pet && moved) {
      nextMove = clock + 2.5;
      if (Math.hypot(body.vx, body.vy) > 540) {
        anger = Math.max(.26, anger);
        setExpression(anger > .45 ? 'bravo' : 'assustado', 'Bolha foi arremessada');
      } else {
        say('Bolha foi solta');
      }
    }
  }

  function fall(body, dt, bounce) {
    body.vy += 1190 * dt;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    const left = body.radius + 5, right = width - body.radius - 5;
    if (body.x < left || body.x > right) {
      body.vx = -body.vx * .63;
      body.x = clamp(body.x, left, right);
    }
    if (body.y <= body.radius) {
      body.y = body.radius;
      body.vy = Math.abs(body.vy) * .46;
    }
    if (body.y >= ground - body.radius) {
      if (body === pet && body.vy > 125) squash = Math.min(.19, body.vy / 2600);
      body.y = ground - body.radius;
      body.vy = body.vy > 76 ? -body.vy * bounce : 0;
      body.vx *= Math.pow(.25, dt);
      body.spin *= Math.pow(.1, dt);
    }
    if (Math.abs(body.vx) < 4) body.vx = 0;
    body.angle = (body.angle + body.spin * dt) % 360;
  }

  function play(dt) {
    if (juggle) {
      const cycle = .69, time = clock - juggle.start;
      if (time < 0) return;
      const count = Math.floor(time / cycle) + 1;
      if (count > juggle.target) {
        const finalCount = juggle.target;
        finishActivity();
        ball.vx = 127;
        ball.vy = -85;
        setExpression('comemorando', `Bolha fez ${finalCount} embaixadinhas`);
        message(`${finalCount}! ✦`, 2.8);
        burst(['✦', '✧', '✦', '♡'], pet.x, pet.y - pet.radius);
        nextKick = clock + 3;
        return;
      }
      const progress = (time % cycle) / cycle;
      const amplitude = Math.min(118, ground * .27);
      ball.x = clamp(pet.x + Math.sin(time * 6) * 13, ball.radius + 5, width - ball.radius - 5);
      ball.y = Math.max(ball.radius + 6, pet.y - pet.radius - ball.radius + 10 - 4 * progress * (1 - progress) * amplitude);
      ball.angle += 140 * dt;
      if (count !== juggle.count) {
        juggle.count = count;
        pet.vy = -122;
        message(String(count), .65);
      }
      return;
    }
    if (grabbed?.body !== ball) fall(ball, dt, .58);
    if (activity || pilot || grabbed?.body === pet || state === 'dormindo') return;
    const gap = ball.x - pet.x, contact = pet.radius + ball.radius;
    if (!motion.matches && Math.abs(gap) > contact) {
      const direction = Math.sign(gap);
      pet.vx += clamp(direction * 147 - pet.vx, -350 * dt, 350 * dt);
      pet.spin = pet.vx * .9;
      if (ball.y < pet.y - 36 && pet.vy === 0 && clock > nextKick) pet.vy = -255;
    }
    if (distance(pet, ball) < contact + 5 && clock > nextKick && grabbed?.body !== ball) {
      const edge = width * .19;
      const direction = ball.x > width - edge ? -1 : ball.x < edge ? 1 : (Math.sign(gap) || 1);
      ball.vx = direction * (140 + Math.random() * 170);
      ball.vy = -210 - Math.random() * 155;
      ball.spin = ball.vx * 2;
      pet.vy = Math.min(pet.vy, -110);
      squash = .1;
      nextKick = clock + 1.35;
      burst(['✦'], pet.x + gap * .65, (pet.y + ball.y) / 2);
    }
  }

  function step(dt) {
    if (grabbed?.body === pet) {
      const heldFor = (performance.now() - grabbed.now) / 1000;
      if (heldFor > 1.25) {
        anger = Math.max(anger, clamp((heldFor - 1.25) / 2.1, 0, 1));
        if (state !== 'bravo') setExpression('bravo', 'Bolha está ficando brava');
      }
    } else {
      if (pilot && pointer.present) {
        const dx = pointer.x - pet.x, dy = pointer.y - pet.y;
        const targetX = clamp(pointer.x, pet.radius + 5, width - pet.radius - 5);
        const targetY = clamp(pointer.y, pet.radius, ground - pet.radius);
        const desired = Math.hypot(targetX - pet.x, targetY - pet.y);
        pet.vx = pet.vy = 0;
        if (desired > 3) {
          const amount = Math.min(1, dt * (caught ? 16 : 4.8));
          pet.x += (targetX - pet.x) * amount;
          pet.y += (targetY - pet.y) * amount;
        }
        if (!caught && Math.hypot(dx, dy) < pet.radius + 18) {
          caught = true;
          stage.classList.add('cursor-caught');
          say('Bolha pegou o cursor. Clique para soltar.');
        }
      } else {
        fall(pet, dt, .39);
      }
      const angerGoal = state === 'bravo' && emotionTime + 4 > clock ? .8 : 0;
      anger += (angerGoal - anger) * Math.min(1, dt * (angerGoal ? 3.5 : .8));
    }
    if (!ballButton.hidden) play(dt);
    if (!motion.matches && !activity && !pilot && !grabbed && ballButton.hidden
        && state !== 'dormindo' && state !== 'bravo' && state !== 'assustado' && clock > nextMove) {
      const direction = pet.x > width * .65 ? -1 : pet.x < width * .35 ? 1 : (Math.random() < .5 ? -1 : 1);
      pet.vx = direction * (62 + Math.random() * 60);
      pet.vy = -95 - Math.random() * 65;
      pet.spin = pet.vx * .6;
      nextMove = clock + 6 + Math.random() * 7;
    }
    if (!motion.matches && !pilot && !grabbed && !activity && state !== 'dormindo' && state !== 'bravo' && clock > nextWink) {
      winkAt = clock;
      nextWink = clock + 11 + Math.random() * 9;
    }
    if ((state === 'bravo' && clock - emotionTime > 4 && anger < .16)
        || (state === 'assustado' && clock - emotionTime > 1.6)
        || (state === 'comemorando' && clock - emotionTime > 3)) {
      setExpression('observando');
    }
    if (state === 'feliz' && clock - emotionTime > 3 && !choices[0].matches(':focus-visible')) {
      setExpression('observando');
    }
    if (!activity && !pilot && !grabbed && ballButton.hidden && state === 'observando'
        && clock - emotionTime > 62 && performance.now() - pointer.time > 12000) {
      setExpression('dormindo');
    }
    squash *= Math.pow(.0008, dt);
  }

  function positionNote() {
    if (note.hidden) return;
    const left = clamp(pet.x - note.offsetWidth / 2, 10, width - note.offsetWidth - 10);
    const below = pet.y - pet.radius - note.offsetHeight - 13 < 8;
    const top = below ? Math.min(ground - note.offsetHeight - 8, pet.y + pet.radius + 12)
      : pet.y - pet.radius - note.offsetHeight - 12;
    note.classList.toggle('below', below);
    note.style.setProperty('--tail', clamp(pet.x - left - 3, 10, note.offsetWidth - 15) + 'px');
    place(note, left, top);
  }

  function burst(chars, x, y) {
    if (motion.matches) return;
    for (const [index, character] of chars.entries()) {
      const span = document.createElement('span');
      span.className = 'demo-mark';
      span.textContent = character;
      effects.append(span);
      particleList.push({ span, x, y, start: clock, dx: (index - (chars.length - 1) / 2) * 19 });
    }
  }

  const marks = ['z', 'z', 'z'].map(text => {
    const mark = document.createElement('span');
    mark.className = 'demo-mark';
    mark.textContent = text;
    mark.hidden = true;
    effects.append(mark);
    return mark;
  });
  const irritation = document.createElement('span');
  irritation.className = 'demo-mark irritated';
  irritation.innerHTML = '<svg viewBox="-10 -10 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M-8-2Q-2-2-2-8M2-8Q2-2 8-2M8 2Q2 2 2 8M-2 8Q-2 2-8 2"/></svg>';
  irritation.hidden = true;
  effects.append(irritation);

  function place(node, x, y, details = '') {
    node.style.transform = `translate3d(${x}px, ${y}px, 0)${details}`;
  }

  function placeMark(mark, dx, dy, angle) {
    const radians = angle * Math.PI / 180;
    const x = pet.x + Math.cos(radians) * dx - Math.sin(radians) * dy;
    const y = pet.y + Math.sin(radians) * dx + Math.cos(radians) * dy;
    place(mark, x, y, ` rotate(${angle}deg)`);
  }

  function renderEffects(angle) {
    for (const [index, mark] of marks.entries()) {
      mark.hidden = state !== 'dormindo';
      if (!mark.hidden) {
        const phase = motion.matches ? index / 3 : (clock / 2.4 + index / 3) % 1;
        mark.style.opacity = String(clamp(Math.min(phase / .2, (1 - phase) / .25), 0, .95));
        mark.style.fontSize = `${11 + phase * 6}px`;
        placeMark(mark, pet.radius * (.62 + phase * .17), -pet.radius * (.54 + phase * .64), angle);
      }
    }
    irritation.hidden = anger < .48;
    if (!irritation.hidden) {
      irritation.style.opacity = String(anger);
      placeMark(irritation, pet.radius * .65, -pet.radius * .76, angle);
    }
    particleList = particleList.filter(({ span, x, y, start, dx }) => {
      const age = (clock - start) / .8;
      if (age > 1) {
        span.remove();
        return false;
      }
      place(span, x + dx * age, y - age * 46, ` scale(${.77 + age * .4})`);
      span.style.opacity = String(1 - age);
      return true;
    });
  }

  function wink(progress, start) {
    const age = progress - start;
    if (age < 0 || age > .34) return 0;
    if (age < .10) return .5 - .5 * Math.cos(Math.PI * age / .1);
    if (age < .22) return 1;
    return .5 + .5 * Math.cos(Math.PI * (age - .22) / .12);
  }

  function render() {
    if (!demoVisible || !initialized) return;
    const sleeping = state === 'dormindo';
    const working = activity === 'notebook';
    const notebookWidth = working ? notebookButton.offsetWidth : 0;
    const notebookHeight = working ? notebookButton.offsetHeight : 0;
    const notebookSide = pet.x > width * .56 ? -1 : 1;
    const notebookX = clamp(pet.x + notebookSide * pet.radius * .85 - (notebookSide < 0 ? notebookWidth : 0),
      8, width - notebookWidth - 8);
    const ease = clamp((clock - emotionTime) / .85, 0, 1);
    const wobble = !motion.matches && grabbed?.body === pet && anger > .3 ? Math.sin(clock * 46) * anger * 8 : 0;
    const typingTilt = motion.matches ? 0 : Math.sin(clock * 16) * 1.6;
    const angle = sleeping ? pet.angle * (1 - ease) - 16 * ease
      : working ? notebookSide * (7 + typingTilt) : pet.angle + wobble;
    const deform = motion.matches ? squash * .15 : squash + (sleeping ? Math.sin(clock * 2.5) * .023 : 0);
    const half = pet.size / 2;
    place(petButton, pet.x - half, pet.y - half, ` rotate(${angle}deg) scale(${1 + deform}, ${1 - deform})`);
    let target = pointer.present ? pointer : null;
    if (!ballButton.hidden && (!pointer.present || activity || distance(pointer, pet) > pet.radius * 3)) target = ball;
    if (working) target = { x: notebookX + notebookWidth * .5, y: ground - notebookHeight * .3 };
    const gazeX = target ? clamp((target.x - pet.x) / 87, -1, 1) : 0;
    const gazeY = target ? clamp((target.y - pet.y) / 83, -1, 1) : 0;
    const radians = angle * Math.PI / 180;
    const gx = Math.cos(radians) * gazeX + Math.sin(radians) * gazeY;
    const gy = -Math.sin(radians) * gazeX + Math.cos(radians) * gazeY;
    look.gx += (clamp(gx, -1, 1) - look.gx) * .18;
    look.gy += (clamp(gy, -1, 1) - look.gy) * .18;
    const blink = sleeping ? ease : naturalBlink(clock);
    const progress = clock - winkAt;
    const talking = note.classList.contains('visible') && clock < noteUntil - .32;
    const chew = caught ? (motion.matches ? .35 : .3 + .45 * Math.sin(clock * 12) ** 2) : 0;
    const opening = caught ? .34 + chew * .28 : talking && !sleeping ? .11 + .32 * Math.sin(clock * 19) ** 2
      : state === 'feliz' && ease < .6 ? .29 * (1 - ease) : 0;
    art.draw(petCanvas, { emotion: state, anger, gx: look.gx, gy: look.gy, blink, mouth: opening,
      left: wink(progress, .03), right: wink(progress, .43), ear: wobble * .65, blend: Math.max(anger, .1),
      chew, cursor: caught });
    if (!ballButton.hidden) {
      place(ballButton, ball.x - ball.size / 2, ball.y - ball.size / 2, ` rotate(${ball.angle}deg)`);
      const kind = $('toyKind').value;
      if (lastToyFrame !== kind) {
        if (art.drawObject(ballCanvas, kind)) lastToyFrame = kind;
      }
    }
    if (working) {
      place(notebookButton, notebookX, ground - notebookHeight);
      const frame = motion.matches ? 0 : Math.floor(clock * 8) % 12;
      if (frame !== notebookFrame) {
        if (art.drawObject(notebookCanvas, 'notebook', frame)) notebookFrame = frame;
      }
    }
    if (clock >= noteUntil) hideMessage();
    positionNote();
    renderEffects(angle);
  }

  function naturalBlink(seconds) {
    if (motion.matches) return 0;
    const t = seconds % 5.36;
    return t > 5.08 ? Math.sin((t - 5.08) / .28 * Math.PI) ** 2 : 0;
  }

  function frame(timestamp) {
    animation = 0;
    const dt = last ? Math.min(.035, (timestamp - last) / 1000) : 0;
    last = timestamp;
    if (!paused && demoVisible) {
      clock += dt;
      step(dt);
    }
    render();
    requestFrame();
  }

  function requestFrame() {
    if (!animation && !document.hidden && demoVisible && !paused) animation = requestAnimationFrame(frame);
  }

  for (const [button, body] of [[petButton, pet], [ballButton, ball]]) {
    button.addEventListener('pointerdown', event => beforeGrab(event, body, button));
    button.addEventListener('pointermove', moveGrab);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, releaseGrab);
    button.addEventListener('wheel', event => {
      if (!grabbed && !paused) {
        event.preventDefault();
        body.angle += event.deltaY < 0 ? -26 : 26;
        body.spin = event.deltaY < 0 ? -90 : 90;
      }
    }, { passive: false });
  }
  petButton.addEventListener('click', event => {
    if (performance.now() > suppressClick && (!event.detail || distance(local(event), pet) <= pet.radius + 5)) caress();
  });
  ballButton.addEventListener('click', event => {
    if (!activity && performance.now() > suppressClick && (!event.detail || distance(local(event), ball) <= ball.radius + 5)) {
      ball.vy = -275;
    }
  });
  notebookButton.addEventListener('click', () => chooseActivity('notebook'));
  for (const button of choices) button.addEventListener('click', () => selectExpression(button.dataset.expression));
  for (const [name, button] of Object.entries(actions)) button.addEventListener('click', () => chooseActivity(name));
  $('toyKind').addEventListener('change', event => {
    ballButton.setAttribute('aria-label', event.target.value === 'ball' ? 'Bolinha de brincar' : 'Amendoim de brincar');
    lastToyFrame = '';
  });
  stage.addEventListener('pointermove', pointerMove);
  stage.addEventListener('pointerleave', () => { pointer.present = false; caressDistance = 0; });
  stage.addEventListener('pointerdown', event => {
    pointerMove(event);
    if (pilot && event.button === 0) {
      stopGuide();
      suppressClick = performance.now() + 320;
      setExpression('timido', 'Bolha soltou o cursor');
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  stage.addEventListener('keydown', event => {
    if (event.code === 'AltLeft' && !event.ctrlKey && !event.shiftKey) event.preventDefault();
    if (event.key === 'Escape') {
      if (!contextMenu.hidden) {
        contextMenu.hidden = true;
        petButton.focus({ preventScroll: true });
      } else if (pilot) chooseActivity('cursor');
      else if (activity) chooseActivity(activity);
    }
  });
  stage.addEventListener('keyup', event => {
    if (event.code !== 'AltLeft') return;
    const now = performance.now();
    if (now - lastAlt < 420) {
      event.preventDefault();
      chooseActivity('cursor');
      lastAlt = -Infinity;
    } else {
      lastAlt = now;
    }
  });
  petButton.addEventListener('contextmenu', event => {
    event.preventDefault();
    const point = event.clientX ? local(event) : pet;
    contextMenu.hidden = false;
    contextMenu.style.left = clamp(point.x, 7, width - contextMenu.offsetWidth - 7) + 'px';
    contextMenu.style.top = clamp(point.y, 7, ground - contextMenu.offsetHeight - 7) + 'px';
    contextMenu.querySelector('button').focus({ preventScroll: true });
  });
  contextMenu.addEventListener('click', event => {
    const command = event.target.closest('button')?.dataset.command;
    if (!command) return;
    contextMenu.hidden = true;
    if (command === 'caress') caress();
    else if (command === 'sleep') selectExpression('dormindo');
    else chooseActivity(command);
    petButton.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => {
    if (!contextMenu.contains(event.target) && event.button === 0) contextMenu.hidden = true;
  });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => {
    demoVisible = entries[0].isIntersecting;
    last = 0;
    requestFrame();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; requestFrame(); });
  resize();
  reflectControls();
  requestFrame();
})();
