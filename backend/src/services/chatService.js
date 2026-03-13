import { dataPaths, readJson } from '../utils/fileStore.js';
import { buildAssistantReply } from './openaiService.js';

const stages = ['saudacao', 'objetivo', 'dor', 'objecao', 'cta', 'encerramento'];

export function createSessionLead(name, phone) {
  const random = Math.random().toString(36).slice(2, 8);
  return {
    leadId: `lead-${Date.now()}-${random}`,
    name: name || 'Lead sem nome',
    phone: phone || '',
    stage: 'saudacao',
    productInterest: '',
    status: 'em_andamento',
    ctaSent: false,
    clickedProductId: ''
  };
}

function nextStage(currentStage) {
  const index = stages.indexOf(currentStage);
  if (index < 0 || index >= stages.length - 1) return 'encerramento';
  return stages[index + 1];
}

export function detectProductInterest(message, products) {
  const lower = message.toLowerCase();
  const found = products.find((product) => lower.includes(product.name.toLowerCase()));
  return found || products[0] || null;
}

export function shouldSendCta({ interestLevel, stage, ctaSent, message }) {
  if (ctaSent) return false;
  const buyingSignals = ['link', 'comprar', 'preço', 'valor', 'como contratar', 'quero'];
  const hasSignal = buyingSignals.some((term) => message.toLowerCase().includes(term));
  return stage === 'cta' || (interestLevel !== 'frio' && hasSignal);
}

export async function processLeadMessage({ session, messages, leadMessage, affiliateLink }) {
  const products = await readJson(dataPaths.products, []);
  const product = detectProductInterest(leadMessage, products);
  const stage = session.stage === 'saudacao' ? 'objetivo' : nextStage(session.stage);

  const interestLevel = messages.some((m) => m.role === 'lead' && /comprar|link|preço|quero/.test(m.content.toLowerCase()))
    ? 'quente'
    : messages.length > 3
      ? 'morno'
      : 'frio';

  const sendCta = shouldSendCta({
    interestLevel,
    stage,
    ctaSent: session.ctaSent,
    message: leadMessage
  });

  const finalAffiliateLink = affiliateLink || product?.defaultAffiliateLink || 'https://seu-link-afiliado.com';

  const assistantText = await buildAssistantReply({
    messages,
    products,
    stage,
    shouldSendCta: sendCta,
    affiliateLink: finalAffiliateLink
  });

  return {
    assistantText,
    stage: sendCta ? 'encerramento' : stage,
    status: sendCta ? 'cta_enviado' : 'em_andamento',
    productInterest: product?.name || 'Não definido',
    clickedProductId: sendCta ? product?.id || '' : session.clickedProductId,
    ctaSent: sendCta,
    interestLevel
  };
}
