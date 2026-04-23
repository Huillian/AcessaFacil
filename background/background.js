const CONFIG = {
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'openai/gpt-4o-mini',
  maxTokens: 1000,
  timeoutMs: 15000,
};

const PROMPTS = {
  simplify:
    'Você é um assistente para idosos. Reescreva o texto a seguir de forma muito simples, ' +
    'usando palavras do dia a dia e frases curtas. Mantenha todas as informações importantes. ' +
    'Responda apenas com o texto reescrito, sem introduções ou explicações.',

  summarize:
    'Você é um assistente para idosos. Resuma o texto a seguir em até 4 frases simples e ' +
    'diretas, usando linguagem fácil de entender. Responda apenas com o resumo.',

  explain:
    'Você é um assistente para idosos. Explique de forma muito simples e curta o que é ou ' +
    'o que faz o seguinte elemento de uma página web. Use linguagem fácil, como se estivesse ' +
    'explicando para alguém que nunca usou internet. Responda em no máximo 2 frases.',

  assistant: (pageContext) =>
    `Você é um assistente amigável ajudando um idoso a usar a internet. ` +
    `Contexto da página atual: "${pageContext}". ` +
    `Responda de forma simples, clara e paciente. ` +
    `Se precisar dar instruções passo a passo, use números (1, 2, 3).`,
};

const ALLOWED_ACTIONS = ['CALL_API'];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.action !== 'string') return;
  if (!ALLOWED_ACTIONS.includes(message.action)) return;

  if (message.action === 'CALL_API') {
    handleApiCall(message).then(sendResponse);
    return true; // mantém canal aberto para resposta assíncrona
  }
});

async function handleApiCall({ type, text, context }) {
  const validTypes = ['simplify', 'summarize', 'explain', 'assistant'];
  if (!validTypes.includes(type)) {
    return { success: false, error: 'INVALID_TYPE' };
  }

  const systemPrompt =
    type === 'assistant' ? PROMPTS.assistant(context || '') : PROMPTS[type];

  const userContent = sanitizeText(text);
  if (!userContent) {
    return { success: false, error: 'EMPTY_INPUT' };
  }

  return callOpenRouter(systemPrompt, userContent);
}

async function callOpenRouter(systemPrompt, userContent) {
  const apiKey = await getApiKey();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Huillian/AcessaFacil',
        'X-Title': 'AcessaFácil',
      },
      body: JSON.stringify({
        model: CONFIG.model,
        max_tokens: CONFIG.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[AcessaFácil] Erro API:', response.status);
      return { success: false, error: 'API_ERROR', status: response.status };
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return { success: false, error: 'EMPTY_RESPONSE' };
    }

    return { success: true, result };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: 'TIMEOUT' };
    }
    console.error('[AcessaFácil] Erro de rede:', err.name);
    return { success: false, error: 'NETWORK_ERROR' };
  }
}

async function getApiKey() {
  const stored = await chrome.storage.local.get('apiKey');
  // Substitua pela sua chave OpenRouter — nunca commite a chave real
  return stored.apiKey || 'SUA_CHAVE_OPENROUTER_AQUI';
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.slice(0, 16000).trim();
}
