<div align="center">

<img src="https://img.shields.io/badge/IRL_Stream-Servidor_Pessoal-6c63ff?style=for-the-badge&logo=twitch&logoColor=white" />

# 📡 IRL Stream — Seu Próprio Servidor de Livestream

**Transmita da rua direto para o Twitch, YouTube ou qualquer plataforma, passando pelo seu PC em casa.**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Suportado-2496ED?style=flat-square&logo=docker)](https://docker.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Banco_de_Dados-003B57?style=flat-square&logo=sqlite)](https://sqlite.org/)
[![OBS](https://img.shields.io/badge/OBS-28%2B-302E31?style=flat-square&logo=obs-studio)](https://obsproject.com/)
[![PrismLive](https://img.shields.io/badge/PrismLive-Android%20%2F%20iOS-FF6B35?style=flat-square)](https://prismlive.com/)

</div>

---

## 🤔 Como funciona?

```
Celular (PrismLive)  →  Servidor IRL (PC ou VPS)  →  OBS  →  Twitch / YouTube
```

1. Você sai na rua com o celular transmitindo pelo 4G/5G
2. O PrismLive envia o vídeo para o seu servidor (PC em casa ou VPS na nuvem)
3. O OBS recebe o vídeo, adiciona overlays, cenas, etc.
4. O OBS transmite para o Twitch, YouTube ou onde você quiser

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| 📺 **Player ao vivo** | Monitor HTTP-FLV de baixa latência no dashboard |
| 🔑 **Chaves de stream** | Crie, renomeie e remova chaves (salvas no SQLite) |
| 📊 **Dashboard em tempo real** | CPU, RAM, bitrate e status via SSE |
| 🎛️ **Controle OBS** | Troque cenas, inicie/pare stream remotamente via WebSocket |
| 📜 **Logs ao vivo** | Terminal de logs do servidor com filtros e export |
| 📅 **Histórico de sessões** | Registro de todas as lives com estatísticas |
| 🌙 **Tema claro/escuro** | Toggle persistido no localStorage |
| 📱 **PWA** | Instalável como app no celular/desktop |
| 🔁 **Auto-reconexão OBS** | Backoff exponencial automático em quedas |
| 🗄️ **SQLite** | Banco de dados local — sem necessidade de PostgreSQL/MySQL |
| 🐳 **Docker** | Deploy em VPS com um único comando |

---

## 🚀 Instalação — Modo Desenvolvimento (Windows)

### Pré-requisitos

| Item | Link | Gratuito? |
|------|------|-----------|
| **Node.js 20 LTS** | https://nodejs.org/ | ✅ |
| **OBS Studio** | https://obsproject.com/ | ✅ |
| **PrismLive** | [Android](https://play.google.com/store/apps/details?id=com.prism.live) / [iOS](https://apps.apple.com/app/id1319056339) | ✅ |
| **Tailscale** (recomendado) | https://tailscale.com/ | ✅ |

### Passo a Passo

**1. Baixe o projeto:**
```bash
git clone https://github.com/gameshmm/irl.git
cd irl
```

**2. Instale as dependências:**
```
Dê duplo clique em instalar.bat
```
> Ou manualmente: `cd server && npm install` e `cd dashboard && npm install`

**3. Inicie o sistema:**
```
Dê duplo clique em iniciar.bat
```
> Abre automaticamente em http://localhost:5173

**4. Login padrão:**
- **Usuário:** `admin`
- **Senha:** `admin123`

> 🔐 **Mude a senha imediatamente** em Configurações após o primeiro login!

---

## 🐳 Deploy com Docker (VPS / Linux)

> Use esta opção para rodar o servidor 24/7 em uma VPS na nuvem (DigitalOcean, AWS, Hetzner, etc.)

### Pré-requisitos
- Docker Engine + Docker Compose instalados
- Servidor com Linux (Ubuntu 22.04+ recomendado)

### 1. Clone o projeto na VPS

```bash
git clone https://github.com/gameshmm/irl.git
cd irl
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
nano .env   # Edite o JWT_SECRET com uma chave aleatória longa
```

### 3. Crie o config.json (configurações de rede)

```bash
cp server/config.example.json server/config.json
```
> Edite as portas RTMP/HTTP se necessário.

### 4. Suba o container

```bash
docker compose up -d
```

O dashboard estará disponível em: **`http://SEU-IP:3001`**

### 5. Comandos úteis

```bash
# Ver logs em tempo real
docker compose logs -f

# Parar o servidor
docker compose down

# Atualizar para nova versão
git pull
docker compose up -d --build

# Verificar status
docker compose ps
```

### Portas que precisam estar abertas no firewall

| Porta | Protocolo | Para quê |
|-------|-----------|---------|
| `1935` | TCP | RTMP — celular envia o stream aqui |
| `8000` | TCP | HTTP-FLV / HLS — OBS consome aqui |
| `3001` | TCP | Dashboard web + API REST |

### Volumes persistentes (seus dados)

```
data/
├── irl.db       ← Banco SQLite (chaves, histórico, admin)
└── media/       ← Segmentos HLS gerados em runtime
```

> ⚡ **O banco é criado automaticamente** na primeira execução. Faça backup do `data/irl.db` regularmente.

---

## 📱 Configurar o PrismLive

| Campo | Valor |
|-------|-------|
| Tipo | RTMP personalizado |
| URL do servidor | `rtmp://SEU-IP:1935/live` |
| Chave de stream | Gere no painel → Chaves de Stream |
| Resolução | 720p ou 1080p |
| Bitrate | 2000–4000 kbps |
| Codec vídeo | H.264 |
| Codec áudio | AAC |

---

## 🎬 Configurar o OBS

**Opção A — Fonte de Mídia (HTTP-FLV):**
1. Fontes → **+** → Fonte de Mídia
2. URL: `http://localhost:8000/live/SUA_CHAVE.flv`
3. Marque "Reiniciar quando ativo"

**Opção B — Controle remoto via WebSocket:**
1. OBS: Ferramentas → WebSocket Server Settings → Ativar
2. No painel: Controle OBS → Conectar

**Overlay de sinal perdido:**
1. OBS → + → Browser Source
2. URL: `http://localhost:3001/overlay/` (ou IP da VPS)
3. Tamanho: 1920×1080 — mova para a camada mais alta

---

## 🌐 Como conectar de fora de casa

| Método | Dificuldade | Recomendado para |
|--------|------------|------------------|
| 🥇 **Tailscale VPN** | Fácil | PC em casa |
| 🐳 **VPS + Docker** | Médio | 24/7, alta disponibilidade |
| ⚙️ **Port Forwarding** | Médio | PC em casa sem Tailscale |

### Tailscale (PC em casa)
1. Crie conta gratuita em https://tailscale.com
2. Instale no PC e no celular com a mesma conta
3. Use o IP Tailscale do PC (ex: `100.x.x.x`) no PrismLive

---

## 🖥️ Painel Web — Páginas

| Página | Para que serve |
|--------|---------------|
| **Dashboard** | CPU, RAM, bitrate, alertas de stream |
| **Monitor ao Vivo** | Player HTTP-FLV do stream em tempo real |
| **Chaves de Stream** | Criar, renomear e remover chaves de acesso |
| **Controle OBS** | Trocar cenas, stream, gravação remotamente |
| **Histórico** | Lives anteriores com duração e estatísticas |
| **Logs** | Terminal de logs do servidor em tempo real |
| **Configurações** | Portas, senha do administrador |

---

## 📁 Estrutura do Projeto

```
IRL/
├── Dockerfile               ← Build da imagem Docker
├── docker-compose.yml       ← Orquestração dos serviços
├── .env.example             ← Template de variáveis de ambiente
├── instalar.bat             ← Instalação Windows (desenvolvimento)
├── iniciar.bat              ← Inicialização Windows (desenvolvimento)
├── data/                    ← Dados persistentes (Docker)
│   ├── irl.db               ← Banco SQLite (criado automaticamente)
│   └── media/               ← Segmentos HLS gerados
├── server/                  ← Backend Node.js
│   ├── config.json          ← Config de rede (portas RTMP/HTTP)
│   ├── config.example.json  ← Template de configuração
│   ├── irl.db               ← Banco SQLite (modo desenvolvimento)
│   ├── overlay/             ← Overlay HTML para o OBS
│   └── src/
│       ├── index.js         ← Entry point
│       ├── db.js            ← Módulo SQLite central
│       ├── middleware/
│       │   └── auth.js      ← Verificação JWT
│       └── routes/
│           ├── auth.js      ← Login e troca de senha
│           ├── keys.js      ← Chaves de stream
│           ├── config.js    ← Configurações de rede
│           ├── status.js    ← Status do servidor
│           ├── obs.js       ← Controle OBS WebSocket
│           ├── history.js   ← Histórico de sessões
│           └── logs.js      ← Logs em tempo real (SSE)
└── dashboard/               ← Frontend React + Vite
    └── src/
        ├── pages/           ← Dashboard, Player, Keys, OBS, Logs, History
        ├── components/      ← Layout, Sidebar
        └── context/         ← AuthContext, ThemeContext
```

---

## ❓ Problemas Comuns

<details>
<summary><b>O PrismLive não consegue conectar</b></summary>

- Verifique se o servidor está rodando
- Confirme o IP correto (Tailscale: `100.x.x.x`, VPS: IP público)
- Confirme que a porta 1935 está aberta no firewall
- Copie a chave de stream direto do painel (clique em Copiar)

</details>

<details>
<summary><b>O painel não abre no navegador</b></summary>

- **Desenvolvimento:** aguarde e acesse http://localhost:5173
- **Docker:** acesse http://SEU-IP:3001
- Verifique se o container está rodando: `docker compose ps`

</details>

<details>
<summary><b>O vídeo não aparece no "Monitor ao Vivo"</b></summary>

- Aguarde o PrismLive enviar pelo menos 3 segundos de vídeo
- Clique em "Recarregar" na página
- Confirme que a chave no PrismLive é a mesma do painel

</details>

<details>
<summary><b>No Docker, o banco de dados some após restart</b></summary>

- O volume `./data/irl.db` precisa existir no host
- Verifique se o `docker-compose.yml` tem os volumes configurados
- Execute `docker compose down` (sem `--volumes`) para preservar os dados

</details>

<details>
<summary><b>Erro de compilação do better-sqlite3 no Docker</b></summary>

- A imagem Alpine já inclui `python3 make g++` para compilar módulos nativos
- Se ainda falhar, use a imagem base `node:20` (Debian) em vez de `node:20-alpine`

</details>

---

## 🔒 Segurança

- **Mude a senha do painel** imediatamente após instalar
- **Defina um JWT_SECRET forte** no `.env` antes de expor na internet
- **Não compartilhe suas chaves de stream** — quem tiver a chave pode transmitir no seu servidor
- Para HTTPS: coloque um **Nginx** na frente com certificado Let's Encrypt
- Prefira **Tailscale** ou **VPS privada** a abrir portas diretamente no roteador doméstico

---

## 📄 Licença

MIT — Livre para uso pessoal e comercial.

---

<div align="center">
<b>⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!</b>
</div>
