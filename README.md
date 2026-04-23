<div align="center">

<img src="icons/icon128.png" alt="AcessaFácil" width="96">

# AcessaFácil

**Extensão de navegador com IA para inclusão digital de idosos**

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-F08726?style=flat-square)](https://github.com/Huillian/AcessaFacil)
[![Manifest](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![IA](https://img.shields.io/badge/IA-OpenRouter%20API-10a37f?style=flat-square)](https://openrouter.ai)
[![SENAC](https://img.shields.io/badge/Projeto%20Integrador-SENAC-003087?style=flat-square)](https://www.sp.senac.br)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green?style=flat-square)](LICENSE)

*Transformando qualquer site em um ambiente mais simples, legível e acessível — direto no navegador.*

---

[Funcionalidades](#-funcionalidades) · [Como instalar](#-como-instalar) · [Tecnologias](#-tecnologias) · [Roadmap](#-roadmap) · [Equipe](#-equipe)

</div>

---

## O problema que resolvemos

Mais de **32 milhões de brasileiros com 60 anos ou mais** precisam acessar serviços essenciais online — FGTS, Gov.br, bancos, agendamento de saúde. Mas a maioria dos sites foi feita para quem já sabe usar a internet: letras pequenas, linguagem técnica, botões minúsculos, informações em excesso.

O AcessaFácil age diretamente no navegador para tornar **qualquer site** mais fácil de usar, sem precisar instalar apps, criar contas ou mudar hábitos.

---

## ✨ Funcionalidades

| Funcionalidade | Como funciona |
|---|---|
| **Texto maior** | Aumenta fonte e botões em toda a página com um toque |
| **Mais contraste** | Melhora a visibilidade para quem tem dificuldade de enxergar |
| **Simplificar a página** | Remove poluição visual e aumenta o espaço entre elementos |
| **Ler em voz alta** | Lê o conteúdo da página em português com voz natural |
| **Pedir ajuda** | Abre um assistente por chat e voz para tirar qualquer dúvida |
| **Resumir a página** | A IA explica em 3 frases o que o site faz e o que você precisa |
| **O que é isso?** | Clique em qualquer elemento e a IA explica o que é |

---

## 🖼️ Interface

<div align="center">

> *Popup principal — design acessível com laranja como ação primária e linguagem sem jargão*

</div>

A interface segue princípios de **Senior UX**:
- Texto mínimo de 18px em todos os elementos
- Botões com área de toque mínima de 44×44px
- Nunca ícone sem rótulo — linguagem da vovó, não do dev
- Uma ação primária por tela, destacada em laranja
- Nada de jargão técnico: sem "TTS", "API", "toggle"

---

## 🚀 Como instalar

> A extensão ainda não está publicada na Chrome Web Store. Para usar durante o desenvolvimento:

**1.** Clone ou baixe este repositório:
```bash
git clone https://github.com/Huillian/AcessaFacil.git
```

**2.** Abra o Chrome e acesse:
```
chrome://extensions
```

**3.** Ative o **Modo do desenvolvedor** (canto superior direito)

**4.** Clique em **"Carregar sem compactação"** e selecione a pasta do projeto

**5.** O ícone **A** vai aparecer na barra do Chrome — pronto!

---

## 🛠️ Tecnologias

```
AcessaFácil/
├── manifest.json          # Configuração MV3
├── popup/                 # Interface do usuário (HTML + CSS + JS)
├── content/               # Script injetado em cada página
├── background/            # Service worker — chamadas à API de IA
└── icons/                 # Ícones 16/48/128px
```

| Tecnologia | Uso |
|---|---|
| JavaScript ES6+ (vanilla) | Lógica da extensão — sem frameworks |
| Chrome Extension API MV3 | Comunicação entre componentes |
| OpenRouter API | Gateway de IA (simplificação, resumo, assistente) |
| Web Speech API | Leitura em voz alta e reconhecimento de voz |
| Chrome Web Store | Distribuição futura |

---

## 🗺️ Roadmap

### ✅ Concluído

- [x] Estrutura base da extensão (manifest, popup, content, background)
- [x] Ajustes visuais: texto maior, contraste, simplificação visual
- [x] Integração com OpenRouter API (simplificação e resumo por IA)
- [x] Leitura em voz alta com Web Speech API
- [x] Drawer do assistente com chat e reconhecimento de voz
- [x] Resumo da página exibido como card no topo
- [x] Modo "O que é isso?" — clique e a IA explica qualquer elemento
- [x] Redesign do popup conforme wireframes (Superfície 1A — Toolkit)
- [x] Publicação do código no GitHub

### 🔨 Em andamento

- [x] Barra flutuante in-page — aba "A" na borda direita que expande painel com todos os controles (Superfície 2)
- [ ] Simplificação inline de texto — substitui na própria página com "Voltar original" (Superfície 3)

### 📋 Planejado

- [ ] Assistente por voz full-screen — "Estou te ouvindo..." (Superfície 4B)
- [ ] Página de ajustes e preferências com prévia ao vivo (Superfície 8)
- [ ] Chave de API configurável pelo usuário (elimina key hardcoded)
- [ ] Onboarding para primeiros usuários (Superfície 7)
- [ ] GitHub Actions — CI com lint e testes automáticos
- [ ] Testes com usuários reais (idosos) e ajustes de UX
- [ ] Publicação na Chrome Web Store
- [ ] Política de privacidade (obrigatória para Web Store)

---

## 📖 Sobre o projeto

O **AcessaFácil** é o Projeto Integrador (PI) do curso de **Desenvolvimento de Sistemas** do **SENAC**, desenvolvido em 2025/2026.

O projeto nasceu da observação de que, apesar da digitalização acelerada dos serviços públicos e bancários no Brasil, não existe uma ferramenta que combine simplificação inteligente de conteúdo, assistência por voz e guia de navegação especificamente para o público idoso.

A solução escolhida — extensão de navegador — garante que a ferramenta chegue ao usuário exatamente onde o problema ocorre, sem exigir mudanças de comportamento ou instalações complexas.

---

## 👥 Equipe

| | Nome | Papel |
|---|---|---|
| 👨‍💻 | Huillian | Desenvolvimento |
| 🎨 | Equipe | Design & UX |

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Feito com ☕ e muita vontade de incluir quem ficou pra trás na era digital.

**SENAC · Curso de Desenvolvimento de Sistemas · 2026**

</div>
