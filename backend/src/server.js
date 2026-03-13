import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSessionLead, processLeadMessage } from './services/chatService.js';
import { getAdminData, saveConversation, upsertLead } from './services/leadService.js';
import { dataPaths, readJson } from './utils/fileStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const AFFILIATE_LINK = process.env.AFFILIATE_LINK || '';

app.use(cors());
app.use(express.json());

const sessions = new Map();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'afiliado-ia-backend' });
});

app.post('/api/chat/start', async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    const session = createSessionLead(name, phone);
    const greeting = 'Olá! 👋 Eu sou o assistente de atendimento. Para te ajudar melhor, qual objetivo você quer alcançar agora?';

    const messages = [
      {
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString()
      }
    ];

    sessions.set(session.leadId, { ...session, messages });

    await saveConversation(session.leadId, messages);
    await upsertLead({
      leadId: session.leadId,
      name: session.name,
      phone: session.phone,
      productInterest: 'Não definido',
      status: 'em_andamento',
      ctaSent: false,
      clickedProductId: '',
      messages
    });

    res.json({ leadId: session.leadId, message: greeting });
  } catch (_error) {
    res.status(500).json({ error: 'Não foi possível iniciar o atendimento.' });
  }
});

app.post('/api/chat/message', async (req, res) => {
  try {
    const { leadId, message } = req.body || {};

    if (!leadId || !message?.trim()) {
      return res.status(400).json({ error: 'leadId e message são obrigatórios.' });
    }

    const session = sessions.get(leadId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada. Reinicie o atendimento.' });
    }

    const leadEntry = {
      role: 'lead',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    session.messages.push(leadEntry);

    const result = await processLeadMessage({
      session,
      messages: session.messages,
      leadMessage: message.trim(),
      affiliateLink: AFFILIATE_LINK
    });

    const assistantEntry = {
      role: 'assistant',
      content: result.assistantText,
      timestamp: new Date().toISOString()
    };

    session.messages.push(assistantEntry);

    sessions.set(leadId, {
      ...session,
      stage: result.stage,
      status: result.status,
      ctaSent: result.ctaSent,
      productInterest: result.productInterest,
      clickedProductId: result.clickedProductId
    });

    await saveConversation(leadId, session.messages);
    await upsertLead({
      leadId,
      name: session.name,
      phone: session.phone,
      productInterest: result.productInterest,
      status: result.status,
      ctaSent: result.ctaSent,
      clickedProductId: result.clickedProductId,
      messages: session.messages
    });

    return res.json({
      reply: result.assistantText,
      stage: result.stage,
      status: result.status,
      interestLevel: result.interestLevel
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao processar a mensagem do lead.' });
  }
});

app.get('/api/admin/leads', async (_req, res) => {
  const leads = await readJson(dataPaths.leads, []);
  res.json(leads);
});

app.get('/api/admin/stats', async (_req, res) => {
  const { stats } = await getAdminData();
  res.json(stats);
});

app.get('/api/admin/conversations', async (_req, res) => {
  const { conversations } = await getAdminData();
  res.json(conversations);
});

app.get('/api/admin/export', async (_req, res) => {
  const leads = await readJson(dataPaths.leads, []);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="leads-export.json"');
  res.send(JSON.stringify(leads, null, 2));
});

app.listen(PORT, () => {
  console.log(`Servidor backend rodando em http://localhost:${PORT}`);
  console.log('Estrutura preparada para integrar canal WhatsApp via webhook futuramente.');
});
