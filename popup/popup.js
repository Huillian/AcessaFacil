// Estado local do popup (sincronizado com chrome.storage.local na inicialização)
const state = {
  fontLevel: 0,
  contrast: false,
  simplifyVisual: false,
  explainMode: false,
  lendoVoz: false,
};

// ---------- Inicialização ----------

document.addEventListener('DOMContentLoaded', async () => {
  await carregarEstado();
  registrarEventos();
});

async function carregarEstado() {
  const salvo = await chrome.storage.local.get(['fontLevel', 'contrast', 'simplifyVisual']);

  state.fontLevel    = salvo.fontLevel    ?? 0;
  state.contrast     = salvo.contrast     ?? false;
  state.simplifyVisual = salvo.simplifyVisual ?? false;

  // Aplicar estado salvo visualmente no popup
  atualizarBotoesFont();
  document.getElementById('toggle-contraste').checked      = state.contrast;
  document.getElementById('toggle-simplificar-visual').checked = state.simplifyVisual;
}

function registrarEventos() {
  // Fonte
  document.getElementById('btn-fonte-menor').addEventListener('click', () => ajustarFonte(-1));
  document.getElementById('btn-fonte-normal').addEventListener('click', () => ajustarFonte(0, true));
  document.getElementById('btn-fonte-maior').addEventListener('click', () => ajustarFonte(1));

  // Toggles visuais
  document.getElementById('toggle-contraste').addEventListener('change', (e) => {
    state.contrast = e.target.checked;
    salvarEstado({ contrast: state.contrast });
    enviarParaConteudo({ action: 'TOGGLE_CONTRAST', enabled: state.contrast });
  });

  document.getElementById('toggle-simplificar-visual').addEventListener('change', (e) => {
    state.simplifyVisual = e.target.checked;
    salvarEstado({ simplifyVisual: state.simplifyVisual });
    enviarParaConteudo({ action: 'TOGGLE_SIMPLIFY_VISUAL', enabled: state.simplifyVisual });
  });

  // Botões de IA
  document.getElementById('btn-simplificar').addEventListener('click', simplificarPagina);
  document.getElementById('btn-resumir').addEventListener('click', resumirPagina);
  document.getElementById('btn-ler-voz').addEventListener('click', lerEmVozAlta);
  document.getElementById('btn-modo-explicar').addEventListener('click', toggleModoExplicar);

  // Assistente
  document.getElementById('btn-perguntar').addEventListener('click', fazerPergunta);
  document.getElementById('btn-voz').addEventListener('click', iniciarReconhecimentoVoz);
  document.getElementById('entrada-assistente').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fazerPergunta();
  });
}

// ---------- Controle de fonte ----------

function ajustarFonte(delta, reset = false) {
  if (reset) {
    state.fontLevel = 0;
  } else {
    state.fontLevel = Math.max(-1, Math.min(3, state.fontLevel + delta));
  }

  salvarEstado({ fontLevel: state.fontLevel });
  enviarParaConteudo({ action: 'SET_FONT_LEVEL', level: state.fontLevel });
  atualizarBotoesFont();
}

function atualizarBotoesFont() {
  document.getElementById('btn-fonte-menor').disabled = state.fontLevel <= -1;
  document.getElementById('btn-fonte-maior').disabled = state.fontLevel >= 3;
}

// ---------- Ações de IA ----------

async function simplificarPagina() {
  mostrarStatus('Simplificando o texto da página...', 'carregando');
  desabilitarBotoesIA(true);

  const texto = await getTextoPagina();
  if (!texto) {
    mostrarErro('Não foi possível capturar o texto desta página.');
    desabilitarBotoesIA(false);
    return;
  }

  const resposta = await chamarAPI({ action: 'CALL_API', type: 'simplify', text: texto });
  desabilitarBotoesIA(false);

  if (!resposta.success) {
    mostrarErro(mensagemErro(resposta.error));
    return;
  }

  ocultarStatus();
  enviarParaConteudo({ action: 'INJECT_SIMPLIFIED', title: 'Texto Simplificado', text: resposta.result });
}

async function resumirPagina() {
  mostrarStatus('Gerando resumo da página...', 'carregando');
  desabilitarBotoesIA(true);

  const texto = await getTextoPagina();
  if (!texto) {
    mostrarErro('Não foi possível capturar o texto desta página.');
    desabilitarBotoesIA(false);
    return;
  }

  const resposta = await chamarAPI({ action: 'CALL_API', type: 'summarize', text: texto });
  desabilitarBotoesIA(false);

  if (!resposta.success) {
    mostrarErro(mensagemErro(resposta.error));
    return;
  }

  ocultarStatus();
  enviarParaConteudo({ action: 'INJECT_SIMPLIFIED', title: 'Resumo da Página', text: resposta.result });
}

async function lerEmVozAlta() {
  const btn = document.getElementById('btn-ler-voz');

  if (state.lendoVoz) {
    enviarParaConteudo({ action: 'STOP_READING' });
    state.lendoVoz = false;
    btn.textContent = '';
    btn.innerHTML = '<span class="btn-icone">🔊</span> Ler em Voz Alta';
    ocultarStatus();
    return;
  }

  mostrarStatus('Preparando leitura...', 'carregando');
  const texto = await getTextoPagina();

  if (!texto) {
    mostrarErro('Não foi possível capturar o texto desta página.');
    return;
  }

  state.lendoVoz = true;
  btn.innerHTML = '<span class="btn-icone">⏹️</span> Parar Leitura';
  ocultarStatus();
  enviarParaConteudo({ action: 'READ_ALOUD', text: texto.slice(0, 3000) });
}

function toggleModoExplicar() {
  const btn = document.getElementById('btn-modo-explicar');

  if (state.explainMode) {
    state.explainMode = false;
    btn.innerHTML = '<span class="btn-icone">🔍</span> O que é isso?';
    btn.classList.remove('ativo');
    enviarParaConteudo({ action: 'DISABLE_EXPLAIN_MODE' });
  } else {
    state.explainMode = true;
    btn.innerHTML = '<span class="btn-icone">✅</span> Modo ativo — clique na página';
    btn.classList.add('ativo');
    enviarParaConteudo({ action: 'ENABLE_EXPLAIN_MODE' });
    window.close(); // fecha o popup para o usuário clicar na página
  }
}

async function fazerPergunta() {
  const entrada = document.getElementById('entrada-assistente');
  const pergunta = entrada.value.trim();

  if (!pergunta) {
    entrada.focus();
    return;
  }

  mostrarStatus('Consultando assistente...', 'carregando');
  desabilitarBotoesIA(true);

  const contextoPagina = await getTextoPagina();

  const resposta = await chamarAPI({
    action: 'CALL_API',
    type: 'assistant',
    text: pergunta,
    context: contextoPagina?.slice(0, 2000) || '',
  });

  desabilitarBotoesIA(false);

  if (!resposta.success) {
    mostrarErro(mensagemErro(resposta.error));
    return;
  }

  ocultarStatus();
  entrada.value = '';
  mostrarRespostaAssistente(resposta.result);
}

// ---------- Reconhecimento de voz ----------

function iniciarReconhecimentoVoz() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    mostrarErro('Reconhecimento de voz não disponível neste navegador.');
    return;
  }

  const btn = document.getElementById('btn-voz');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  btn.classList.add('gravando');
  btn.setAttribute('aria-label', 'Gravando...');

  recognition.start();

  recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    document.getElementById('entrada-assistente').value = texto;
    btn.classList.remove('gravando');
    btn.setAttribute('aria-label', 'Falar dúvida');
  };

  recognition.onerror = (event) => {
    btn.classList.remove('gravando');
    btn.setAttribute('aria-label', 'Falar dúvida');
    console.error('[AcessaFácil] Erro de reconhecimento de voz:', event.error);
    mostrarErro('Não foi possível capturar a voz. Tente novamente.');
  };

  recognition.onend = () => {
    btn.classList.remove('gravando');
    btn.setAttribute('aria-label', 'Falar dúvida');
  };
}

// ---------- Comunicação ----------

async function getTextoPagina() {
  try {
    const tab = await getAbaAtiva();
    const resposta = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_TEXT' });
    return resposta?.text || null;
  } catch (err) {
    console.error('[AcessaFácil] Erro ao capturar texto:', err.message);
    return null;
  }
}

async function enviarParaConteudo(mensagem) {
  try {
    const tab = await getAbaAtiva();
    await chrome.tabs.sendMessage(tab.id, mensagem);
  } catch (err) {
    console.error('[AcessaFácil] Erro ao enviar mensagem:', err.message);
  }
}

async function chamarAPI(mensagem) {
  try {
    return await chrome.runtime.sendMessage(mensagem);
  } catch (err) {
    console.error('[AcessaFácil] Erro ao chamar API:', err.message);
    return { success: false, error: 'NETWORK_ERROR' };
  }
}

async function getAbaAtiva() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ---------- UI helpers ----------

function mostrarStatus(texto, tipo = '') {
  const el = document.getElementById('status');
  el.textContent = texto;
  el.className = `status ${tipo}`;
  el.hidden = false;
}

function mostrarErro(texto) {
  const el = document.getElementById('status');
  el.textContent = texto;
  el.className = 'status erro';
  el.hidden = false;
}

function ocultarStatus() {
  document.getElementById('status').hidden = true;
}

function mostrarRespostaAssistente(texto) {
  const caixa = document.getElementById('resposta-assistente');
  caixa.textContent = texto; // textContent — nunca innerHTML com dado externo
  caixa.hidden = false;
}

function desabilitarBotoesIA(desabilitar) {
  ['btn-simplificar', 'btn-resumir', 'btn-ler-voz', 'btn-perguntar'].forEach((id) => {
    document.getElementById(id).disabled = desabilitar;
  });
}

function mensagemErro(codigo) {
  const msgs = {
    TIMEOUT:      'A IA demorou demais para responder. Tente novamente.',
    NETWORK_ERROR: 'Sem conexão com a internet. Verifique sua rede.',
    API_ERROR:    'Ocorreu um problema no serviço de IA. Tente novamente.',
    EMPTY_INPUT:  'Não há texto nesta página para processar.',
    EMPTY_RESPONSE: 'A IA não retornou uma resposta. Tente novamente.',
  };
  return msgs[codigo] || 'Ocorreu um erro inesperado. Tente novamente.';
}

function salvarEstado(dados) {
  chrome.storage.local.set(dados);
}
