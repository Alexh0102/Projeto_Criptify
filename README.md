# CriptoVéu

CriptoVéu é uma aplicação web pública para proteger arquivos, mensagens e notas diretamente no navegador. O projeto foi construído com foco em privacidade: os dados sensíveis são processados no dispositivo do usuário, sem upload de arquivos, senhas ou mensagens para servidores da aplicação.

Site em produção: `https://www.xn--criptovu-h1a.com/`

## Resumo

O objetivo do CriptoVéu é oferecer ferramentas simples para criptografia, recuperação e compartilhamento seguro de conteúdo em um ambiente 100% client-side. A aplicação usa a Web Crypto API nativa do navegador para realizar criptografia autenticada com AES-GCM e derivação de chave por PBKDF2.

Principais recursos:

- Criptografia e descriptografia de arquivos locais.
- Processamento por blocos para arquivos grandes.
- Pré-visualização local de arquivos recuperados, quando o navegador oferece suporte.
- Geração de chave longa no estilo usado por formatos como `.crypt15`.
- QR Code protegido por senha.
- Link protegido com expiração e limite local de visualizações.
- Esteganografia para esconder mensagens protegidas dentro de imagens.
- VéuNotes, um cofre local de notas criptografadas.
- PWA com service worker para cache controlado do shell da aplicação.

## Ferramentas disponíveis

| Rota | Ferramenta | Descrição |
| --- | --- | --- |
| `/arquivos` | Criptografia de arquivos | Protege ou recupera arquivos locais usando senha. |
| `/qr-secreto` | QR protegido | Cria e lê QR Codes com mensagens criptografadas. |
| `/link-secreto` | Link protegido | Gera links com mensagem criptografada no hash da URL. |
| `/esteganografia` | Mensagem oculta | Esconde ou revela mensagens protegidas em imagens. |
| `/veu-notes` | VéuNotes | Mantém uma nota criptografada no `localStorage` do navegador. |
| `/seguranca` | Segurança | Explica o modelo de segurança adotado pelo projeto. |
| `/detalhes-tecnicos` | Detalhes técnicos | Apresenta informações técnicas da implementação. |

## Tecnologias

- React 18 com TypeScript.
- Vite 7 para desenvolvimento, build e preview.
- React Router DOM para navegação client-side.
- Tailwind CSS e PostCSS para estilização.
- `lucide-react` para ícones.
- Web Crypto API nativa do navegador.
- `qrcode` para geração de QR Code.
- `jsqr` para leitura de QR Code em imagens.
- Service Worker e Web App Manifest para experiência PWA.
- ESLint com regras para React Hooks, React Refresh e TypeScript.

## Como funciona

### Arquivos

A ferramenta de arquivos aceita múltiplos arquivos no modo de proteção e gera pacotes com extensão `.criptoveu`. A criptografia acontece em blocos de 2 MB, reduzindo o consumo de memória e permitindo processar arquivos maiores com mais estabilidade.

Formato atual do pacote:

```text
CRIPTOVEU2 + salt + [iv + tamanho_do_bloco + ciphertext]...
```

Detalhes técnicos:

- Algoritmo: AES-256-GCM.
- Derivação de chave: PBKDF2 com SHA-256.
- Iterações para arquivos e mensagens: 600.000.
- `salt`: 16 bytes aleatórios por arquivo ou mensagem.
- `iv`: 12 bytes aleatórios por bloco.
- Dados autenticados adicionais por bloco para dificultar alteração ou reordenação indevida.
- Compatibilidade de leitura com pacotes antigos `.cryptify`.
- Limite recomendado de arquivo: 2 GB.

### Mensagens, QR Code e links protegidos

Mensagens são criptografadas localmente com AES-GCM e serializadas em payloads próprios do CriptoVéu. O QR protegido aponta para a rota `/qr-secreto` usando o hash da URL, e o link protegido usa a rota `/link-secreto` também com dados no hash.

Importante: o hash da URL não é enviado ao servidor em requisições HTTP tradicionais. Ainda assim, quem recebe o link ou o QR tem acesso ao payload criptografado; a proteção real depende da senha usada para abrir a mensagem.

### Esteganografia

A ferramenta de esteganografia usa imagem local, canvas do navegador e técnica LSB nos canais RGB para inserir uma mensagem protegida. A saída é uma imagem PNG contendo os dados ocultos. A mensagem deve ser protegida por senha antes de ser escondida.

Limites aplicados:

- Imagem de entrada com até 10 MB.
- Resolução máxima de 20 milhões de pixels.
- Validação de capacidade da imagem antes de gravar a mensagem.

### VéuNotes

O VéuNotes salva um único cofre de texto criptografado no `localStorage` do navegador. A nota é criptografada com AES-GCM e protegida por senha mestre.

Parâmetros principais:

- Senha mínima: 12 caracteres.
- PBKDF2 com SHA-256.
- Iterações padrão: 210.000.
- Limite máximo aceito em cofres importados: 1.200.000 iterações.
- Backup em JSON com validação de formato antes da importação.

## Nível de segurança

O CriptoVéu adota um modelo de segurança forte para uma aplicação client-side, mas é importante entender seus limites. A segurança depende de quatro fatores principais:

1. A força da senha escolhida pelo usuário.
2. A integridade do código JavaScript servido pelo domínio oficial.
3. O uso de HTTPS ou `localhost`, exigido para acesso seguro à Web Crypto API.
4. A ausência de envio de dados sensíveis para servidores da aplicação.

Medidas implementadas:

- Processamento 100% local para arquivos, mensagens e notas.
- Senhas não são armazenadas pela aplicação.
- Chaves criptográficas são derivadas no navegador.
- AES-GCM fornece confidencialidade e autenticação do conteúdo.
- `salt` e `iv` são gerados com `crypto.getRandomValues`.
- Bloqueio de processamento fora de contexto seguro, como páginas sem HTTPS.
- Validação de tamanho para arquivos, imagens, QR Codes e backups.
- Tratamento de erro para senha incorreta, arquivo inválido e payload corrompido.
- Pré-visualização local usando URLs temporárias criadas no navegador.

Headers e políticas de hardening configurados em `vercel.json` e `netlify.toml`:

- `Content-Security-Policy` restritiva.
- `Strict-Transport-Security`.
- `Cross-Origin-Opener-Policy`.
- `Cross-Origin-Embedder-Policy`.
- `Cross-Origin-Resource-Policy`.
- `Referrer-Policy: no-referrer`.
- `Permissions-Policy` com recursos sensíveis desabilitados.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `frame-ancestors 'none'`.
- `object-src 'none'`.
- Cache conservador para HTML e cache longo para assets versionados.

Hardening de build:

- Build de produção sem sourcemaps.
- Minificação com `esbuild`.
- Remoção de `console` e `debugger` no build.
- Target moderno `es2022`.

## Limitações importantes

Nenhuma aplicação web client-side consegue esconder totalmente o próprio código, porque o navegador precisa receber JavaScript executável. Por isso, o projeto evita depender de segredo embutido no frontend.

O CriptoVéu não deve ser entendido como substituto para auditoria criptográfica formal. Ele usa primitivas sólidas do navegador, mas a proteção final ainda depende da senha, do dispositivo, do navegador e da integridade do deploy.

Também é importante lembrar:

- Se a senha for perdida, o conteúdo não poderá ser recuperado.
- Links e QR Codes carregam o payload criptografado; compartilhe apenas com pessoas autorizadas.
- O limite de visualizações do link protegido é controlado localmente pelo navegador que abre o link.
- O `localStorage` do VéuNotes pertence ao navegador atual e pode ser apagado pelo usuário, pelo sistema ou por políticas do navegador.

## Requisitos

- Node.js compatível com Vite 7.
- npm.
- Navegador moderno com suporte a Web Crypto API, Streams, Canvas e Service Worker.
- HTTPS em produção.

Navegadores-alvo:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox.
- Safari moderno, respeitando limites práticos de memória do navegador.

## Como rodar localmente

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Gere o build de produção:

```bash
npm run build
```

Teste o build local:

```bash
npm run preview
```

Execute a análise estática:

```bash
npm run lint
```

## Deploy

O projeto está preparado para deploy em Vercel e Netlify.

Configuração esperada:

- Build command: `npm run build`.
- Install command: `npm ci`.
- Output directory: `dist`.
- Rewrites para rotas SPA apontando para `index.html`.
- Headers de segurança aplicados na borda da plataforma.

Após o deploy, valide:

- HTTPS ativo.
- Headers de segurança presentes.
- Criptografia e descriptografia de arquivos.
- Geração e leitura de QR protegido.
- Link protegido.
- Esteganografia.
- VéuNotes.
- Funcionamento do PWA.

## Estrutura do projeto

```text
src/
  components/          Componentes reutilizáveis da interface
  components/file-crypto/
                       Área de criptografia, download e pré-visualização
  config/              Definições das ferramentas exibidas no site
  context/             Tema e provedores globais
  hooks/               Hooks de processamento, QR e inatividade
  lib/                 Criptografia, payloads, esteganografia e storage
  pages/               Páginas e rotas principais
public/
  service-worker.js    Service worker do PWA
  site.webmanifest     Manifesto da aplicação
```

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.
