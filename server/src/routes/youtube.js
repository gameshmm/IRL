const express = require('express');
const { getSetting, upsertSetting } = require('../db');

// youtube-chat usa múltiplas conexões TLS — aumenta o limite para evitar o aviso
require('events').EventEmitter.defaultMaxListeners = 30;

const router = express.Router();
const SETTING_KEY = 'youtube_chat_url';

// ─── Estado do chat ───────────────────────────────────────────────────────────
let liveChat        = null;   // instância LiveChat atual
let activeChatId    = null;   // videoId conectado
let chatConnected   = false;
const chatListeners = new Set();
const msgBuffer     = [];     // últimas 80 mensagens (para novos clientes)
const MAX_BUF       = 80;

function videoIdFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
    if (h === 'youtube.com') {
      return (
        u.searchParams.get('v') ||
        (u.pathname.match(/^\/live\/([^/?]+)/)  || [])[1] ||
        (u.pathname.match(/^\/embed\/([^/?]+)/) || [])[1] ||
        null
      );
    }
  } catch { /**/ }
  return null;
}

function broadcastMsg(msg) {
  msgBuffer.push(msg);
  if (msgBuffer.length > MAX_BUF) msgBuffer.shift();
  const data = `data: ${JSON.stringify({ type: 'msg', msg })}\n\n`;
  for (const res of chatListeners) {
    try { res.write(data); } catch (_) {}
  }
}

function broadcastStatus(status, error) {
  chatConnected = status === 'connected';
  const data = `data: ${JSON.stringify({ type: 'status', status, error })}\n\n`;
  for (const res of chatListeners) {
    try { res.write(data); } catch (_) {}
  }
}

// ─── Mutex para evitar múltiplas conexões simultâneas ────────────────────────
let isConnecting = false;

async function startLiveChat(videoId) {
  // Impede chamadas concorrentes
  if (isConnecting) {
    console.log('[YouTube Chat] Já está conectando, ignorando chamada duplicada.');
    return;
  }
  isConnecting = true;

  // Para e limpa a conexão anterior completamente
  if (liveChat) {
    try {
      liveChat.removeAllListeners(); // garante que nenhum evento antigo dispare mais
      liveChat.stop();
    } catch (_) {}
    liveChat = null;
    chatConnected = false;
    activeChatId = null;
  }

  if (!videoId) {
    isConnecting = false;
    return;
  }

  activeChatId = videoId;

  try {
    const { LiveChat } = require('youtube-chat');
    const instance = new LiveChat({ liveId: videoId });
    liveChat = instance; // guarda referência antes de registrar listeners

    instance.on('chat', (item) => {
      // Ignora se esta instância já não é a ativa (conexão foi substituída)
      if (liveChat !== instance) return;

      // Segmentos ricos: texto, emoji unicode e emoji customizado (imagem)
      const segments = Array.isArray(item.message)
        ? item.message.map(seg => {
            if (seg.text != null) {
              return { type: 'text', text: seg.text };
            }
            if (seg.emoji) {
              const e = seg.emoji;
              if (e.isCustomEmoji) {
                const url = e.image?.thumbnails?.slice(-1)[0]?.url || null;
                const label = e.image?.accessibility?.accessibilityData?.label
                  || e.shortcuts?.[0] || '[emoji]';
                return { type: 'emoji', custom: true, url, label };
              } else {
                const char = e.emojiId || e.shortcuts?.[0] || '';
                return { type: 'emoji', custom: false, char };
              }
            }
            return null;
          }).filter(Boolean)
        : [{ type: 'text', text: String(item.message || '') }];

      // Texto plano como fallback
      const text = segments.map(s => {
        if (s.type === 'text')  return s.text;
        if (s.type === 'emoji') return s.custom ? (s.label || '') : (s.char || '');
        return '';
      }).join('');

      const msg = {
        id:          item.id || String(Date.now()),
        author:      item.author?.name || 'Anônimo',
        thumbnail:   item.author?.thumbnail?.url || null,
        text,
        segments,
        isModerator: Boolean(item.isModerator),
        isOwner:     Boolean(item.isOwner),
        isMember:    Boolean(item.isMembership),
        superchat:   item.superchat ? {
          amount: item.superchat.amount || '',
          color:  item.superchat.color  || '#1e88e5',
        } : null,
        ts: Date.now(),
      };
      broadcastMsg(msg);
    });

    instance.on('error', (err) => {
      if (liveChat !== instance) return;
      console.error('[YouTube Chat] Erro:', err?.message || err);
      broadcastStatus('error', String(err?.message || 'Erro desconhecido'));
    });

    instance.on('end', () => {
      if (liveChat !== instance) return;
      console.log('[YouTube Chat] Transmissão encerrada');
      broadcastStatus('ended');
    });

    console.log('[YouTube Chat] Conectando ao chat:', videoId);
    const ok = await instance.start();

    if (ok) {
      console.log('[YouTube Chat] Conectado!');
      broadcastStatus('connected');
    } else {
      console.warn('[YouTube Chat] Não foi possível conectar. A live pode não estar ativa.');
      broadcastStatus('error', 'Não foi possível conectar. A live pode não estar ao vivo agora.');
      if (liveChat === instance) liveChat = null;
    }
  } catch (err) {
    console.error('[YouTube Chat] Exceção:', err?.message);
    broadcastStatus('error', String(err?.message || 'Erro ao iniciar o chat'));
    liveChat = null;
  } finally {
    isConnecting = false;
  }
}


// ─── Rotas ───────────────────────────────────────────────────────────────────

// GET /api/youtube
router.get('/', (req, res) => {
  const url = getSetting(SETTING_KEY, '');
  res.json({ url, connected: chatConnected, videoId: activeChatId });
});

// PUT /api/youtube — salva URL e (re)conecta o chat
router.put('/', async (req, res) => {
  const { url } = req.body;
  if (url === undefined) return res.status(400).json({ error: 'Campo "url" é obrigatório' });

  if (url !== '' && !isYouTubeUrl(url)) {
    return res.status(400).json({ error: 'URL inválida. Use uma URL do YouTube.' });
  }

  upsertSetting(SETTING_KEY, url.trim());
  msgBuffer.length = 0; // limpa buffer ao trocar de live

  const videoId = videoIdFromUrl(url.trim());
  // Conecta em background
  startLiveChat(videoId).catch(err => console.error('[YouTube Chat]', err));

  res.json({ url: url.trim(), videoId });
});

// GET /api/youtube/events — SSE de mensagens do chat
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia estado atual + buffer
  res.write(`data: ${JSON.stringify({ type: 'init', status: chatConnected ? 'connected' : 'disconnected', buffer: msgBuffer })}\n\n`);

  chatListeners.add(res);

  // Heartbeat
  const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch (_) {} }, 20000);
  req.on('close', () => { clearInterval(hb); chatListeners.delete(res); });
});

// POST /api/youtube/reconnect — força reconexão
router.post('/reconnect', async (req, res) => {
  const url = getSetting(SETTING_KEY, '');
  const videoId = videoIdFromUrl(url);
  if (!videoId) return res.status(400).json({ error: 'Nenhuma URL configurada' });
  msgBuffer.length = 0;
  startLiveChat(videoId).catch(() => {});
  res.json({ ok: true });
});

// ─── Inicialização: conecta na URL salva ao subir o servidor ─────────────────
(async () => {
  const url     = getSetting(SETTING_KEY, '');
  const videoId = videoIdFromUrl(url);
  if (videoId) {
    console.log('[YouTube Chat] Conectando automaticamente ao iniciar:', videoId);
    startLiveChat(videoId).catch(() => {});
  }
})();

function isYouTubeUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be';
  } catch { return false; }
}

module.exports = router;
