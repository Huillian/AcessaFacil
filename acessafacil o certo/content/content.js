// ── Estado local da página ────────────────────────────────────────────────────

const estado = {
  textoMaior: false,
  contraste: false,
  simplificado: false,
  lendoVoz: false,
  modoExplicar: false,
};

// ── Chave OpenRouter — configure aqui ou use a página de ajustes ──────────────
// Deixe vazio para que o usuário configure pela extensão
const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL   = 'openai/gpt-3.5-turbo';

// ══════════════════════════════════════════════════════════════════════════════
// 1. TEXTO MAIOR
// ══════════════════════════════════════════════════════════════════════════════

function aplicarTextoMaior() {
  if (!estado.textoMaior) {
    document.documentElement.style.fontSize = '120%';
    estado.textoMaior = true;
  } else {
    document.documentElement.style.fontSize = '';
    estado.textoMaior = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. MAIS CONTRASTE
// ══════════════════════════════════════════════════════════════════════════════

function aplicarContraste() {
  const id = 'af-contraste-style';
  const existente = document.getElementById(id);
  if (!estado.contraste) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      * {
        color: #000000 !important;
        background-color: #ffffff !important;
        border-color: #000000 !important;
      }
      a, a * { color: #0000cc !important; }
      button, input[type="submit"], input[type="button"] {
        background-color: #000000 !important;
        color: #ffffff !important;
        border: 2px solid #000000 !important;
      }
      img { filter: contrast(1.2) !important; }
    `;
    document.head.appendChild(style);
    estado.contraste = true;
  } else {
    if (existente) existente.remove();
    estado.contraste = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SIMPLIFICAR PÁGINA
// ══════════════════════════════════════════════════════════════════════════════

function simplificarPagina() {
  const id = 'af-simplificar-style';
  const existente = document.getElementById(id);
  if (!estado.simplificado) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Remove publicidade e elementos decorativos */
      [class*="ad"], [class*="banner"], [class*="popup"],
      [id*="ad"], [id*="banner"], iframe,
      [class*="cookie"], [class*="newsletter"] {
        display: none !important;
      }
      /* Mais espaço entre elementos */
      p, li, label, span, div {
        line-height: 1.8 !important;
        letter-spacing: 0.02em !important;
      }
      /* Botões maiores */
      button, a, input, select {
        padding: 10px 16px !important;
        font-size: 18px !important;
        min-height: 48px !important;
      }
      /* Fonte mais legível */
      body, p, span, div, li {
        font-family: Arial, sans-serif !important;
        font-size: 18px !important;
      }
    `;
    document.head.appendChild(style);
    estado.simplificado = true;
  } else {
    if (existente) existente.remove();
    estado.simplificado = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. LER EM VOZ ALTA
// ══════════════════════════════════════════════════════════════════════════════

let utterance = null;

function lerEmVozAlta() {
  if (estado.lendoVoz) {
    window.speechSynthesis.cancel();
    estado.lendoVoz = false;
    return;
  }

  const texto = document.body.innerText.substring(0, 5000);
  utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  // Escolhe voz em português, se disponível
  const vozes = window.speechSynthesis.getVoices();
  const vozPT = vozes.find(v => v.lang.startsWith('pt'));
  if (vozPT) utterance.voice = vozPT;

  utterance.onend = () => { estado.lendoVoz = false; };
  window.speechSynthesis.speak(utterance);
  estado.lendoVoz = true;
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. ASSISTENTE POR CHAT
// ══════════════════════════════════════════════════════════════════════════════

function criarAssistente() {
  if (document.getElementById('af-assistente')) return;

  const drawer = document.createElement('div');
  drawer.id = 'af-assistente';
  drawer.innerHTML = `
    <div id="af-assistente-header">
      <span>💬 Assistente AcessaFácil</span>
      <button id="af-assistente-fechar" aria-label="Fechar assistente">✕</button>
    </div>
    <div id="af-assistente-msgs" aria-live="polite"></div>
    <div id="af-assistente-rodape">
      <input id="af-assistente-input" type="text" placeholder="Digite sua dúvida..." aria-label="Digite sua dúvida" />
      <button id="af-assistente-enviar" aria-label="Enviar mensagem">Enviar</button>
      <button id="af-assistente-mic" aria-label="Falar">🎙️</button>
    </div>
  `;

  const style = document.createElement('style');
  style.id = 'af-assistente-style';
  style.textContent = `
    #af-assistente {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      width: 340px; background: #fff; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      font-family: Arial, sans-serif; display: flex; flex-direction: column;
      border: 2px solid #E06020;
    }
    #af-assistente-header {
      background: #E06020; color: #fff; padding: 14px 16px;
      border-radius: 14px 14px 0 0; font-size: 18px; font-weight: bold;
      display: flex; justify-content: space-between; align-items: center;
    }
    #af-assistente-fechar {
      background: none; border: none; color: #fff; font-size: 20px;
      cursor: pointer; padding: 4px 8px; border-radius: 6px;
    }
    #af-assistente-fechar:hover { background: rgba(255,255,255,0.2); }
    #af-assistente-msgs {
      padding: 14px; height: 280px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 10px;
      font-size: 16px; line-height: 1.5;
    }
    .af-msg { padding: 10px 14px; border-radius: 12px; max-width: 85%; }
    .af-msg-usuario { background: #ffe8d6; align-self: flex-end; color: #1a1a1a; }
    .af-msg-ia { background: #f0f0f0; align-self: flex-start; color: #1a1a1a; }
    #af-assistente-rodape {
      padding: 12px; display: flex; gap: 8px; border-top: 1px solid #eee;
    }
    #af-assistente-input {
      flex: 1; border: 2px solid #ccc; border-radius: 10px;
      padding: 10px 12px; font-size: 16px; font-family: Arial, sans-serif;
    }
    #af-assistente-input:focus { border-color: #E06020; outline: none; }
    #af-assistente-enviar {
      background: #E06020; color: #fff; border: none; border-radius: 10px;
      padding: 10px 14px; font-size: 15px; font-weight: bold; cursor: pointer;
      min-height: 44px; font-family: Arial, sans-serif;
    }
    #af-assistente-enviar:hover { background: #c04f10; }
    #af-assistente-mic {
      background: #f0f0f0; border: 2px solid #ccc; border-radius: 10px;
      padding: 10px; font-size: 18px; cursor: pointer; min-height: 44px;
    }
    #af-assistente-mic.gravando { background: #ffe8d6; border-color: #E06020; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(drawer);

  adicionarMensagem('Olá! Sou o assistente do AcessaFácil. Como posso ajudar você hoje?', 'ia');

  document.getElementById('af-assistente-fechar').onclick = () => {
    drawer.remove();
    style.remove();
  };

  document.getElementById('af-assistente-enviar').onclick = enviarPergunta;

  document.getElementById('af-assistente-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') enviarPergunta();
  });

  document.getElementById('af-assistente-mic').onclick = ativarMicrofone;
}

function adicionarMensagem(texto, tipo) {
  const msgs = document.getElementById('af-assistente-msgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `af-msg af-msg-${tipo}`;
  div.textContent = texto;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function enviarPergunta() {
  const input = document.getElementById('af-assistente-input');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  adicionarMensagem(pergunta, 'usuario');
  input.value = '';
  adicionarMensagem('Pensando...', 'ia');

  const contexto = document.body.innerText.substring(0, 2000);

  try {
    const chave = await obterChaveAPI();
    const resposta = await chamarOpenRouter(
      `Você é um assistente amigável para idosos. Responda de forma simples e clara em português.
       Contexto da página atual: ${contexto}
       Pergunta do usuário: ${pergunta}`,
      chave
    );

    const msgs = document.getElementById('af-assistente-msgs');
    if (msgs) {
      const ultimo = msgs.lastElementChild;
      if (ultimo && ultimo.textContent === 'Pensando...') ultimo.remove();
    }
    adicionarMensagem(resposta, 'ia');
  } catch (err) {
    const msgs = document.getElementById('af-assistente-msgs');
    if (msgs) {
      const ultimo = msgs.lastElementChild;
      if (ultimo && ultimo.textContent === 'Pensando...') ultimo.remove();
    }
    adicionarMensagem('Desculpe, não consegui me conectar. Verifique sua chave de API nas configurações.', 'ia');
  }
}

let recognition = null;

function ativarMicrofone() {
  const btn = document.getElementById('af-assistente-mic');
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    adicionarMensagem('Seu navegador não suporta reconhecimento de voz.', 'ia');
    return;
  }

  if (recognition) {
    recognition.stop();
    recognition = null;
    btn.classList.remove('gravando');
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;

  recognition.onresult = e => {
    const texto = e.results[0][0].transcript;
    document.getElementById('af-assistente-input').value = texto;
    enviarPergunta();
  };

  recognition.onend = () => {
    btn.classList.remove('gravando');
    recognition = null;
  };

  recognition.start();
  btn.classList.add('gravando');
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. RESUMIR PÁGINA
// ══════════════════════════════════════════════════════════════════════════════

async function resumirPagina() {
  const existente = document.getElementById('af-resumo-card');
  if (existente) { existente.remove(); return; }

  const card = document.createElement('div');
  card.id = 'af-resumo-card';
  card.innerHTML = `
    <div id="af-resumo-header">
      <span>✨ Resumo da página</span>
      <button id="af-resumo-fechar" aria-label="Fechar resumo">✕</button>
    </div>
    <div id="af-resumo-texto">Gerando resumo, aguarde...</div>
  `;

  const style = document.createElement('style');
  style.id = 'af-resumo-style';
  style.textContent = `
    #af-resumo-card {
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; width: 90%; max-width: 560px;
      background: #fff; border-radius: 14px; border: 2px solid #E06020;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15); font-family: Arial, sans-serif;
      overflow: hidden;
    }
    #af-resumo-header {
      background: #E06020; color: #fff; padding: 12px 16px;
      font-size: 18px; font-weight: bold;
      display: flex; justify-content: space-between; align-items: center;
    }
    #af-resumo-fechar {
      background: none; border: none; color: #fff;
      font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px;
    }
    #af-resumo-fechar:hover { background: rgba(255,255,255,0.2); }
    #af-resumo-texto {
      padding: 16px 20px; font-size: 18px; line-height: 1.7; color: #1a1a1a;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(card);

  document.getElementById('af-resumo-fechar').onclick = () => {
    card.remove();
    style.remove();
  };

  try {
    const conteudo = document.body.innerText.substring(0, 3000);
    const chave = await obterChaveAPI();
    const resumo = await chamarOpenRouter(
      `Você é um assistente para idosos. Leia o conteúdo abaixo e responda com EXATAMENTE 3 frases simples:
       1. O que este site faz
       2. O que o usuário precisa fazer aqui
       3. Uma dica importante
       Conteúdo: ${conteudo}`,
      chave
    );
    document.getElementById('af-resumo-texto').textContent = resumo;
  } catch {
    document.getElementById('af-resumo-texto').textContent =
      'Não foi possível gerar o resumo. Verifique sua chave de API nas configurações da extensão.';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. O QUE É ISSO?
// ══════════════════════════════════════════════════════════════════════════════

let modoExplicar = false;
let overlayExplicar = null;

function ativarModoExplicar() {
  if (modoExplicar) {
    desativarModoExplicar();
    return;
  }

  modoExplicar = true;
  estado.modoExplicar = true;
  document.body.style.cursor = 'help';

  overlayExplicar = document.createElement('div');
  overlayExplicar.id = 'af-explicar-toast';
  overlayExplicar.textContent = '👆 Clique em qualquer parte da página para saber o que é';
  overlayExplicar.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 2147483647; background: #1a1a1a; color: #fff;
    padding: 12px 20px; border-radius: 12px; font-size: 16px;
    font-family: Arial, sans-serif; pointer-events: none;
  `;
  document.body.appendChild(overlayExplicar);

  document.addEventListener('click', aoClicarElemento, true);
}

function desativarModoExplicar() {
  modoExplicar = false;
  estado.modoExplicar = false;
  document.body.style.cursor = '';
  document.removeEventListener('click', aoClicarElemento, true);
  if (overlayExplicar) { overlayExplicar.remove(); overlayExplicar = null; }
}

async function aoClicarElemento(e) {
  e.preventDefault();
  e.stopPropagation();

  const el = e.target;
  const textoEl = (el.innerText || el.alt || el.placeholder || el.title || el.tagName).substring(0, 300);

  desativarModoExplicar();

  const popup = document.createElement('div');
  popup.id = 'af-explicar-popup';
  popup.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    z-index: 2147483647; background: #fff; border-radius: 16px;
    border: 2px solid #E06020; padding: 24px; width: 320px;
    font-family: Arial, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    font-size: 18px; line-height: 1.6; color: #1a1a1a;
    text-align: center;
  `;
  popup.innerHTML = `<p>🔍 Explicando...</p>`;
  document.body.appendChild(popup);

  try {
    const chave = await obterChaveAPI();
    const explicacao = await chamarOpenRouter(
      `Explique de forma muito simples, como se fosse para um idoso que nunca usou internet,
       o que é este elemento de uma página da web: "${textoEl}"
       Responda em no máximo 2 frases curtas e claras em português.`,
      chave
    );
    popup.innerHTML = `
      <p style="font-size:28px;margin-bottom:12px">🔍</p>
      <p>${explicacao}</p>
      <button onclick="this.parentElement.remove()" style="
        margin-top: 16px; background: #E06020; color: #fff; border: none;
        border-radius: 10px; padding: 12px 24px; font-size: 16px;
        font-weight: bold; cursor: pointer; font-family: Arial, sans-serif;
      ">Entendi</button>
    `;
  } catch {
    popup.innerHTML = `<p>Não foi possível explicar. Verifique sua chave de API.</p>
      <button onclick="this.parentElement.remove()" style="
        margin-top: 16px; background: #E06020; color: #fff; border: none;
        border-radius: 10px; padding: 12px 24px; font-size: 16px;
        font-weight: bold; cursor: pointer;
      ">Fechar</button>`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API OpenRouter
// ══════════════════════════════════════════════════════════════════════════════

async function obterChaveAPI() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['openrouter_api_key'], result => {
      resolve(result.openrouter_api_key || OPENROUTER_API_KEY);
    });
  });
}

async function chamarOpenRouter(prompt, chave) {
  if (!chave) throw new Error('Chave de API não configurada');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chave}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://acessafacil.app',
      'X-Title': 'AcessaFácil'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    })
  });

  if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ══════════════════════════════════════════════════════════════════════════════
// Listener — recebe mensagens do popup
// ══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.acao) {
    case 'PING':           sendResponse({ ok: true }); return true;
    case 'TEXTO_MAIOR':    aplicarTextoMaior();  break;
    case 'MAIS_CONTRASTE': aplicarContraste();   break;
    case 'SIMPLIFICAR':    simplificarPagina();  break;
    case 'LER_VOZ':        lerEmVozAlta();       break;
    case 'ABRIR_ASSISTENTE': criarAssistente(); break;
    case 'RESUMIR_PAGINA': resumirPagina();     break;
    case 'MODO_EXPLICAR':  ativarModoExplicar(); break;
    case 'GET_ESTADO':     sendResponse(estado); return true;
  }
  sendResponse({ ok: true });
  return true;
});
