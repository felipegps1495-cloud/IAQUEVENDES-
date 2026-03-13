const API_BASE = 'http://localhost:3000/api';
let currentLeadId = '';

const chat = document.getElementById('chat');
const startBtn = document.getElementById('startBtn');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = content;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

startBtn.addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();

  try {
    const res = await fetch(`${API_BASE}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });

    if (!res.ok) throw new Error('Falha ao iniciar atendimento');

    const data = await res.json();
    currentLeadId = data.leadId;
    chat.innerHTML = '';
    appendMessage('assistant', data.message);
    refreshAdmin();
  } catch (error) {
    alert(error.message);
  }
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();

  if (!currentLeadId) {
    alert('Inicie o atendimento primeiro.');
    return;
  }

  if (!message) return;

  appendMessage('lead', message);
  messageInput.value = '';

  try {
    const res = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: currentLeadId, message })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem');

    appendMessage('assistant', data.reply);
    refreshAdmin();
  } catch (error) {
    appendMessage('assistant', `Erro: ${error.message}`);
  }
});

async function refreshAdmin() {
  const [statsRes, leadsRes, convRes] = await Promise.all([
    fetch(`${API_BASE}/admin/stats`),
    fetch(`${API_BASE}/admin/leads`),
    fetch(`${API_BASE}/admin/conversations`)
  ]);

  const stats = await statsRes.json();
  const leads = await leadsRes.json();
  const conversations = await convRes.json();

  document.getElementById('stats').innerHTML = `
    <div class="stat"><strong>Total de leads:</strong><br>${stats.totalLeads}</div>
    <div class="stat"><strong>Leads quentes:</strong><br>${stats.hotLeads}</div>
    <div class="stat"><strong>Produtos mais clicados:</strong><br>${(stats.productsMostClicked || []).map(p => `${p.productId} (${p.clicks})`).join(', ') || 'Sem cliques'}</div>
  `;

  document.getElementById('leads').innerHTML = leads
    .map((lead) => `<div class="item">${lead.name} · ${lead.productInterest} · ${lead.interestLevel} · ${lead.status}</div>`)
    .join('');

  document.getElementById('conversations').innerHTML = conversations
    .map((conv) => `<div class="item"><strong>${conv.leadId}</strong><br>${conv.messages.slice(-2).map(m => `${m.role}: ${m.content}`).join('<br>')}</div>`)
    .join('');
}

document.getElementById('exportBtn').addEventListener('click', () => {
  window.open(`${API_BASE}/admin/export`, '_blank');
});

refreshAdmin();
