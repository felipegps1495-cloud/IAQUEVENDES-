# afiliado-ia

Projeto full stack para atendimento automático de leads e envio de link de afiliado no momento certo.

## Estrutura

- `backend/`: API Node.js + Express + OpenAI Responses API
- `frontend/`: chat web + painel administrativo
- `prompts/system.txt`: prompt de sistema com regras do agente
- `data/`: base local (`products.json`, `leads.json`, `conversations.json`)

## Requisitos

- Node.js 18+
- npm

## Instalação

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

## Configuração

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Edite o `.env`:

- `OPENAI_API_KEY`: chave da OpenAI.
- `AFFILIATE_LINK`: **troque aqui** para seu link de afiliado principal.
- `PORT`: porta do backend (padrão `3000`).

## Como rodar

### Rodar backend e frontend juntos

```bash
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5500`

### Rodar separadamente

```bash
npm run backend
npm run frontend
```

## Fluxo de atendimento implementado

1. Saudação inicial
2. Entender objetivo do lead
3. Identificar dor/problema
4. Apresentar benefício do produto
5. Tratar objeções simples
6. Enviar CTA com link de afiliado
7. Encerrar atendimento

## Regras de segurança

- O agente só responde com informações de `data/products.json`.
- O sistema não deve prometer cura, resultados garantidos ou informações falsas.
- Se faltar informação do produto, o agente informa que não possui o dado.

## Endpoints principais

- `POST /api/chat/start`: iniciar atendimento
- `POST /api/chat/message`: responder mensagem do lead
- `GET /api/admin/stats`: total de leads, leads quentes, produtos mais clicados
- `GET /api/admin/leads`: listar leads
- `GET /api/admin/conversations`: histórico
- `GET /api/admin/export`: exportar leads em JSON

## Preparado para WhatsApp

O backend já está organizado para adicionar integração via webhook (ex.: WhatsApp Cloud API) sem alterar as regras centrais do agente.
