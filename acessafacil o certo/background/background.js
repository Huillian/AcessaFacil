// Background Service Worker — AcessaFácil
// Gerencia eventos de instalação e comunicação entre abas

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Abre a página de boas-vindas na primeira instalação
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding/onboarding.html')
    });
  }
});

// Repassa mensagens entre popup e content script quando necessário
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.acao === 'SALVAR_CHAVE') {
    chrome.storage.sync.set({ openrouter_api_key: msg.chave }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.acao === 'OBTER_CHAVE') {
    chrome.storage.sync.get(['openrouter_api_key'], result => {
      sendResponse({ chave: result.openrouter_api_key || '' });
    });
    return true;
  }
});
