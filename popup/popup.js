const state = {
  textoMaior:  false,
  contraste:   false,
  simplificar: false,
  lerVoz:      false,
};

// ---------- Inicialização ----------

document.addEventListener('DOMContentLoaded', async () => {
  await carregarEstado();
  registrarEventos();
});

async function carregarEstado() {
  const salvo = await chrome.storage.local.get(['textoMaior', 'contraste', 'simplificar', 'lerVoz']);

  state.textoMaior  = salvo.textoMaior  ?? false;
  state.contraste   = salvo.contraste   ?? false;
  state.simplificar = salvo.simplificar ?? false;
  state.lerVoz      = salvo.lerVoz      ?? false;

  document.getElementById('toggle-texto-maior').checked = state.textoMaior;
  document.getElementById('toggle-contraste').checked   = state.contraste;
  document.getElementById('toggle-simplificar').checked = state.simplificar;
  document.getElementById('toggle-ler-voz').checked     = state.lerVoz;
}

function registrarEventos() {
  document.getElementById('toggle-texto-maior').addEventListener('change', (e) => {
    state.textoMaior = e.target.checked;
    salvar({ textoMaior: state.textoMaior });
    // Texto maior = nível 2 (40%); desligado = volta ao normal
    enviarParaConteudo({ action: 'SET_FONT_LEVEL', level: state.textoMaior ? 2 : 0 });
  });

  document.getElementById('toggle-contraste').addEventListener('change', (e) => {
    state.contraste = e.target.checked;
    salvar({ contraste: state.contraste });
    enviarParaConteudo({ action: 'TOGGLE_CONTRAST', enabled: state.contraste });
  });

  document.getElementById('toggle-simplificar').addEventListener('change', (e) => {
    state.simplificar = e.target.checked;
    salvar({ simplificar: state.simplificar });
    enviarParaConteudo({ action: 'TOGGLE_SIMPLIFY_VISUAL', enabled: state.simplificar });
  });

  document.getElementById('toggle-ler-voz').addEventListener('change', async (e) => {
    state.lerVoz = e.target.checked;
    salvar({ lerVoz: state.lerVoz });

    if (state.lerVoz) {
      await lerPaginaEmVozAlta();
    } else {
      enviarParaConteudo({ action: 'STOP_READING' });
    }
  });

  document.getElementById('btn-pedir-ajuda').addEventListener('click', pedirAjuda);
  document.getElementById('btn-resumir').addEventListener('click', resumirPagina);
  document.getElementById('btn-ajustes').addEventListener('click', abrirAjustes);
  document.getElementById('btn-ajuda').addEventListener('click', abrirAjuda);
}

// ---------- Ações principais ----------

function pedirAjuda() {
  // Fecha o popup e abre o drawer do assistente na página
  enviarParaConteudo({ action: 'OPEN_ASSISTANT' });
  window.close();
}

async function lerPaginaEmVozAlta() {
  mostrarStatus('Preparando leitura...', 'carregando');
  const texto = await getTextoPagina();

  if (!texto) {
    // Reverte o toggle se não conseguiu texto
    state.lerVoz = false;
    document.getElementById('toggle-ler-voz').checked = false;
    salvar({ lerVoz: false });
    mostrarErro('Não foi possível ler esta página. Tente num site normal.');
    return;
  }

  ocultarStatus();
  enviarParaConteudo({ action: 'READ_ALOUD', text: texto.slice(0, 3000) });
}

async function resumirPagina() {
  mostrarStatus('Resumindo a página...', 'carregando');
  document.getElementById('btn-resumir').disabled = true;

  const texto = await getTextoPagina();
  if (!texto) {
    mostrarErro('Não foi possível ler esta página. Tente num site normal.');
    document.getElementById('btn-resumir').disabled = false;
    return;
  }

  const resposta = await chamarAPI({ action: 'CALL_API', type: 'summarize', text: texto });
  document.getElementById('btn-resumir').disabled = false;

  if (!resposta?.success) {
    mostrarErro(mensagemErro(resposta?.error));
    return;
  }

  ocultarStatus();
  // Mostra o resumo como card no topo da página (Superfície 6A dos wireframes)
  enviarParaConteudo({ action: 'SHOW_SUMMARY', text: resposta.result });
}

function abrirAjustes() {
  // Será implementado com a página de opções na próxima fase
  mostrarStatus('Ajustes detalhados em breve!', '');
  setTimeout(ocultarStatus, 2000);
}

function abrirAjuda() {
  enviarParaConteudo({ action: 'SHOW_HELP' });
  window.close();
}

// ---------- Comunicação ----------

async function getTextoPagina() {
  const tab = await getAbaAtiva();

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    mostrarErro('Esta função não funciona em páginas internas do Chrome. Acesse um site e tente novamente.');
    return null;
  }

  try {
    const resposta = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_TEXT' });
    return resposta?.text || null;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
      await new Promise((r) => setTimeout(r, 150));
      const resposta = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_TEXT' });
      return resposta?.text || null;
    } catch (err2) {
      console.error('[AcessaFácil] Erro ao capturar texto:', err2.message);
      return null;
    }
  }
}

async function enviarParaConteudo(mensagem) {
  const tab = await getAbaAtiva();
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) return;

  try {
    await chrome.tabs.sendMessage(tab.id, mensagem);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
      await new Promise((r) => setTimeout(r, 150));
      await chrome.tabs.sendMessage(tab.id, mensagem);
    } catch (err2) {
      console.error('[AcessaFácil] Erro ao enviar:', err2.message);
    }
  }
}

async function chamarAPI(mensagem) {
  try {
    return await chrome.runtime.sendMessage(mensagem);
  } catch (err) {
    console.error('[AcessaFácil] Erro API:', err.message);
    return { success: false, error: 'NETWORK_ERROR' };
  }
}

async function getAbaAtiva() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ---------- UI ----------

function mostrarStatus(texto, tipo) {
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

function salvar(dados) {
  chrome.storage.local.set(dados);
}

function mensagemErro(codigo) {
  const msgs = {
    TIMEOUT:        'A IA demorou demais. Tente novamente.',
    NETWORK_ERROR:  'Sem conexão com a internet.',
    API_ERROR:      'Problema no serviço de IA. Tente novamente.',
    EMPTY_INPUT:    'Não há texto nesta página.',
    EMPTY_RESPONSE: 'A IA não respondeu. Tente novamente.',
  };
  return msgs[codigo] || 'Ocorreu um erro. Tente novamente.';
}
