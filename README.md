<div align="center">

<img src="https://img.shields.io/badge/IRL_Stream-Plataforma_Completa-6c63ff?style=for-the-badge&logo=twitch&logoColor=white" />

# 🎬 IRL Stream — Plataforma Completa de Streaming

**Transmita ao vivo da rua para a internet com qualidade profissional**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Android](https://img.shields.io/badge/Android-Kotlin-7F52FF?style=flat-square&logo=kotlin)](https://kotlinlang.org/)
[![OBS](https://img.shields.io/badge/OBS-WebSocket_5-302E31?style=flat-square&logo=obs-studio)](https://obsproject.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 📸 Screenshots

> Dashboard, Player, Controle OBS e Overlay de Sinal em ação.

---

## ✨ Funcionalidades

### 🖥️ Servidor de Mídia (Node.js)
- ✅ Recebe streams RTMP (porta 1935)
- ✅ Distribui via HLS e HTTP-FLV (porta 8000)
- ✅ Autenticação por **chaves de stream** — rejeita conexões não autorizadas
- ✅ Detecção automática de **bitrate baixo** e **queda de sinal**
- ✅ API REST com JWT para gerenciamento seguro

### 🎛️ Dashboard Web (React + Vite)
- ✅ Login protegido com JWT
- ✅ **Dashboard** com CPU, RAM e streams ativos em tempo real (gráficos)
- ✅ **Monitor ao Vivo** — player HLS embutido (HLS.js)
- ✅ **Gerenciador de Chaves** — criar, copiar e deletar chaves RTMP
- ✅ **Controle OBS** — conectar ao OBS, iniciar/parar stream, trocar cenas, gravar
- ✅ **Configurações** — alterar portas, FFmpeg path, senha de admin

### 📡 Overlay de Sinal (Browser Source para OBS)
- ✅ **Sinal Perdido** — animação fullscreen com timer de queda
- ✅ **Sinal Fraco** — badge no canto com bitrate em tempo real
- ✅ **Reconectando** — banner animado
- ✅ Comunicação em tempo real via **SSE (Server-Sent Events)**
- ✅ Fundo 100% transparente — plug-and-play como Browser Source

### 📱 Aplicativo Android (Kotlin)
- ✅ Câmera em tela cheia com preview
- ✅ Engine RTMP de baixa latência (RootEncoder)
- ✅ Controle de **bitrate adaptável** (slider)
- ✅ **Reconexão automática** com backoff exponencial (até 10 tentativas)
- ✅ Troca de câmera e lanterna
- ✅ Configurações persistentes

---

## 📁 Estrutura do Projeto

```
IRL/
├── server/                   # Backend Node.js
│   ├── src/
│   │   ├── index.js          # Servidor principal + SSE de sinal
│   │   ├── routes/
│   │   │   ├── auth.js       # Login/JWT
│   │   │   ├── keys.js       # CRUD de chaves de stream
│   │   │   ├── config.js     # Gerenciamento de configurações
│   │   │   ├── status.js     # CPU/RAM/uptime
│   │   │   └── obs.js        # Controle OBS WebSocket
│   │   └── middleware/
│   │       └── auth.js       # Verificação JWT
│   ├── overlay/
│   │   └── index.html        # Overlay de sinal para OBS
│   ├── config.json           # Configuração principal
│   └── package.json
│
├── dashboard/                # Frontend React
│   └── src/
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── PlayerPage.jsx
│       │   ├── KeysPage.jsx
│       │   ├── OBSPage.jsx   # ← Controle OBS + Overlay
│       │   └── SettingsPage.jsx
│       ├── components/
│       │   └── Layout.jsx
│       └── context/
│           └── AuthContext.jsx
│
└── mobile/                   # Projeto Android (Kotlin)
    └── app/src/main/
        ├── java/com/irlstreamer/app/
        │   ├── MainActivity.kt        # Tela principal + RTMP
        │   ├── SettingsActivity.kt    # Configurações
        │   └── StreamPreferences.kt  # Persistência
        └── res/layout/
            ├── activity_main.xml
            └── activity_settings.xml
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

| Componente | Versão Mínima | Download |
|-----------|--------------|---------|
| Node.js | 18+ | https://nodejs.org/ |
| FFmpeg | 6+ | https://ffmpeg.org/ |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |
| OBS Studio | 28+ | https://obsproject.com/ |

---

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/SEU_USUARIO/irl-stream.git
cd irl-stream
```

---

### 2️⃣ Configurar o Servidor

```bash
cd server

# Instalar dependências
npm install

# Copiar o arquivo de variáveis de ambiente
copy .env.example .env        # Windows
cp .env.example .env          # Linux/Mac

# Gerar um JWT Secret seguro e cole em .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Editar config.json
# - Ajuste o caminho do FFmpeg:
#     Windows: "C:\\ffmpeg\\bin\\ffmpeg.exe"
#     Linux:   "/usr/bin/ffmpeg"
```

> **Nota:** A senha padrão do admin é `admin123`. O hash no `config.json` já está pré-configurado.
> Altere a senha pelo Dashboard após o primeiro acesso.

```bash
# Iniciar o servidor
npm start
```

**Portas em uso:**
| Porta | Uso |
|-------|-----|
| 1935 | RTMP (receber streams) |
| 8000 | HLS / HTTP-FLV (distribuir) |
| 3001 | API REST + SSE de sinal + Overlay |

---

### 3️⃣ Configurar o Dashboard

```bash
cd ../dashboard

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
# → http://localhost:5173

# OU build para produção
npm run build
# Arquivos gerados em dist/
```

**Login padrão:** `admin` / `admin123` ← *mude imediatamente!*

---

### 4️⃣ Configurar o Controle OBS

1. No OBS: **Ferramentas** → **WebSocket Server Settings**
2. Marque **"Enable WebSocket server"**
3. Defina uma senha (recomendado)
4. No Dashboard → **Controle OBS** → preencha host/porta/senha → **Conectar**

---

### 5️⃣ Adicionar o Overlay de Sinal no OBS

1. No OBS, em uma cena: clique em **+** → **Browser Source**
2. URL: `http://localhost:3001/overlay/`
3. Dimensões: **1920 × 1080**
4. Marque **"Shutdown source when not visible"**  
5. Mova o overlay para a **camada mais alta** da cena
6. Pronto! O overlay aparecerá automaticamente quando o sinal cair

---

### 6️⃣ Compilar o APK Android

1. Abra o **Android Studio**
2. **File → Open** → selecione a pasta `mobile/`
3. Aguarde o **Gradle sync** finalizar
4. Conecte seu Android com **Depuração USB** ativada
5. Clique em **Run ▶**

**Ou gere o APK:** Build → Build Bundle(s)/APK(s) → Build APK(s)

Na primeira abertura:
- Digite o **IP/domínio** do seu servidor
- Cole a **chave de stream** (gerada no Dashboard → Chaves)
- Ajuste o bitrate conforme sua conexão
- Toque em **🔴 IR AO VIVO**

---

## 🌐 Conectividade — Como Chegar à Internet

### Para streams na rua (fora da rede local)

#### ✅ Opção A: Tailscale VPN (recomendado)

```bash
# 1. Instale Tailscale no PC servidor
# Windows: https://tailscale.com/download

# 2. Instale Tailscale no celular (Play Store)

# 3. Faça login com a mesma conta em ambos

# 4. O IP Tailscale do PC fica em http://100.64.0.X
#    Use esse IP no APK como servidor
```

**Vantagens:** sem abrir portas, criptografia E2E, funciona em qualquer rede.

#### ✅ Opção B: Port Forwarding no Roteador

Acesse `192.168.1.1` e libere as portas:

| Porta | Protocolo | Uso |
|-------|-----------|-----|
| 1935 | TCP | RTMP |
| 8000 | TCP | HLS |
| 3001 | TCP | API/Dashboard |

Use seu IP público no APK. Para IP fixo, use **DuckDNS**: https://duckdns.org

#### ✅ Opção C: Cloudflare Tunnel (só para Dashboard)

```bash
cloudflared tunnel --url http://localhost:3001
# Gera URL HTTPS pública temporária para o Dashboard
```

---

## 🔒 Segurança

```bash
# Gerar um JWT secret forte
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

- [ ] Altere a senha padrão no Dashboard → Configurações
- [ ] Configure `JWT_SECRET` no `.env` com o valor gerado acima
- [ ] Exponha o Dashboard (3001) apenas via VPN ou com HTTPS (Nginx + Let's Encrypt)
- [ ] Nunca exponha a porta 3001 diretamente à internet sem TLS

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Login falha com `admin123` | Execute `npm start` novamente (o servidor pode ter o hash antigo em cache) |
| Stream rejeitado (AUTH ERROR) | Crie uma chave no Dashboard → Chaves e use exatamente ela no APK |
| HLS não carrega no player | Aguarde 6–10s (buffer HLS inicial) |
| OBS não conecta | Ative WebSocket Server no OBS: Ferramentas → WebSocket Server Settings |
| Overlay não aparece | Confirme que o servidor está rodando e a URL está correta |
| APK não conecta na rua | Use Tailscale ou Port Forwarding nas portas 1935 e 8000 |
| FFmpeg error | Configure o caminho correto em `config.json → trans.ffmpeg` |

---

## 📦 Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| Servidor | Node.js, node-media-server, Express, JWT, obs-websocket-js |
| Dashboard | React 18, Vite, HLS.js, Recharts, Lucide, Axios |
| Overlay | HTML/CSS/JS puro, SSE (EventSource) |
| Android | Kotlin, RootEncoder (RTMP), Material Components, Coroutines |

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie sua branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: adiciona minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT © 2024 — Seu Nome

---

<div align="center">
<strong>Feito com ❤️ para a comunidade de streamers IRL</strong>
</div>
