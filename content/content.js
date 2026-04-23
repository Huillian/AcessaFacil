// AcessaFácil — content script
// Só manipula DOM e faz ponte com background.js. Nunca chama fetch diretamente.

const state = {
  fontLevel: 0,     // -1 a 3 (cada nível = +20% no zoom)
  contrast: false,
  simplifyVisual: false,
  explainMode: false,
  synth: window.speechSynthesis,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.action !== 'string') return;

  switch (message.action) {
    case 'GET_PAGE_TEXT':
      sendResponse({ text: getPageText() });
      break;

    case 'SET_FONT_LEVEL':
      state.fontLevel = message.level;
      applyFontSize(state.fontLevel);
      break;

    case 'TOGGLE_CONTRAST':
      state.contrast = message.enabled;
      applyHighContrast(state.contrast);
      break;

    case 'TOGGLE_SIMPLIFY_VISUAL':
      state.simplifyVisual = message.enabled;
      applySimplifyVisual(state.simplifyVisual);
      break;

    case 'INJECT_SIMPLIFIED':
      showFloatingPanel(message.title, message.text);
      break;

    case 'READ_ALOUD':
      readAloud(message.text);
      break;

    case 'STOP_READING':
      state.synth.cancel();
      break;

    case 'ENABLE_EXPLAIN_MODE':
      enableExplainMode();
      break;

    case 'DISABLE_EXPLAIN_MODE':
      disableExplainMode();
      break;
  }

  return true;
});

// ---------- Captura de texto ----------

function getPageText() {
  const clone = document.body.cloneNode(true);
  ['script', 'style', 'noscript', 'nav', 'footer'].forEach((tag) => {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  });
  return clone.innerText.replace(/\s+/g, ' ').trim().slice(0, 16000);
}

// ---------- Ajustes visuais ----------

function applyFontSize(level) {
  removeStyle('acessafacil-font');
  if (level === 0) return;

  const zoom = 1 + level * 0.2;
  // Usa zoom no elemento raiz para escalar tudo uniformemente (incluindo px)
  injectStyle('acessafacil-font', `html { zoom: ${zoom}; }`);
}

function applyHighContrast(enabled) {
  removeStyle('acessafacil-contrast');
  if (!enabled) return;

  injectStyle('acessafacil-contrast', `
    html {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    img, video, canvas, svg, iframe {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `);
}

function applySimplifyVisual(enabled) {
  removeStyle('acessafacil-simplify');
  if (!enabled) return;

  injectStyle('acessafacil-simplify', `
    [class*="banner"], [class*="popup"]:not(dialog),
    [class*="cookie"], [class*="newsletter"],
    [id*="cookie"], [id*="newsletter"],
    .ad, [class*=" ad-"], [id*="-ad-"],
    aside[class*="sidebar"] { display: none !important; }

    body { font-family: Georgia, 'Times New Roman', serif !important; line-height: 1.9 !important; }
    p, li, td, th { font-size: max(18px, 1em) !important; }
  `);
}

// ---------- Painel flutuante (resultado de IA) ----------

function showFloatingPanel(title, text) {
  removeElement('acessafacil-panel');

  const panel = createElement('div', 'acessafacil-panel', `
    position: fixed; top: 20px; right: 20px; width: 360px; max-height: 72vh;
    background: #FDFAF5; color: #2C2C2C;
    border: 3px solid #1A3A5C; border-radius: 14px;
    padding: 20px; overflow-y: auto; z-index: 2147483647;
    font-family: Georgia, serif; font-size: 17px; line-height: 1.75;
    box-shadow: 0 8px 40px rgba(0,0,0,0.35);
  `);

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;';

  const titleEl = document.createElement('strong');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size:16px; color:#1A3A5C;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Fechar';
  closeBtn.style.cssText = `
    padding: 6px 14px; background: #1A3A5C; color: white;
    border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
  `;
  closeBtn.addEventListener('click', () => panel.remove());

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const content = document.createElement('p');
  content.textContent = text; // textContent — nunca innerHTML com dado externo
  content.style.margin = '0';

  panel.appendChild(header);
  panel.appendChild(content);
  document.body.appendChild(panel);
}

// ---------- Leitura em voz alta ----------

function readAloud(text) {
  state.synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.88;
  utterance.pitch = 1;

  // Prefere voz em português se disponível
  const voices = state.synth.getVoices();
  const ptVoice = voices.find((v) => v.lang.startsWith('pt'));
  if (ptVoice) utterance.voice = ptVoice;

  state.synth.speak(utterance);
}

// ---------- Modo "O que é isso?" ----------

function enableExplainMode() {
  if (state.explainMode) return;
  state.explainMode = true;
  document.body.style.cursor = 'help';
  document.addEventListener('click', handleExplainClick, true);

  removeElement('acessafacil-explain-banner');
  const banner = createElement('div', 'acessafacil-explain-banner', `
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483646;
    background: #1A3A5C; color: white; text-align: center;
    padding: 12px 20px; font-size: 16px; font-family: Georgia, serif;
  `);
  banner.textContent = '🔍 Clique em qualquer elemento da página para saber o que é';
  document.body.appendChild(banner);
}

function disableExplainMode() {
  state.explainMode = false;
  document.body.style.cursor = '';
  document.removeEventListener('click', handleExplainClick, true);
  removeElement('acessafacil-explain-banner');
  removeElement('acessafacil-tooltip');
}

function handleExplainClick(event) {
  if (!state.explainMode) return;
  event.preventDefault();
  event.stopPropagation();

  const el = event.target;
  if (el.closest('[id^="acessafacil"]')) return; // ignorar nossa própria UI

  const description = describeElement(el);

  chrome.runtime.sendMessage(
    { action: 'CALL_API', type: 'explain', text: description },
    (response) => {
      const explanation = response?.success
        ? response.result
        : 'Não foi possível explicar agora. Tente novamente.';
      showTooltip(el, explanation);
    }
  );
}

function describeElement(el) {
  const parts = [`Elemento: ${el.tagName.toLowerCase()}`];
  const text = el.textContent?.trim().slice(0, 200);
  if (text) parts.push(`Texto: "${text}"`);
  if (el.getAttribute('aria-label')) parts.push(`Rótulo: ${el.getAttribute('aria-label')}`);
  if (el.getAttribute('placeholder')) parts.push(`Placeholder: ${el.getAttribute('placeholder')}`);
  if (el.getAttribute('alt')) parts.push(`Alt: ${el.getAttribute('alt')}`);
  if (el.getAttribute('href')) parts.push(`Link para: ${el.getAttribute('href').slice(0, 100)}`);
  if (el.getAttribute('type')) parts.push(`Tipo: ${el.getAttribute('type')}`);
  return parts.join('. ');
}

function showTooltip(targetEl, text) {
  removeElement('acessafacil-tooltip');

  const rect = targetEl.getBoundingClientRect();
  const top = Math.min(rect.bottom + 8, window.innerHeight - 160);
  const left = Math.max(Math.min(rect.left, window.innerWidth - 340), 10);

  const tooltip = createElement('div', 'acessafacil-tooltip', `
    position: fixed; z-index: 2147483647;
    top: ${top}px; left: ${left}px;
    max-width: 320px; background: #1A3A5C; color: white;
    padding: 14px 18px; border-radius: 10px;
    font-family: Georgia, serif; font-size: 16px; line-height: 1.65;
    box-shadow: 0 4px 24px rgba(0,0,0,0.45);
  `);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'float:right; background:none; border:none; color:white; cursor:pointer; font-size:18px; margin-left:8px; padding:0;';
  closeBtn.addEventListener('click', () => tooltip.remove());

  const textEl = document.createElement('p');
  textEl.textContent = text;
  textEl.style.margin = '0';

  tooltip.appendChild(closeBtn);
  tooltip.appendChild(textEl);
  document.body.appendChild(tooltip);

  setTimeout(() => tooltip?.remove(), 12000);
}

// ---------- Utilitários ----------

function injectStyle(id, css) {
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

function removeStyle(id) {
  document.getElementById(id)?.remove();
}

function removeElement(id) {
  document.getElementById(id)?.remove();
}

function createElement(tag, id, cssText) {
  const el = document.createElement(tag);
  el.id = id;
  el.style.cssText = cssText;
  return el;
}
