# KAIOKÊ 🎤

Site de karaokê com interface neon, salas para festas, pedidos de música pelo celular, fila compartilhada, controle do telão, QR Code, links do YouTube e busca via API. **Projeto Next.js 15 + TypeScript + CSS responsivo + Supabase.**

## O que já vem pronto

- Criar uma festa com código de 6 caracteres e chave privada do anfitrião.
- Convidar amigos por QR Code ou link `https://seusite.com/room/CODIGO`.
- Convidados escolhem nome e pedem músicas pelo próprio telefone.
- Colar link direto do YouTube **sem gastar pesquisa da YouTube Data API**.
- Pesquisar karaokês no YouTube, sujeito à cota oficial da API.
- Fila sincronizada a cada 2,5 segundos (polling), pronta para uso em aparelhos diferentes.
- Telão com player oficial do YouTube, controles de pausar, continuar, pular, início de show e próxima música automática quando o vídeo termina.
- Painel de administração protegido por token de anfitrião armazenado somente no navegador criador.

## Instalação

1. Instale Node.js 20.9 ou superior.
2. Abra a pasta do projeto no terminal:

```bash
npm install
cp .env.example .env.local
```

No Windows PowerShell, em vez de `cp`, execute: `Copy-Item .env.example .env.local`.

3. Crie um projeto gratuito em **https://supabase.com/dashboard**. Em SQL Editor, cole e execute o arquivo `supabase.sql`.
4. Em Project Settings / API, copie a URL e a chave **service_role (secret)** para `.env.local`. **Nunca** coloque essa chave em variável com prefixo `NEXT_PUBLIC_`, no GitHub ou no navegador.
5. No **https://console.cloud.google.com/**, crie um projeto, ative a **YouTube Data API v3**, crie uma API Key e coloque em `YOUTUBE_API_KEY` no `.env.local`. Opcional: se não configurá-la, as salas e os links diretos continuam funcionando, mas a pesquisa ficará indisponível.
6. Execute:

```bash
npm run dev
```

Abra **http://localhost:3000**, crie a festa. Para experimentar no celular na mesma rede, acesse pelo IP LAN do computador (`http://SEU-IP:3000`) e use a sala acessada por esse IP; QR codes gerados com localhost não abrem em outros aparelhos.

## Publicar na Vercel

1. Envie a pasta para um repositório privado no GitHub.
2. Importe o repositório em https://vercel.com/new.
3. Configure **SUPABASE_URL**, **SUPABASE_SERVICE_ROLE_KEY** e **YOUTUBE_API_KEY** em Project Settings → Environment Variables.
4. Faça Deploy. O QR Code passará a usar o endereço público de seu site.

## Atenção

- **Publicidade:** anúncios podem aparecer nos vídeos incorporados. O projeto não bloqueia anúncios.
- **Autoplay:** navegadores exigem interação para começar a reprodução. O anfitrião deve clicar em **Começar show**.
- **Player indisponível:** alguns vídeos impedem incorporação; escolha outro karaokê.
- **Cota:** consultas pelo botão de busca usam a YouTube Data API. Links diretos não usam `search.list`. A busca está configurada para `videoEmbeddable=true`.
- **Direitos autorais:** o site reproduz vídeos no player oficial, sem fazer download nem reprocessar áudio; respeite as regras da plataforma e direitos de terceiros.
- **Segurança / uso em casa:** qualquer pessoa com o código pode adicionar músicas. A chave do anfitrião fica no localStorage da máquina que criou a festa. Não é solução para eventos públicos de grande escala, moderação avançada ou controle rigoroso de abuso; para isso, adicione autenticação e rate limiting.
- **Supabase:** políticas RLS ficam habilitadas, sem políticas de acesso público; todas as operações passam pelo servidor, que usa a chave secreta. O endpoint público de criação e pedidos deve ter rate limiting em uso fora do ambiente doméstico.
- **Sincronização:** atualiza a cada 2,5 s. Se o anfitrião usar pausa/avanço diretamente nos controles internos do player YouTube, essa alteração não atualiza o banco, por isso prefira os botões do KAIOKÊ.

## Estrutura

- `app/page.tsx`: início, criar festa e entrar por código
- `app/room/[code]`: interface dos convidados
- `app/tv/[code]`: telão e controle do anfitrião
- `app/api/search`: pesquisa pelo YouTube
- `app/api/rooms`: salas e fila
- `components/youtube-player.tsx`: integração IFrame
- `supabase.sql`: estrutura do banco

## Variáveis

```dotenv
SUPABASE_URL=https://projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
YOUTUBE_API_KEY=...
```
