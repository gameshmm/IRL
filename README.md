<div align="center">

<img src="https://img.shields.io/badge/IRL_Stream-Servidor_Pessoal-6c63ff?style=for-the-badge&logo=twitch&logoColor=white" />

# 📡 IRL Stream — Seu Próprio Servidor de Livestream

**Transmita da rua direto para o Twitch, YouTube ou qualquer plataforma, passando pelo seu PC em casa.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Windows](https://img.shields.io/badge/Windows-10%2B-0078D6?style=flat-square&logo=windows)](https://www.microsoft.com/windows)
[![OBS](https://img.shields.io/badge/OBS-28%2B-302E31?style=flat-square&logo=obs-studio)](https://obsproject.com/)
[![PrismLive](https://img.shields.io/badge/PrismLive-Android%20%2F%20iOS-FF6B35?style=flat-square)](https://prismlive.com/)

</div>

---

## 🤔 Como funciona?

```
Celular (PrismLive)  →  Seu PC (Servidor IRL)  →  OBS  →  Twitch / YouTube
```

1. Você sai na rua com o celular
2. O PrismLive envia o vídeo pelo 4G/5G para o seu servidor em casa
3. O OBS no seu PC recebe o vídeo, adiciona overlays, telas, etc.
4. O OBS transmite para o Twitch, YouTube ou onde você quiser

---

## ✅ O que você vai precisar

| Item | Link para baixar | Gratuito? |
|------|-----------------|-----------|
| **Node.js** (versão LTS) | https://nodejs.org/ | ✅ Sim |
| **OBS Studio** | https://obsproject.com/ | ✅ Sim |
| **PrismLive** (celular) | [Android](https://play.google.com/store/apps/details?id=com.prism.live) / [iOS](https://apps.apple.com/app/id1319056339) | ✅ Sim |
| **Git** (opcional) | https://git-scm.com/ | ✅ Sim |
| **Tailscale VPN** (recomendado) | https://tailscale.com/ | ✅ Sim |

---

## 🚀 Instalação (Passo a Passo)

### Passo 1 — Baixar o Node.js

1. Acesse https://nodejs.org/
2. Clique em **"LTS"** (versão recomendada)
3. Instale normalmente (Next → Next → Finish)
4. Reinicie o computador após instalar

---

### Passo 2 — Baixar o projeto

**Opção A — Com Git (recomendado):**
```
Abra o PowerShell ou CMD e digite:
git clone https://github.com/SEU_USUARIO/irl-stream.git
cd irl-stream
```

**Opção B — Sem Git:**
1. Clique em **Code → Download ZIP** nesta página
2. Extraia o ZIP em uma pasta fácil (ex: `C:\IRL`)

---

### Passo 3 — Instalar o sistema

1. Abra a pasta do projeto no Windows Explorer
2. Dê **duplo clique** no arquivo `instalar.bat`
3. Aguarde a instalação terminar (pode levar 2-3 minutos)

> ⚠️ Se aparecer "Windows protegeu seu PC", clique em **"Mais informações"** → **"Executar mesmo assim"**

---

### Passo 4 — Iniciar o sistema

1. Dê **duplo clique** no arquivo `iniciar.bat`
2. O navegador vai abrir automaticamente em http://localhost:5173
3. Faça login com:
   - **Usuário:** `admin`
   - **Senha:** `admin123`

> 🔐 **Importante:** Mude a senha padrão no painel → Configurações após o primeiro acesso!

---

### Passo 5 — Criar sua chave de stream

1. No painel, clique em **"Chaves de Stream"** no menu
2. Clique em **"+ Nova Chave"**
3. Digite um nome (ex: "Meu Stream")
4. Anote a chave gerada — você vai precisar no PrismLive

---

### Passo 6 — Configurar o PrismLive

1. Abra o **PrismLive** no celular
2. Toque nos **três pontos** (⋮) → **Configurações avançadas** → **RTMP personalizado**
3. Preencha:
   - **URL do servidor:** `rtmp://SEU-IP:1935/live`
   - **Chave de stream:** cole a chave que você gerou no painel
4. Toque em **Ir ao Vivo!**

> 📌 **Qual é o meu IP?** Veja abaixo a seção [Como saber meu IP](#-como-saber-meu-ip)

---

### Passo 7 — Configurar o OBS

1. Abra o **OBS Studio**
2. Vá em **Fontes** → **+** → **Fonte de Mídia**
3. Marque **"Arquivo de rede"** e cole a URL:
   ```
   http://localhost:8000/live/SUA_CHAVE.flv
   ```
   > Substitua `SUA_CHAVE` pela chave gerada no painel
4. Marque **"Reiniciar quando estiver ativo"** e **"Mostrar somente quando ativo"**

**Ou configure o OBS para receber RTMP direto:**
1. No OBS: **Ferramentas** → **WebSocket Server Settings** → ative
2. No painel do IRL Stream, vá em **"Controle OBS"** e conecte

---

### Passo 8 — Adicionar o Overlay de Sinal (Opcional)

O overlay aparece **automaticamente** no OBS quando o sinal do celular cai ou fica fraco.

1. No OBS, numa cena: **+** → **Navegador (Browser Source)**
2. URL: `http://localhost:3001/overlay/`
3. Largura: `1920` / Altura: `1080`
4. Mova para a **camada mais alta** da cena

---

## 🌐 Como saber meu IP?

### Se você usa Tailscale (recomendado):
> O Tailscale conecta seu celular ao PC sem abrir portas no roteador.

1. Instale o Tailscale no PC: https://tailscale.com/download
2. Instale o **Tailscale** no celular (Play Store / App Store)
3. Faça login com a **mesma conta** nos dois dispositivos
4. O IP do seu PC vai aparecer no app, algo como `100.x.x.x`
5. Use esse IP no PrismLive

### Se você quer abrir porta no roteador:
1. Abra o CMD e digite: `ipconfig`
2. Anote o **"Endereço IPv4"** (ex: `192.168.1.100`)
3. Esse é seu IP local — funciona somente na mesma rede Wi-Fi
4. Para usar da rua, você precisa abrir as portas **1935 (TCP)** no seu roteador

> ⚠️ Abrir portas no roteador pode ser um risco de segurança. **Tailscale é mais seguro.**

---

## 📱 Configuração do PrismLive (detalhado)

<table>
<tr><td><b>Campo no PrismLive</b></td><td><b>O que colocar</b></td></tr>
<tr><td>Tipo de transmissão</td><td>RTMP personalizado</td></tr>
<tr><td>URL do servidor</td><td><code>rtmp://SEU-IP:1935/live</code></td></tr>
<tr><td>Chave de stream</td><td>A chave gerada no painel</td></tr>
<tr><td>Resolução</td><td>720p ou 1080p</td></tr>
<tr><td>Bitrate de vídeo</td><td>2000-4000 kbps (depende do 4G)</td></tr>
<tr><td>Codec de vídeo</td><td>H.264</td></tr>
<tr><td>Codec de áudio</td><td>AAC</td></tr>
</table>

---

## 🖥️ Painel Web — Resumo das páginas

| Página | Para que serve |
|--------|---------------|
| **Dashboard** | Ver se está recebendo stream, CPU/RAM do PC |
| **Monitor ao Vivo** | Ver o que o celular está transmitindo |
| **Chaves de Stream** | Criar/apagar chaves de acesso |
| **Controle OBS** | Trocar cenas, iniciar/parar gravação remotamente |
| **Configurações** | Mudar portas, senha do administrador |

---

## ❓ Problemas comuns

<details>
<summary><b>O PrismLive não consegue conectar</b></summary>

- Verifique se o servidor está rodando (a janela do servidor não pode estar fechada)
- Confirme o IP correto — se estiver usando Tailscale, use o IP do Tailscale
- Confirme que a chave de stream está correta (copie direto do painel)
- Se estiver na mesma rede Wi-Fi, use o IP local (ex: `192.168.1.100`)

</details>

<details>
<summary><b>O painel não abre no navegador</b></summary>

- Feche e abra o `iniciar.bat` novamente
- Aguarde 10 segundos e tente: http://localhost:5173
- Verifique se o Node.js está instalado (abra o CMD e digite `node --version`)

</details>

<details>
<summary><b>O vídeo não aparece no "Monitor ao Vivo"</b></summary>

- Aguarde o PrismLive enviar pelo menos 5 segundos de vídeo
- Clique em "Recarregar" na página
- Verifique se a chave no PrismLive é a mesma do painel

</details>

<details>
<summary><b>O OBS não está recebendo o vídeo</b></summary>

- Confirme que a URL está certa: `http://localhost:8000/live/SUA_CHAVE.flv`
- Substitua `SUA_CHAVE` pela chave real (não o nome, mas o código)
- Tente desativar e ativar a fonte de mídia no OBS

</details>

<details>
<summary><b>Apareceu "AUTH ERROR" no servidor</b></summary>

- A chave usada no PrismLive não está cadastrada no painel
- Vá em **Chaves de Stream** e crie uma nova, ou copie a existente

</details>

---

## 📁 O que tem em cada pasta

```
IRL/
├── instalar.bat         ← Execute primeiro (instala tudo)
├── iniciar.bat          ← Execute para iniciar o sistema
├── server/              ← O servidor de mídia (não mexer)
│   ├── config.json      ← Configurações (portas, etc.)
│   └── overlay/         ← Overlay de sinal do OBS
└── dashboard/           ← O painel web (não mexer)
```

---

## 🔒 Segurança

- **Mude a senha do painel** imediatamente após instalar
- **Não compartilhe suas chaves de stream** — quem tiver a chave pode transmitir no seu servidor
- Se for expor o painel na internet, use HTTPS (Nginx + Let's Encrypt)
- Recomendamos **Tailscale** em vez de abrir portas no roteador

---

## 📄 Licença

MIT — Livre para uso pessoal e comercial.

---

<div align="center">
<b>⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!</b>
</div>
