// AcessaFácil — content script
// Só manipula DOM e faz ponte com background.js. Nunca chama fetch diretamente.

const state = {
  fontLevel: 0,
  contrast: false,
  simplifyVisual: false,
  explainMode: false,
  synth: window.speechSynthesis,
  originalHTML: null,
  simplifiedTarget: null,
};

// Restaura ajustes salvos imediatamente ao carregar em cada página
chrome.storage.local.get(['textoMaior', 'contraste', 'simplificar'], (salvo) => {
  if (salvo.textoMaior)  { state.fontLevel = 2;    applyFontSize(2);          }
  if (salvo.contraste)   { state.contrast = true;   applyHighContrast(true);   }
  if (salvo.simplificar) { state.simplifyVisual = true; applySimplifyVisual(true); }
});

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

    case 'SHOW_SUMMARY':
      showSummaryCard(message.text);
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

    case 'OPEN_ASSISTANT':
      openAssistantDrawer();
      break;

    case 'OPEN_VOICE_ASSISTANT':
      openVoiceAssistant();
      break;

    case 'SHOW_HELP':
      showHelp();
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

// ---------- Resumo da página (card no topo — Superfície 6A) ----------

function showSummaryCard(text) {
  removeElement('acessafacil-summary');

  const card = document.createElement('div');
  card.id = 'acessafacil-summary';
  card.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: #FDFAF6; border-bottom: 3px solid #F08726;
    padding: 16px 20px; font-family: 'Segoe UI', system-ui, Arial, sans-serif;
    font-size: 17px; line-height: 1.7; color: #2C2826;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:10px;';

  const label = document.createElement('span');
  label.textContent = 'RESUMO DA PÁGINA';
  label.style.cssText = 'font-size:11px; font-weight:700; letter-spacing:1.2px; color:#F08726; text-transform:uppercase;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '× Fechar';
  closeBtn.style.cssText = `
    margin-left:auto; padding:5px 12px; background:#F08726; color:white;
    border:none; border-radius:6px; cursor:pointer; font-size:14px;
  `;
  closeBtn.addEventListener('click', () => card.remove());

  header.appendChild(label);
  header.appendChild(closeBtn);

  const ouvir = document.createElement('button');
  ouvir.textContent = '🔊 Ouvir';
  ouvir.style.cssText = `
    padding:6px 14px; background:transparent; color:#2C2826;
    border:1px solid #DDD5C8; border-radius:6px; cursor:pointer;
    font-size:14px; margin-top:10px;
  `;
  ouvir.addEventListener('click', () => readAloud(text));

  const content = document.createElement('p');
  content.textContent = text;
  content.style.margin = '0';

  card.appendChild(header);
  card.appendChild(content);
  card.appendChild(ouvir);
  document.body.appendChild(card);

  // Empurra o conteúdo da página para baixo
  document.body.style.marginTop = `${card.offsetHeight + 8}px`;
  card.addEventListener('remove', () => { document.body.style.marginTop = ''; });
  closeBtn.addEventListener('click', () => { document.body.style.marginTop = ''; });
}

// ---------- Drawer do assistente (Superfície 4A) ----------

function openAssistantDrawer() {
  if (document.getElementById('acessafacil-drawer')) {
    document.getElementById('acessafacil-drawer').style.transform = 'translateX(0)';
    return;
  }

  const drawer = document.createElement('div');
  drawer.id = 'acessafacil-drawer';
  drawer.style.cssText = `
    position: fixed; right: 0; top: 0; bottom: 0; width: 320px;
    background: #F5F0E8; border-left: 3px solid #F08726;
    z-index: 2147483647; display: flex; flex-direction: column;
    font-family: 'Segoe UI', system-ui, Arial, sans-serif;
    box-shadow: -8px 0 32px rgba(0,0,0,0.18);
    transform: translateX(320px); transition: transform 0.28s ease;
  `;

  // Header do drawer
  const drawerHeader = document.createElement('div');
  drawerHeader.style.cssText = `
    display:flex; align-items:center; gap:10px; padding:16px;
    background:#F5F0E8; border-bottom:1px solid #DDD5C8;
  `;

  const avatarEl = document.createElement('div');
  avatarEl.textContent = '🤖';
  avatarEl.style.cssText = 'font-size:28px; line-height:1;';

  const drawerInfo = document.createElement('div');
  drawerInfo.innerHTML = '<strong style="display:block;font-size:16px;">Ajudante</strong><span style="font-size:13px;color:#7A6F65;">Pergunte o que quiser</span>';

  const fecharBtn = document.createElement('button');
  fecharBtn.textContent = '×';
  fecharBtn.setAttribute('aria-label', 'Fechar ajudante');
  fecharBtn.style.cssText = `
    margin-left:auto; background:none; border:none; font-size:26px;
    cursor:pointer; color:#7A6F65; line-height:1; padding:4px;
  `;
  fecharBtn.addEventListener('click', () => {
    drawer.style.transform = 'translateX(320px)';
    setTimeout(() => drawer.remove(), 300);
  });

  drawerHeader.appendChild(avatarEl);
  drawerHeader.appendChild(drawerInfo);
  drawerHeader.appendChild(fecharBtn);

  // Área de mensagens
  const mensagens = document.createElement('div');
  mensagens.id = 'acessafacil-mensagens';
  mensagens.style.cssText = 'flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;';

  // Mensagem inicial
  adicionarMensagem(mensagens, 'assistente', 'Olá! Como posso te ajudar hoje? Pode escrever ou falar.');

  // Área de input
  const inputArea = document.createElement('div');
  inputArea.style.cssText = 'padding:12px; border-top:1px solid #DDD5C8; display:flex; gap:8px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Escreva ou fale...';
  input.setAttribute('aria-label', 'Mensagem para o assistente');
  input.style.cssText = `
    flex:1; padding:10px 14px; border:2px solid #DDD5C8; border-radius:8px;
    font-size:15px; font-family:'Segoe UI',system-ui,Arial,sans-serif;
    background:white; color:#2C2826;
  `;
  input.addEventListener('focus', () => { input.style.borderColor = '#F08726'; });
  input.addEventListener('blur', () => { input.style.borderColor = '#DDD5C8'; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarPergunta(); });

  const enviarBtn = document.createElement('button');
  enviarBtn.textContent = '🎙️';
  enviarBtn.setAttribute('aria-label', 'Falar');
  enviarBtn.style.cssText = `
    width:44px; height:44px; background:#F08726; color:white; border:none;
    border-radius:8px; font-size:20px; cursor:pointer;
  `;
  enviarBtn.addEventListener('click', iniciarVozNoDrawer);

  inputArea.appendChild(input);
  inputArea.appendChild(enviarBtn);

  // Botão enviar por texto
  const enviarTextoBtn = document.createElement('button');
  enviarTextoBtn.textContent = 'Perguntar →';
  enviarTextoBtn.style.cssText = `
    width:100%; padding:12px; background:#F08726; color:white;
    border:none; border-radius:8px; font-size:16px; font-weight:600;
    cursor:pointer; margin:0 12px 12px;
  `;
  enviarTextoBtn.addEventListener('click', enviarPergunta);

  drawer.appendChild(drawerHeader);
  drawer.appendChild(mensagens);
  drawer.appendChild(inputArea);
  drawer.appendChild(enviarTextoBtn);
  document.body.appendChild(drawer);

  requestAnimationFrame(() => { drawer.style.transform = 'translateX(0)'; });

  function enviarPergunta() {
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';

    adicionarMensagem(mensagens, 'usuario', texto);
    adicionarMensagem(mensagens, 'carregando', '...');

    const contexto = getPageText().slice(0, 1500);

    chrome.runtime.sendMessage(
      { action: 'CALL_API', type: 'assistant', text: texto, context: contexto },
      (resposta) => {
        // Remove o "..."
        mensagens.lastChild?.remove();
        const resultado = resposta?.success
          ? resposta.result
          : 'Desculpe, não consegui responder agora. Tente novamente.';
        adicionarMensagem(mensagens, 'assistente', resultado);
      }
    );
  }

  function iniciarVozNoDrawer() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      adicionarMensagem(mensagens, 'assistente', 'Reconhecimento de voz não está disponível neste navegador.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    enviarBtn.textContent = '⏹️';
    rec.onresult = (e) => {
      input.value = e.results[0][0].transcript;
      enviarBtn.textContent = '🎙️';
      enviarPergunta();
    };
    rec.onerror = () => { enviarBtn.textContent = '🎙️'; };
    rec.onend = () => { enviarBtn.textContent = '🎙️'; };
    rec.start();
  }
}

function adicionarMensagem(container, tipo, texto) {
  const balao = document.createElement('div');
  balao.style.cssText = tipo === 'usuario'
    ? 'background:#F08726;color:white;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:15px;line-height:1.6;align-self:flex-end;max-width:85%;'
    : 'background:white;color:#2C2826;padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:15px;line-height:1.6;align-self:flex-start;max-width:85%;border:1px solid #DDD5C8;';
  balao.textContent = texto;
  container.appendChild(balao);
  container.scrollTop = container.scrollHeight;
}

// ---------- Assistente por voz full-screen (Superfície 4B) ----------

function openVoiceAssistant() {
  removeElement('acessafacil-voice');
  state.synth.cancel();

  injectStyle('af-voice-style', `
    @keyframes af-pulse {
      0%   { box-shadow: 0 0 0 0    rgba(240,135,38,0.5); }
      70%  { box-shadow: 0 0 0 30px rgba(240,135,38,0);   }
      100% { box-shadow: 0 0 0 0    rgba(240,135,38,0);   }
    }
  `);

  const overlay = createElement('div', 'acessafacil-voice', `
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(28,24,20,0.96);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: white;
  `);

  const fechar = document.createElement('button');
  fechar.textContent = '×';
  fechar.setAttribute('aria-label', 'Fechar assistente de voz');
  fechar.style.cssText = `
    position: absolute; top: 20px; right: 24px;
    background: none; border: none; color: rgba(255,255,255,0.6);
    font-size: 38px; cursor: pointer; line-height: 1; padding: 8px;
  `;
  fechar.addEventListener('click', () => { state.synth.cancel(); overlay.remove(); removeStyle('af-voice-style'); });

  const circulo = document.createElement('div');
  circulo.id = 'af-voice-circulo';
  circulo.style.cssText = `
    width: 140px; height: 140px; border-radius: 50%;
    background: #F08726; display: flex; align-items: center; justify-content: center;
    font-size: 58px; margin-bottom: 32px;
    animation: af-pulse 1.5s ease-in-out infinite;
  `;
  circulo.textContent = '🎙️';

  const statusEl = document.createElement('p');
  statusEl.id = 'af-voice-status';
  statusEl.textContent = 'Estou te ouvindo...';
  statusEl.style.cssText = `
    font-size: 26px; font-weight: 600; margin: 0 24px 14px;
    text-align: center; letter-spacing: -0.3px;
  `;

  const transcricaoEl = document.createElement('p');
  transcricaoEl.id = 'af-voice-transcricao';
  transcricaoEl.style.cssText = `
    font-size: 18px; color: rgba(255,255,255,0.65); max-width: 600px;
    text-align: center; min-height: 28px; margin: 0 24px 40px; line-height: 1.6;
  `;

  const respostaEl = document.createElement('div');
  respostaEl.id = 'af-voice-resposta';
  respostaEl.style.cssText = `
    max-width: 600px; width: 90%;
    background: rgba(255,255,255,0.09); border-radius: 14px;
    padding: 20px 24px; font-size: 18px; line-height: 1.8;
    text-align: center; display: none; margin: 0 24px;
  `;

  const btnFalarNovamente = document.createElement('button');
  btnFalarNovamente.id = 'af-voice-falar-novamente';
  btnFalarNovamente.textContent = '🎙️  Falar de novo';
  btnFalarNovamente.style.cssText = `
    margin-top: 32px; padding: 16px 36px; background: #F08726; color: white;
    border: none; border-radius: 12px; font-size: 18px; font-weight: 600;
    cursor: pointer; display: none; min-height: 56px;
  `;
  btnFalarNovamente.addEventListener('click', () =>
    iniciarEscuta(statusEl, transcricaoEl, respostaEl, circulo, btnFalarNovamente)
  );

  overlay.appendChild(fechar);
  overlay.appendChild(circulo);
  overlay.appendChild(statusEl);
  overlay.appendChild(transcricaoEl);
  overlay.appendChild(respostaEl);
  overlay.appendChild(btnFalarNovamente);
  document.body.appendChild(overlay);

  iniciarEscuta(statusEl, transcricaoEl, respostaEl, circulo, btnFalarNovamente);
}

function iniciarEscuta(statusEl, transcricaoEl, respostaEl, circulo, btnFalarNovamente) {
  statusEl.textContent = 'Estou te ouvindo...';
  transcricaoEl.textContent = '';
  respostaEl.style.display = 'none';
  btnFalarNovamente.style.display = 'none';
  circulo.style.animation = 'af-pulse 1.5s ease-in-out infinite';
  state.synth.cancel();

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    statusEl.textContent = 'Reconhecimento de voz não está disponível neste navegador.';
    circulo.style.animation = 'none';
    btnFalarNovamente.style.display = '';
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.interimResults = true;

  rec.onresult = (e) => {
    const texto = Array.from(e.results).map((r) => r[0].transcript).join('');
    transcricaoEl.textContent = `"${texto}"`;
  };

  rec.onend = () => {
    const textoFinal = transcricaoEl.textContent.replace(/^"|"$/g, '').trim();
    if (!textoFinal) {
      statusEl.textContent = 'Não ouvi nada. Tente de novo.';
      circulo.style.animation = 'none';
      btnFalarNovamente.style.display = '';
      return;
    }

    statusEl.textContent = 'Pensando...';
    circulo.style.animation = 'none';

    const contexto = getPageText().slice(0, 1500);
    chrome.runtime.sendMessage(
      { action: 'CALL_API', type: 'assistant', text: textoFinal, context: contexto },
      (r) => {
        const resultado = r?.success
          ? r.result
          : 'Desculpe, não consegui responder agora. Tente de novo.';
        statusEl.textContent = 'Respondendo...';
        respostaEl.textContent = resultado;
        respostaEl.style.display = '';
        btnFalarNovamente.style.display = '';
        readAloud(resultado);
      }
    );
  };

  rec.onerror = () => {
    statusEl.textContent = 'Não ouvi nada. Tente de novo.';
    circulo.style.animation = 'none';
    btnFalarNovamente.style.display = '';
  };

  rec.start();
}

// ---------- Barra flutuante in-page (Superfície 2B — Painel lateral) ----------

let painelAberto = false;

function initFloatingBar() {
  // Não injetar em iframes nem recriar se já existe
  if (window !== window.top) return;
  if (document.getElementById('acessafacil-tab')) return;

  // Estilos dos botões do painel
  injectStyle('acessafacil-painel-style', `
    .af-btn {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 12px 14px; min-height: 48px;
      background: transparent; border: none; cursor: pointer;
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 15px; color: #2C2826; text-align: left;
      transition: background 0.12s;
    }
    .af-btn:hover  { background: #FEF0DC; }
    .af-btn.ativo  { background: #FEF0DC; color: #D97520; font-weight: 600; }
    .af-btn-icone  { font-size: 17px; width: 24px; text-align: center; flex-shrink: 0; }
    .af-btn-ajudante {
      width: 100%; padding: 13px; min-height: 48px;
      background: #F08726; color: white; border: none; border-radius: 8px;
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 15px; font-weight: 600; cursor: pointer;
      transition: background 0.15s;
    }
    .af-btn-ajudante:hover { background: #D97520; }
  `);

  // Aba de acionamento (sempre visível na borda direita)
  const tab = document.createElement('button');
  tab.id = 'acessafacil-tab';
  tab.setAttribute('aria-label', 'Abrir ferramentas AcessaFácil');
  tab.textContent = 'A';
  tab.style.cssText = `
    position: fixed; right: 0; top: 50%; transform: translateY(-50%);
    width: 34px; height: 80px; z-index: 2147483645;
    background: #F08726; color: white; border: none;
    border-radius: 10px 0 0 10px;
    font-size: 20px; font-weight: 800; cursor: pointer;
    font-family: 'Segoe UI', system-ui, Arial, sans-serif;
    box-shadow: -3px 0 14px rgba(0,0,0,0.18);
    transition: width 0.15s;
  `;
  tab.addEventListener('click', abrirPainel);
  document.body.appendChild(tab);

  // Painel lateral
  const painel = document.createElement('div');
  painel.id = 'acessafacil-painel';
  painel.setAttribute('role', 'complementary');
  painel.setAttribute('aria-label', 'Ferramentas de acessibilidade');
  painel.style.cssText = `
    position: fixed; right: 0; top: 50%; transform: translateY(-50%) translateX(100%);
    width: 190px; z-index: 2147483645;
    background: #F5F0E8; border: 2px solid #F08726; border-right: none;
    border-radius: 14px 0 0 14px;
    font-family: 'Segoe UI', system-ui, Arial, sans-serif;
    box-shadow: -6px 0 28px rgba(0,0,0,0.16);
    transition: transform 0.25s ease;
  `;

  // Header do painel
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 14px;background:#F08726;border-radius:12px 0 0 0;';
  header.innerHTML = `
    <span style="font-size:15px;font-weight:700;color:white;flex:1;">AcessaFácil</span>
    <button id="af-fechar" aria-label="Fechar painel"
      style="background:none;border:none;color:white;font-size:22px;cursor:pointer;padding:0;line-height:1;min-width:28px;min-height:28px;">×</button>
  `;

  // Botões de ação
  const acoes = [
    { action: 'aumentar',    icone: 'A+', label: 'Aumentar'      },
    { action: 'simplificar', icone: '✨', label: 'Simplificar'    },
    { action: 'resumir',     icone: '📋', label: 'Resumir'        },
    { action: 'ouvir',       icone: '🔊', label: 'Ler em voz alta'},
    { action: 'explicar',    icone: '🔍', label: 'O que é isso?'  },
  ];

  const botoesDiv = document.createElement('div');
  botoesDiv.style.cssText = 'padding:6px 0;';

  acoes.forEach(({ action, icone, label }) => {
    const btn = document.createElement('button');
    btn.className = 'af-btn';
    btn.dataset.action = action;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = `<span class="af-btn-icone">${icone}</span><span>${label}</span>`;
    btn.addEventListener('click', () => handlePainelAction(action, btn));
    botoesDiv.appendChild(btn);
  });

  // Botão primário — Ajudante
  const rodape = document.createElement('div');
  rodape.style.cssText = 'padding:8px 12px 14px;';
  const btnAjudante = document.createElement('button');
  btnAjudante.className = 'af-btn-ajudante';
  btnAjudante.textContent = '🎙️  Ajudante';
  btnAjudante.addEventListener('click', () => { fecharPainel(); openVoiceAssistant(); });
  rodape.appendChild(btnAjudante);

  painel.appendChild(header);
  painel.appendChild(botoesDiv);
  painel.appendChild(rodape);
  document.body.appendChild(painel);

  // Marcar botões cujo estado já está ativo (restaurado do storage)
  if (state.fontLevel > 0)    botoesDiv.querySelector('[data-action="aumentar"]')?.classList.add('ativo');
  if (state.simplifyVisual)   botoesDiv.querySelector('[data-action="simplificar"]')?.classList.add('ativo');

  document.getElementById('af-fechar').addEventListener('click', fecharPainel);
}

function abrirPainel() {
  painelAberto = true;
  const painel = document.getElementById('acessafacil-painel');
  const tab    = document.getElementById('acessafacil-tab');
  if (painel) painel.style.transform = 'translateY(-50%) translateX(0)';
  if (tab)    tab.style.display = 'none';
}

function fecharPainel() {
  painelAberto = false;
  const painel = document.getElementById('acessafacil-painel');
  const tab    = document.getElementById('acessafacil-tab');
  if (painel) painel.style.transform = 'translateY(-50%) translateX(100%)';
  if (tab)    tab.style.display = '';
}

function handlePainelAction(action, btn) {
  switch (action) {
    case 'aumentar': {
      const novoNivel = state.fontLevel > 0 ? 0 : 2;
      state.fontLevel = novoNivel;
      applyFontSize(novoNivel);
      btn.classList.toggle('ativo', novoNivel > 0);
      chrome.storage.local.set({ textoMaior: novoNivel > 0 });
      break;
    }
    case 'simplificar': {
      simplifyPageTextInline(btn);
      break;
    }
    case 'resumir': {
      btn.disabled = true;
      fecharPainel();
      const texto = getPageText();
      chrome.runtime.sendMessage(
        { action: 'CALL_API', type: 'summarize', text: texto },
        (resposta) => {
          btn.disabled = false;
          if (resposta?.success) showSummaryCard(resposta.result);
        }
      );
      break;
    }
    case 'ouvir': {
      if (state.synth.speaking) {
        state.synth.cancel();
        btn.classList.remove('ativo');
      } else {
        readAloud(getPageText().slice(0, 3000));
        btn.classList.add('ativo');
      }
      break;
    }
    case 'explicar': {
      fecharPainel();
      enableExplainMode();
      break;
    }
  }
}

// ---------- Simplificação inline de texto (Superfície 3) ----------

function simplifyPageTextInline(btn) {
  if (document.getElementById('acessafacil-simplified')) {
    restoreOriginalContent();
    if (btn) btn.classList.remove('ativo');
    return;
  }

  if (btn) btn.disabled = true;
  fecharPainel();

  const texto = getPageText();
  chrome.runtime.sendMessage(
    { action: 'CALL_API', type: 'simplify', text: texto },
    (resposta) => {
      if (btn) btn.disabled = false;
      if (!resposta?.success) return;
      injectSimplifiedContent(resposta.result, btn);
    }
  );
}

function injectSimplifiedContent(textoSimplificado, btn) {
  const alvo = document.querySelector('article, main, [role="main"]') || document.body;

  state.originalHTML = alvo.innerHTML;
  state.simplifiedTarget = alvo;

  const wrapper = document.createElement('div');
  wrapper.id = 'acessafacil-simplified';
  wrapper.style.cssText = `
    border: 2px dashed #F08726; border-radius: 12px;
    padding: 20px 24px; margin: 0 auto; max-width: 780px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px; line-height: 1.9; color: #2C2826;
  `;

  const badge = document.createElement('div');
  badge.style.cssText = `
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #DDD5C8;
  `;

  const badgeLabel = document.createElement('span');
  badgeLabel.textContent = '✨ Texto simplificado pela IA';
  badgeLabel.style.cssText = `
    font-size: 14px; font-weight: 600; color: #F08726;
    font-family: 'Segoe UI', system-ui, Arial, sans-serif;
  `;

  const btnOuvir = document.createElement('button');
  btnOuvir.textContent = '🔊 Ouvir este texto';
  btnOuvir.style.cssText = `
    padding: 6px 14px; background: transparent; color: #2C2826;
    border: 1px solid #DDD5C8; border-radius: 6px; cursor: pointer;
    font-size: 14px; font-family: 'Segoe UI', system-ui, Arial, sans-serif;
  `;
  btnOuvir.addEventListener('click', () => readAloud(textoSimplificado));

  const btnVoltar = document.createElement('button');
  btnVoltar.textContent = '← Voltar original';
  btnVoltar.style.cssText = `
    margin-left: auto; padding: 6px 14px; background: transparent; color: #7A6F65;
    border: 1px solid #DDD5C8; border-radius: 6px; cursor: pointer;
    font-size: 14px; font-family: 'Segoe UI', system-ui, Arial, sans-serif;
  `;
  btnVoltar.addEventListener('click', () => {
    restoreOriginalContent();
    if (btn) btn.classList.remove('ativo');
  });

  badge.appendChild(badgeLabel);
  badge.appendChild(btnOuvir);
  badge.appendChild(btnVoltar);

  const conteudo = document.createElement('p');
  conteudo.textContent = textoSimplificado;
  conteudo.style.margin = '0';

  wrapper.appendChild(badge);
  wrapper.appendChild(conteudo);

  alvo.innerHTML = '';
  alvo.appendChild(wrapper);

  if (btn) btn.classList.add('ativo');
}

function restoreOriginalContent() {
  if (state.simplifiedTarget && state.originalHTML !== null) {
    state.simplifiedTarget.innerHTML = state.originalHTML;
    state.originalHTML = null;
    state.simplifiedTarget = null;
  }
  state.synth.cancel();
}

// ---------- Ajuda rápida ----------

function showHelp() {
  removeElement('acessafacil-help');

  const help = createElement('div', 'acessafacil-help', `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    z-index: 2147483647; background: #FDFAF6; border: 3px solid #F08726;
    border-radius: 14px; padding: 24px; max-width: 360px; width: 90%;
    font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #2C2826;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
  `);

  const titulo = document.createElement('h2');
  titulo.textContent = 'Como usar o AcessaFácil';
  titulo.style.cssText = 'font-size:18px; margin-bottom:14px; color:#F08726;';

  const lista = document.createElement('ul');
  lista.style.cssText = 'font-size:16px; line-height:1.8; padding-left:20px; margin-bottom:16px;';
  [
    'Clique no ícone "A" no canto do Chrome para abrir',
    'Use os botões para aumentar o texto ou mudar o contraste',
    '"Pedir ajuda" abre o assistente para tirar dúvidas',
    '"Resumir a página" explica o que o site faz',
  ].forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    lista.appendChild(li);
  });

  const fechar = document.createElement('button');
  fechar.textContent = '✓ Entendi';
  fechar.style.cssText = `
    width:100%; padding:12px; background:#F08726; color:white;
    border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer;
  `;
  fechar.addEventListener('click', () => help.remove());

  help.appendChild(titulo);
  help.appendChild(lista);
  help.appendChild(fechar);
  document.body.appendChild(help);
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

// ---------- Auto-inicialização ----------

// Aguarda o DOM estar pronto para injetar a barra flutuante
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingBar);
} else {
  initFloatingBar();
}
