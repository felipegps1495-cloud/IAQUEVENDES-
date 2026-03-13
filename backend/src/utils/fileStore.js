import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

export const dataPaths = {
  leads: path.join(rootDir, 'data', 'leads.json'),
  conversations: path.join(rootDir, 'data', 'conversations.json'),
  products: path.join(rootDir, 'data', 'products.json')
};

export async function readJson(filePath, fallback = []) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(filePath, data) {
  const pretty = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, `${pretty}\n`, 'utf-8');
}
