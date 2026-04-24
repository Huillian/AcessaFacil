// ---------- Inicialização ----------

document.addEventListener('DOMContentLoaded', async () => {
  await carregarAjustes();
  registrarEventos();
});

async function carregarAjustes() {
  const salvo = await chrome.storage.local.get(['apiKey', 'voiceRate', 'previaFont']);

  if (salvo.apiKey) {
    document.getElementById('api-key').value = salvo.apiKey;
  }

  const rate = salvo.voiceRate ?? 0.9;
  const radioRate = document.querySelector(`input[name="voiceRate"][value="${rate}"]`);
  if (radioRate) radioRate.checked = true;
  else document.querySelector('input[name="voiceRate"][value="0.9"]').checked = true;

  const previaFont = salvo.previaFont ?? 18;
  const radioPrevia = document.querySelector(`input[name="previaFont"][value="${previaFont}"]`);
  if (radioPrevia) radioPrevia.checked = true;
  else document.querySelector('input[name="previaFont"][value="18"]').checked = true;
  atualizarPrevia(previaFont);
}

function registrarEventos() {
  // Mostrar/ocultar chave
  document.getElementById('btn-mostrar-key').addEventListener('click', () => {
    const input = document.getElementById('api-key');
    const btn   = document.getElementById('btn-mostrar-key');
    const visivel = input.type === 'text';
    input.type = visivel ? 'password' : 'text';
    btn.textContent = visivel ? '👁️' : '🙈';
    btn.setAttribute('aria-label', visivel ? 'Mostrar chave' : 'Ocultar chave');
  });

  // Testar chave
  document.getElementById('btn-testar-key').addEventListener('click', testarChave);

  // Prévia de voz
  document.getElementById('btn-ouvir-previa').addEventListener('click', ouvirPrevia);

  // Prévia de tamanho de fonte
  document.querySelectorAll('input[name="previaFont"]').forEach((radio) => {
    radio.addEventListener('change', () => atualizarPrevia(Number(radio.value)));
  });

  // Salvar
  document.getElementById('btn-salvar').addEventListener('click', salvarAjustes);
}

// ---------- Lógica ----------

function atualizarPrevia(tamanho) {
  document.getElementById('previa').style.fontSize = `${tamanho}px`;
}

function getVoiceRateSelecionado() {
  const radio = document.querySelector('input[name="voiceRate"]:checked');
  return radio ? Number(radio.value) : 0.9;
}

function ouvirPrevia() {
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(
    'Olá! Este é um exemplo de como eu vou ler os textos para você.'
  );
  utterance.lang  = 'pt-BR';
  utterance.rate  = getVoiceRateSelecionado();
  utterance.pitch = 1.05;

  const falar = () => {
    const voices  = synth.getVoices();
    const melhor  =
      voices.find((v) => v.lang === 'pt-BR' && /google/i.test(v.name)) ||
      voices.find((v) => v.lang === 'pt-BR') ||
      voices.find((v) => v.lang.startsWith('pt'));
    if (melhor) utterance.voice = melhor;
    synth.speak(utterance);
  };

  if (synth.getVoices().length > 0) falar();
  else synth.addEventListener('voiceschanged', falar, { once: true });
}

async function testarChave() {
  const chave = document.getElementById('api-key').value.trim();
  const statusEl = document.getElementById('status-key');
  const btn = document.getElementById('btn-testar-key');

  if (!chave) {
    mostrarStatus(statusEl, 'Cole sua chave primeiro.', 'erro');
    return;
  }

  btn.disabled = true;
  mostrarStatus(statusEl, 'Testando...', '');

  // Salva temporariamente para o background usar
  await chrome.storage.local.set({ apiKey: chave });

  chrome.runtime.sendMessage(
    { action: 'CALL_API', type: 'summarize', text: 'Teste de conexão.' },
    (resposta) => {
      btn.disabled = false;
      if (resposta?.success) {
        mostrarStatus(statusEl, '✅ Conectado! Chave funcionando.', 'ok');
      } else {
        mostrarStatus(statusEl, '❌ Chave inválida ou sem conexão.', 'erro');
      }
    }
  );
}

async function salvarAjustes() {
  const chave      = document.getElementById('api-key').value.trim();
  const voiceRate  = getVoiceRateSelecionado();
  const previaFont = Number(document.querySelector('input[name="previaFont"]:checked')?.value ?? 18);
  const statusEl   = document.getElementById('status-salvar');

  const dados = { voiceRate, previaFont };
  if (chave) dados.apiKey = chave;

  await chrome.storage.local.set(dados);
  mostrarStatus(statusEl, '✅ Ajustes salvos!', 'ok');
  setTimeout(() => { statusEl.hidden = true; }, 2500);
}

// ---------- UI ----------

function mostrarStatus(el, texto, tipo) {
  el.textContent = texto;
  el.className = `status-inline ${tipo}`;
  el.hidden = false;
}
