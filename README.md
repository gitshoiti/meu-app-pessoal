# Meu App Pessoal

App pessoal para iPhone (PWA, um app web que se instala como app), em modo escuro, com:

- **Home** com busca que procura em todas as seções e cards para cada área
- **Afazeres**: checklist com data opcional
- **Minha Agenda**: compromissos com alerta (na hora, 10 min, 1 h, 1 dia antes…)
- **Financeiro**: contas a pagar (total em aberto, vencidas, aviso X dias antes) e **Metas** com barra de progresso, depósitos e retiradas
- **Médico**: consultas, exames, medicamentos, vacinas e anotações
- **Notificações** de compromissos, contas e consultas
- **📆 Exportar para o Calendário do iPhone** (`.ics`): os alarmes ficam no app Calendário nativo e tocam mesmo com o app fechado

Não precisa de compilação nem de dependências: são arquivos HTML, CSS e JS puros. Os dados ficam salvos **só no seu aparelho** (`localStorage`).

---

## Como instalar no iPhone

> As notificações e o modo "app de verdade" exigem que o app seja aberto por **HTTPS**
> e **adicionado à Tela de Início** pelo Safari (iOS 16.4 ou superior).

### Opção 1: GitHub Pages (grátis, recomendada)
1. No GitHub, abra o repositório → **Settings → Pages**.
2. Em *Source* escolha **Deploy from a branch**, selecione o branch e a pasta `/ (root)` → **Save**.
3. Em 1 ou 2 minutos aparece o link, algo como `https://SEU-USUARIO.github.io/meu-app-pessoal/`.
4. No iPhone, abra esse link no **Safari** → botão **Compartilhar** ⬆️ → **Adicionar à Tela de Início**.
5. Abra pelo ícone novo e toque no 🔔 para permitir notificações.

> Num repositório **privado**, o GitHub Pages só funciona em planos pagos. Se o seu for privado, use a opção 2.

### Opção 2: Netlify Drop (grátis, sem configurar nada)
1. No computador, acesse **app.netlify.com/drop**.
2. Arraste a pasta do projeto para a página.
3. Você recebe um link `https://….netlify.app` (crie uma conta grátis para o link não expirar).
4. No iPhone: Safari → Compartilhar → **Adicionar à Tela de Início**.

*(Vercel ou Cloudflare Pages funcionam do mesmo jeito: conecte o repositório e publique.)*

### Opção 3: Testar rápido pelo Wi-Fi de casa (sem publicar)
```bash
python3 -m http.server 8000
```
No iPhone, conectado ao mesmo Wi-Fi, abra `http://IP-DO-COMPUTADOR:8000`.
⚠️ Por ser `http` (sem HTTPS), **notificações e modo offline não funcionam**. Serve só para ver o layout.
Para ter HTTPS local, use um túnel como `npx localtunnel --port 8000` ou `cloudflared tunnel --url http://localhost:8000`.

### Opção 4 (futuro): virar app nativo da App Store
Dá para "embrulhar" este mesmo código com **Capacitor** e gerar um app iOS de verdade, com notificações locais
agendadas pelo sistema. Exige um **Mac com Xcode**. Para instalar só no seu iPhone, uma Apple ID grátis basta
(o app expira a cada 7 dias); com a conta de desenvolvedor (US$ 99/ano), dura 1 ano e dá para usar o TestFlight.

---

## Sobre as notificações no iPhone (importante)

- O app verifica os alertas **sempre que está aberto ou volta para a tela** e dispara a notificação na hora certa.
- O iOS **não deixa um app web agendar notificações com o app totalmente fechado** sem um servidor de push.
  Para não perder nada, use o botão **📆 Enviar ao Calendário do iPhone** na Agenda, no Financeiro e no Médico:
  ele cria os eventos com alarme no Calendário nativo, que avisa sempre.
- O `sw.js` já tem o código para receber **Web Push**. Se no futuro você quiser alertas com o app fechado
  sem passar pelo Calendário, é só conectar um servidor de push (ex.: Firebase Cloud Messaging ou um backend próprio).

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Página única do app |
| `styles.css` | Tema escuro |
| `app.js` | Telas, busca, dados, alertas e exportação `.ics` |
| `sw.js` | Service worker: modo offline e cliques nas notificações |
| `manifest.webmanifest` | Nome, ícone e modo tela cheia |
| `icons/` | Ícones do app |

Os dados de exemplo aparecem só na primeira vez que você abre o app. É só apagar com 🗑.
