'use strict';

const form = document.querySelector('#report-form');
const fields = document.querySelector('#report-fields');
const review = document.querySelector('#report-review');
const preview = document.querySelector('#report-preview');
const send = document.querySelector('#report-send');
const edit = document.querySelector('#report-edit');
const error = document.querySelector('#report-error');
const progress = document.querySelector('#report-progress');
const consent = form.elements.namedItem('consent');
const media = form.elements.namedItem('media');
const endpoint = 'https://api.kuky.solutions/bolha/v1/reports';
const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const videoFormats = ['mp4', 'webm', 'mov'];
const mb = 1024 * 1024;
let draft;
let sending = false;

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

function suffix(file) {
  const dot = file.name.lastIndexOf('.');
  return dot < 0 ? '' : file.name.slice(dot + 1).toLowerCase();
}

function validateAttachments(files) {
  if (files.length > 3) return 'Escolha até 3 anexos.';
  for (const file of files) {
    const extension = suffix(file);
    const limit = imageFormats.includes(extension) ? 5 : videoFormats.includes(extension) ? 15 : 0;
    if (!limit) return 'Escolha um dos formatos de imagem ou vídeo indicados.';
    if (!file.size || file.size > limit * mb) return 'Confira o tamanho dos anexos.';
  }
  if (files.reduce((size, file) => size + file.size, 0) > 20 * mb) return 'Os anexos juntos podem ter até 20 MB.';
  return '';
}

function addPreview(label, value) {
  if (!value) return;
  const title = document.createElement('dt');
  const detail = document.createElement('dd');
  title.textContent = label;
  detail.textContent = value;
  preview.append(title, detail);
}

function openReview() {
  const files = Array.from(media.files);
  const message = validateAttachments(files);
  if (message) return showError(message);
  const value = name => form.elements.namedItem(name).value.trim();
  const title = value('title');
  const description = value('description');
  if (title.length < 4 || description.length < 8) {
    return showError('Escreva um título e descreva o problema antes de revisar.');
  }
  const data = { title, description, platform: value('platform'), version: value('version'),
    steps: value('steps'), submissionId: crypto.randomUUID() };
  draft = { data, files };
  preview.replaceChildren();
  addPreview('Título', data.title);
  addPreview('Sistema', data.platform);
  addPreview('Versão', data.version || 'Não informada');
  addPreview('O que aconteceu', data.description);
  addPreview('Como repetir', data.steps);
  addPreview('Anexos', files.map(file => file.name).join('\n') || 'Nenhum');
  fields.hidden = true;
  review.hidden = false;
  consent.disabled = false;
  consent.required = true;
  review.querySelector('h2').focus();
}

async function submitReport() {
  if (sending || !consent.checked) return;
  const body = new FormData();
  body.append('data', JSON.stringify({ ...draft.data, consent: true }));
  for (const [index, file] of draft.files.entries()) {
    body.append('media', file, `anexo-${index + 1}.${suffix(file)}`);
  }
  sending = true;
  send.disabled = edit.disabled = consent.disabled = true;
  progress.textContent = 'Enviando relato…';
  progress.hidden = false;
  try {
    const response = await fetch(endpoint, { method: 'POST', body, credentials: 'omit', signal: AbortSignal.timeout(65000) });
    if (response.status === 429) return showError('Muitos envios em pouco tempo. Aguarde alguns minutos e tente novamente.');
    if ([400, 413, 415, 422].includes(response.status)) return showError('Confira o texto, o formato e o tamanho dos anexos.');
    if (!response.ok) throw new Error();
    const { protocol } = await response.json();
    if (typeof protocol !== 'string' || !/^[A-Za-z0-9_-]{8,96}$/.test(protocol)) throw new Error();
    document.querySelector('#report-protocol').textContent = protocol;
    form.reset();
    draft = undefined;
    form.hidden = true;
    const success = document.querySelector('#report-success');
    success.hidden = false;
    success.querySelector('h2').focus();
  } catch {
    showError('Não foi possível confirmar o envio. Tente novamente.');
  } finally {
    sending = false;
    send.disabled = edit.disabled = consent.disabled = false;
    progress.hidden = true;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  showError('');
  if (review.hidden) openReview();
  else void submitReport();
});

edit.addEventListener('click', () => {
  review.hidden = true;
  consent.checked = false;
  consent.disabled = true;
  fields.hidden = false;
  draft = undefined;
  showError('');
  form.elements.namedItem('title').focus();
});

form.hidden = false;
