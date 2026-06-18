// ── Helpers ──────────────────────────────────────────────────────────────────

function setStatus(msg) {
  document.getElementById('status-msg').textContent = msg;
}

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function garantirContentScript(tabId) {
  try {
    // Tenta ping — se responder, content script já está ativo
    await chrome.tabs.sendMessage(tabId, { acao: 'PING' });
  } catch {
    // Content script não responde — injeta agora
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css']
    });
    // Aguarda um momento para o script inicializar
    await new Promise(r => setTimeout(r, 150));
  }
}

async function enviarMensagem(acao, dados = {}) {
  const tab = await getTab();

  // Bloqueia em páginas do Chrome que não aceitam scripts
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    setStatus('Abra um site primeiro ⚠️');
    throw new Error('Página não suportada');
  }

  await garantirContentScript(tab.id);
  return chrome.tabs.sendMessage(tab.id, { acao, ...dados });
}

function marcarAtivo(btnId) {
  document.getElementById(btnId).classList.toggle('ativo');
}

// ── Botões ────────────────────────────────────────────────────────────────────

document.getElementById('btn-texto').addEventListener('click', async () => {
  await enviarMensagem('TEXTO_MAIOR');
  marcarAtivo('btn-texto');
  setStatus('Texto aumentado ✓');
});

document.getElementById('btn-contraste').addEventListener('click', async () => {
  await enviarMensagem('MAIS_CONTRASTE');
  marcarAtivo('btn-contraste');
  setStatus('Contraste ativado ✓');
});

document.getElementById('btn-simplificar').addEventListener('click', async () => {
  await enviarMensagem('SIMPLIFICAR');
  marcarAtivo('btn-simplificar');
  setStatus('Página simplificada ✓');
});

document.getElementById('btn-voz').addEventListener('click', async () => {
  await enviarMensagem('LER_VOZ');
  marcarAtivo('btn-voz');
  setStatus('Lendo em voz alta...');
  window.close();
});

document.getElementById('btn-ajuda').addEventListener('click', async () => {
  await enviarMensagem('ABRIR_ASSISTENTE');
  window.close();
});

document.getElementById('btn-explicar').addEventListener('click', async () => {
  await enviarMensagem('MODO_EXPLICAR');
  setStatus('Clique em qualquer elemento ✓');
  window.close();
});

document.getElementById('btn-resumir').addEventListener('click', async () => {
  setStatus('Gerando resumo...');
  await enviarMensagem('RESUMIR_PAGINA');
  window.close();
});

// ── Restaurar estado dos toggles ao abrir ────────────────────────────────────

async function restaurarEstado() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const estado = await chrome.tabs.sendMessage(tab.id, { acao: 'GET_ESTADO' }).catch(() => ({}));
  if (!estado) return;
  if (estado.textoMaior)   document.getElementById('btn-texto').classList.add('ativo');
  if (estado.contraste)    document.getElementById('btn-contraste').classList.add('ativo');
  if (estado.simplificado) document.getElementById('btn-simplificar').classList.add('ativo');
  if (estado.lendoVoz)     document.getElementById('btn-voz').classList.add('ativo');
}

restaurarEstado();
