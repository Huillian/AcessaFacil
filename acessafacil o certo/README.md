# AcessaFácil

> Extensão de navegador que torna qualquer site mais fácil de usar para idosos — sem instalar apps, criar contas ou mudar hábitos.

Projeto Integrador · Desenvolvimento de Sistemas · SENAC 2025/2026

---

## O problema

Mais de 32 milhões de brasileiros com 60 anos ou mais precisam acessar serviços essenciais online — FGTS, Gov.br, bancos, agendamento de saúde. Mas a maioria dos sites foi feita para quem já sabe usar a internet: letras pequenas, linguagem técnica, botões minúsculos.

## A solução

O AcessaFácil age diretamente no navegador para tornar qualquer site mais acessível, exatamente onde o problema ocorre.

---

## Funcionalidades

| Funcionalidade | Como funciona |
|---|---|
| Texto maior | Aumenta fonte e botões em toda a página |
| Mais contraste | Melhora visibilidade para quem tem dificuldade de enxergar |
| Simplificar página | Remove poluição visual e aumenta espaço entre elementos |
| Ler em voz alta | Lê o conteúdo em português com voz natural (Web Speech API) |
| Pedir ajuda | Assistente por chat e voz integrado com IA |
| Resumir página | IA explica em 3 frases o que o site faz e o que você precisa |
| O que é isso? | Clique em qualquer elemento e a IA explica o que é |

---

## Instalação (modo desenvolvedor)

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/acessafacil.git
   ```

2. Abra o Chrome e acesse `chrome://extensions`

3. Ative o **Modo do desenvolvedor** (canto superior direito)

4. Clique em **Carregar sem compactação** e selecione a pasta do projeto

5. O ícone do AcessaFácil aparecerá na barra do Chrome

---

## Configuração da API

O AcessaFácil usa a [OpenRouter](https://openrouter.ai) para os recursos de IA (resumo, assistente, explicação de elementos).

1. Crie uma conta gratuita em [openrouter.ai](https://openrouter.ai)
2. Gere uma chave de API
3. Na extensão, acesse as configurações e cole sua chave

---

## Estrutura do projeto

```
acessafacil/
├── manifest.json          # Configuração da extensão (Manifest V3)
├── popup/
│   ├── popup.html         # Interface principal do popup
│   ├── popup.css          # Estilos do popup (Senior UX)
│   └── popup.js           # Lógica do popup
├── content/
│   ├── content.js         # Script injetado nas páginas
│   └── content.css        # Estilos base das páginas
├── background/
│   └── background.js      # Service worker
├── icons/                 # Ícones da extensão
└── README.md
```

---

## Princípios de design (Senior UX)

- Texto mínimo de 18px em todos os elementos
- Botões com área de toque mínima de 44×44px
- Nunca ícone sem rótulo — linguagem da vovó, não do dev
- Uma ação primária por tela, destacada em laranja
- Sem jargão técnico: sem "TTS", "API", "toggle"

---

## Roadmap

- [x] Estrutura base (manifest, popup, content, background)
- [x] Ajustes visuais: texto maior, contraste, simplificação
- [x] Leitura em voz alta (Web Speech API)
- [x] Assistente por chat e reconhecimento de voz
- [x] Resumo de página com IA
- [x] Modo "O que é isso?"
- [ ] Barra flutuante in-page (Superfície 2)
- [ ] Simplificação inline de texto (Superfície 3)
- [ ] Assistente por voz full-screen (Superfície 4B)
- [ ] Página de ajustes e preferências (Superfície 8)
- [ ] Onboarding para primeiros usuários (Superfície 7)
- [ ] Publicação na Chrome Web Store

---

## Licença

MIT
