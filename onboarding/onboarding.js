const TOTAL_PASSOS = 4;
let passoAtual = 1;

document.addEventListener('DOMContentLoaded', () => {
  atualizarUI();

  document.getElementById('btn-proximo').addEventListener('click', avancar);
  document.getElementById('btn-anterior').addEventListener('click', voltar);

  document.querySelectorAll('.ponto').forEach((ponto) => {
    ponto.addEventListener('click', () => irPara(Number(ponto.dataset.passo)));
  });
});

function avancar() {
  if (passoAtual < TOTAL_PASSOS) {
    irPara(passoAtual + 1);
  } else {
    concluir();
  }
}

function voltar() {
  if (passoAtual > 1) irPara(passoAtual - 1);
}

function irPara(novoPasso) {
  document.getElementById(`passo-${passoAtual}`).classList.add('escondido');
  passoAtual = novoPasso;
  const proximo = document.getElementById(`passo-${passoAtual}`);
  proximo.classList.remove('escondido');
  atualizarUI();
}

function atualizarUI() {
  // Barra de progresso
  const pct = (passoAtual / TOTAL_PASSOS) * 100;
  document.getElementById('progresso-fill').style.width = `${pct}%`;

  // Pontos
  document.querySelectorAll('.ponto').forEach((ponto) => {
    ponto.classList.toggle('ativo', Number(ponto.dataset.passo) === passoAtual);
    ponto.setAttribute('aria-selected', Number(ponto.dataset.passo) === passoAtual);
  });

  // Botão anterior
  const btnAnterior = document.getElementById('btn-anterior');
  btnAnterior.hidden = passoAtual === 1;

  // Botão próximo / concluir
  const btnProximo = document.getElementById('btn-proximo');
  btnProximo.textContent = passoAtual === TOTAL_PASSOS ? '🎉 Começar a usar!' : 'Próximo →';
}

function concluir() {
  chrome.storage.local.set({ onboardingDone: true }, () => {
    window.close();
  });
}
