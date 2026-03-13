import { dataPaths, readJson, writeJson } from '../utils/fileStore.js';

function nowIso() {
  return new Date().toISOString();
}

export function classifyIntent(messages = []) {
  const text = messages.map((m) => m.content.toLowerCase()).join(' ');
  const hotSignals = ['comprar', 'link', 'preço', 'assinar', 'quero agora', 'como pago'];
  const warmSignals = ['interesse', 'funciona', 'dúvida', 'quero saber', 'como funciona'];

  if (hotSignals.some((word) => text.includes(word))) return 'quente';
  if (warmSignals.some((word) => text.includes(word))) return 'morno';
  return 'frio';
}

export async function upsertLead({ leadId, name, phone, productInterest, status, ctaSent, clickedProductId, messages }) {
  const leads = await readJson(dataPaths.leads, []);
  const timestamp = nowIso();
  const interestLevel = classifyIntent(messages);

  const idx = leads.findIndex((l) => l.id === leadId);
  const next = {
    id: leadId,
    name: name?.trim() || 'Lead sem nome',
    phone: phone?.trim() || '',
    productInterest: productInterest || 'Não definido',
    interestLevel,
    status,
    createdAt: idx >= 0 ? leads[idx].createdAt : timestamp,
    updatedAt: timestamp,
    lastInteractionAt: timestamp,
    messagesCount: messages.length,
    ctaSent: Boolean(ctaSent),
    clickedProductId: clickedProductId || ''
  };

  if (idx >= 0) leads[idx] = next;
  else leads.push(next);

  await writeJson(dataPaths.leads, leads);
  return next;
}

export async function saveConversation(leadId, messages) {
  const conversations = await readJson(dataPaths.conversations, []);
  const idx = conversations.findIndex((c) => c.leadId === leadId);
  const payload = { leadId, messages };

  if (idx >= 0) conversations[idx] = payload;
  else conversations.push(payload);

  await writeJson(dataPaths.conversations, conversations);
}

export async function getAdminData() {
  const [leads, conversations] = await Promise.all([
    readJson(dataPaths.leads, []),
    readJson(dataPaths.conversations, [])
  ]);

  const productsMap = leads.reduce((acc, lead) => {
    if (!lead.clickedProductId) return acc;
    acc[lead.clickedProductId] = (acc[lead.clickedProductId] || 0) + 1;
    return acc;
  }, {});

  const productsMostClicked = Object.entries(productsMap)
    .map(([productId, clicks]) => ({ productId, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  return {
    stats: {
      totalLeads: leads.length,
      hotLeads: leads.filter((l) => l.interestLevel === 'quente').length,
      productsMostClicked
    },
    leads,
    conversations
  };
}
