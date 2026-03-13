import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const systemPromptPath = path.join(rootDir, 'prompts', 'system.txt');

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function buildAssistantReply({ messages, products, stage, shouldSendCta, affiliateLink }) {
  const systemText = await fs.readFile(systemPromptPath, 'utf-8');
  const productsContext = JSON.stringify(products, null, 2);

  if (!client) {
    return fallbackReply({ stage, shouldSendCta, affiliateLink, products });
  }

  const result = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: `${systemText}\n\nContexto dos produtos (fonte única da verdade):\n${productsContext}\n\nEstágio atual: ${stage}.\nEnvie CTA agora? ${shouldSendCta ? 'sim' : 'não'}.\nLink afiliado padrão: ${affiliateLink}`
      },
      ...messages.map((msg) => ({
        role: msg.role === 'lead' ? 'user' : 'assistant',
        content: msg.content
      }))
    ],
    temperature: 0.4
  });

  return result.output_text?.trim() || fallbackReply({ stage, shouldSendCta, affiliateLink, products });
}

function fallbackReply({ stage, shouldSendCta, affiliateLink, products }) {
  const product = products[0];
  const benefit = product?.benefits?.[0] || 'um benefício relevante para sua necessidade';

  if (shouldSendCta) {
    return `Pelo que você trouxe, esse produto pode te ajudar com ${benefit}. Se fizer sentido, você pode ver os detalhes aqui: ${affiliateLink}`;
  }

  const map = {
    saudacao: 'Olá! Eu sou o assistente virtual e posso te ajudar a avaliar se esse produto é ideal para você. Qual é seu principal objetivo hoje?',
    objetivo: 'Entendi. Me conta qual é a maior dificuldade que você está enfrentando agora para eu te orientar melhor.',
    dor: `Perfeito, obrigado por compartilhar. Um dos benefícios desse produto é ${benefit}. Quer que eu te explique como isso se aplica ao seu caso?`,
    objecao: 'Ótima dúvida. Posso te explicar somente com base nas informações oficiais do produto, sem promessas irreais.',
    encerramento: 'Se precisar, posso continuar te ajudando com mais dúvidas antes de decidir.'
  };

  return map[stage] || map.objetivo;
}
