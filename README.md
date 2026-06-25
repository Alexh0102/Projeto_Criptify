# CriptoVéu

CriptoVéu é uma aplicação web pública e open source para proteger arquivos, mensagens, QR Codes, links, imagens com esteganografia e notas diretamente no navegador.

O projeto foi construído com foco em privacidade: arquivos, senhas, mensagens e notas são processados no dispositivo do usuário, sem upload de dados sensíveis para servidores da aplicação.

**Site em produção:** https://www.xn--criptovu-h1a.com/

> Aviso importante: o CriptoVéu não deve ser interpretado como uma solução “100% segura” ou como substituto para auditoria criptográfica formal. A segurança final depende da senha escolhida, do dispositivo, do navegador, da integridade do código JavaScript entregue ao usuário e do ambiente de execução.

---

## Resumo

O objetivo do CriptoVéu é oferecer ferramentas simples para criptografia, descriptografia e compartilhamento protegido de conteúdo em um ambiente **100% client-side**.

A aplicação usa a **Web Crypto API** nativa do navegador para realizar criptografia autenticada com **AES-GCM**. Novos pacotes de arquivos usam **Argon2id em WebAssembly**, executado dentro de um **Web Worker**. Formatos anteriores, mensagens, QR Codes, links protegidos e notas preservam **PBKDF2/SHA-256** para compatibilidade com payloads já existentes.

Principais recursos:

- Criptografia e descriptografia de arquivos locais.
- Processamento por blocos para arquivos grandes.
- Pré-visualização local de arquivos descriptografados, quando o navegador oferece suporte.
- Geração de chave longa no estilo usado por formatos como `.crypt15`.
- QR Code protegido por senha.
- Link protegido com expiração embutida no payload e limite de visualizações controlado localmente no navegador.
- Esteganografia para esconder mensagens protegidas dentro de imagens.
- VéuNotes, um cofre local de notas criptografadas.
- PWA com service worker para cache controlado do shell da aplicação.

---

## Ferramentas disponíveis

| Rota | Ferramenta | Descrição |
|---|---|---|
| `/arquivos` | Criptografia de arquivos | Protege ou descriptografa arquivos locais usando senha. |
| `/qr-secreto` | QR protegido | Cria e lê QR Codes com mensagens criptografadas. |
| `/link-secreto` | Link protegido | Gera links com mensagem criptografada no hash da URL. |
| `/esteganografia` | Mensagem oculta | Esconde ou revela mensagens protegidas em imagens. |
| `/veu-notes` | VéuNotes | Mantém uma nota criptografada no `localStorage` do navegador. |
| `/seguranca` | Segurança | Explica o modelo de segurança adotado pelo projeto. |
| `/detalhes-tecnicos` | Detalhes técnicos | Apresenta informações técnicas da implementação. |

---

## Tecnologias

- React 18 com TypeScript.
- Vite 7 para desenvolvimento, build e preview.
- React Router DOM para navegação client-side.
- Tailwind CSS e PostCSS para estilização.
- lucide-react para ícones.
- Web Crypto API nativa do navegador.
- hash-wasm para Argon2id em WebAssembly, executado em Web Worker.
- qrcode para geração de QR Code.
- jsqr para leitura de QR Code em imagens.
- Service Worker e Web App Manifest para experiência PWA.
- ESLint com regras para React Hooks, React Refresh e TypeScript.

---

## Criptografia por ferramenta

| Ferramenta | Criptografia | Derivação de chave | Armazenamento / saída |
|---|---|---|---|
| Arquivos V3 | AES-256-GCM | Argon2id v1.3 via WASM em Web Worker | Arquivo `.criptoveu` |
| Arquivos legados | AES-GCM | PBKDF2/SHA-256 | Pacotes `CRIPTOVEU2`, `CRIPTIFY2` e `CRIPTIFY1` |
| Mensagens | AES-GCM | PBKDF2/SHA-256 | Payload próprio do CriptoVéu |
| QR protegido | AES-GCM | PBKDF2/SHA-256 | QR Code apontando para payload no hash da URL |
| Link protegido | AES-GCM | PBKDF2/SHA-256 | Payload criptografado no hash da URL |
| Esteganografia | Mensagem protegida antes da ocultação | PBKDF2/SHA-256 para a mensagem protegida | Imagem PNG com dados ocultos |
| VéuNotes | AES-GCM | PBKDF2/SHA-256 | `localStorage` do navegador |

---

## Como funciona

### Arquivos

A ferramenta de arquivos aceita múltiplos arquivos no modo de proteção e gera pacotes com extensão `.criptoveu`.

A criptografia acontece em blocos de até **2 MB**, reduzindo o consumo de memória e permitindo processar arquivos maiores com mais estabilidade.

Formato atual do pacote V3:

```text
CRIPTOVEU3 + ram_mb_ascii + passes_ascii + salt + iv_inicial
  + [tamanho_ciphertext + ciphertext]...
```

Estrutura do cabeçalho V3:

```text
offset  tamanho   campo
0       10        assinatura: "CRIPTOVEU3"
10      4         RAM Argon2id em MB, ASCII decimal
14      4         passes Argon2id, ASCII decimal
18      16        salt
34      12        IV inicial
46      ...       blocos criptografados
```

Detalhes técnicos:

- Algoritmo: **AES-256-GCM**.
- Derivação de chave para novos arquivos: **Argon2id v1.3 via WASM em Web Worker**.
- Parâmetros Argon2id: `t=2`, `p=1`.
- Perfis de memória Argon2id: **64 MB**, **256 MB** por padrão ou **512 MB**.
- A seleção de memória fica em cache apenas para criar arquivos novos.
- Cabeçalho V3: assinatura `CRIPTOVEU3` com 10 bytes, RAM em MB com 4 bytes ASCII, passes com 4 bytes ASCII, salt com 16 bytes e IV inicial com 12 bytes.
- A descriptografia V3 lê RAM e passes diretamente do cabeçalho; não depende de `localStorage`.
- Cada bloco tem até 2 MB.
- O tamanho do bloco, sua ordem e a marca do bloco final entram no AAD, junto com o cabeçalho fixo, para rejeitar alterações, reordenação indevida e truncamentos.
- O primeiro bloco usa o IV armazenado no cabeçalho.
- Os blocos seguintes usam IVs exclusivos derivados do IV inicial e do índice do bloco.
- Compatibilidade de leitura com pacotes `CRIPTOVEU2`, `CRIPTIFY2` e `CRIPTIFY1`, que continuam usando PBKDF2.
- Limite recomendado de arquivo: **2 GB**.

> Observação: em AES-GCM, o IV/nonce nunca deve se repetir com a mesma chave. O formato V3 deriva IVs exclusivos por bloco para evitar reutilização dentro do mesmo pacote.

---

### Mensagens, QR Code e links protegidos

Mensagens são criptografadas localmente com AES-GCM e serializadas em payloads próprios do CriptoVéu.

O QR protegido aponta para a rota `/qr-secreto` usando o hash da URL. O link protegido usa a rota `/link-secreto`, também com dados no hash da URL.

Importante:

- O hash da URL não é enviado ao servidor em requisições HTTP tradicionais.
- Quem recebe o link ou o QR Code tem acesso ao payload criptografado.
- A proteção real depende da senha usada para abrir a mensagem.
- Os formatos atuais de mensagens, QR Codes e links continuam derivados com **PBKDF2/SHA-256 com 600.000 iterações**, para que payloads já compartilhados permaneçam legíveis.

#### Sobre expiração e limite de visualizações

Como o CriptoVéu não usa banco de dados para controlar estado global, o limite de visualizações do link protegido é controlado localmente pelo navegador que abre o link.

Isso significa que:

- o limite pode funcionar como proteção local contra reabertura no mesmo navegador;
- não impede que o mesmo payload seja aberto em outro navegador, outro dispositivo ou outra cópia do link;
- não deve ser tratado como visualização única global garantida por servidor.

---

### Esteganografia

A ferramenta de esteganografia usa imagem local, canvas do navegador e técnica LSB nos canais RGB para inserir uma mensagem protegida.

A saída é uma imagem PNG contendo os dados ocultos. A mensagem deve ser protegida por senha antes de ser escondida.

Limites aplicados:

- Imagem de entrada com até **10 MB**.
- Resolução máxima de **20 milhões de pixels**.
- Validação de capacidade da imagem antes de gravar a mensagem.

---

### VéuNotes

O VéuNotes salva um único cofre de texto criptografado no `localStorage` do navegador.

A nota é criptografada com AES-GCM e protegida por senha mestre.

Parâmetros principais:

- Senha mínima: **12 caracteres**.
- PBKDF2 com SHA-256.
- Iterações padrão: **210.000**.
- Limite máximo aceito em cofres importados: **1.200.000 iterações**.
- Backup em JSON com validação de formato antes da importação.

> Atenção: o `localStorage` pertence ao navegador atual e pode ser apagado pelo usuário, pelo sistema, por extensões, por limpeza de dados ou por políticas do navegador. Faça backup quando necessário.

---

## Modelo de ameaça

O CriptoVéu foi projetado para reduzir a exposição de dados sensíveis em ferramentas web, mantendo arquivos, mensagens, notas e senhas no dispositivo do usuário sempre que possível.

### O que o projeto busca proteger

- Conteúdo de arquivos, mensagens e notas contra leitura sem a senha correta.
- Dados sensíveis contra upload para servidores da aplicação.
- Pacotes criptografados contra alterações, truncamentos e corrupção, usando autenticação do AES-GCM.
- Ataques offline contra novos pacotes de arquivos, tornando tentativas de senha mais custosas com Argon2id e uso explícito de memória.
- Exposição acidental de payloads em links e QR Codes, desde que a senha tenha entropia suficiente.

### O que está fora do escopo

- Dispositivos comprometidos por malware, keylogger, screen recorder ou extensão maliciosa.
- Senhas fracas, reutilizadas ou compartilhadas por canais inseguros.
- Comprometimento do domínio, pipeline de build, provedor de hospedagem, conta de deploy ou JavaScript servido ao navegador.
- Phishing com cópias falsas da aplicação.
- Recuperação de conteúdo quando a senha é perdida.
- Garantia global de expiração ou visualização única em links, já que não há banco de dados ou servidor controlando estado global.
- Proteção contra todos os modelos futuros de computação quântica.

### Premissas de segurança

- O usuário acessa o domínio oficial via HTTPS.
- O navegador implementa corretamente a Web Crypto API.
- O código JavaScript entregue ao usuário é íntegro.
- O usuário escolhe senhas fortes e únicas.
- O dispositivo do usuário não está comprometido.

---

## Nível de segurança

O CriptoVéu adota um modelo de segurança forte para uma aplicação client-side, mas é importante entender seus limites.

A segurança depende principalmente de:

- força da senha escolhida pelo usuário;
- integridade do código JavaScript servido pelo domínio oficial;
- uso de HTTPS ou localhost, exigido para acesso seguro à Web Crypto API;
- ausência de envio de dados sensíveis para servidores da aplicação;
- segurança do dispositivo e do navegador do usuário.

Medidas implementadas:

- Processamento local para arquivos, mensagens e notas.
- Senhas não são armazenadas pela aplicação.
- Chaves criptográficas são derivadas no navegador.
- Novos pacotes de arquivos usam Argon2id com custo de memória explícito no próprio cabeçalho.
- AES-GCM fornece confidencialidade e autenticação do conteúdo.
- `salt` e `iv` são gerados com `crypto.getRandomValues`.
- Bloqueio de processamento fora de contexto seguro, como páginas sem HTTPS.
- Validação de tamanho para arquivos, imagens, QR Codes e backups.
- Tratamento de erro para senha incorreta, arquivo inválido e payload corrompido.
- Pré-visualização local usando URLs temporárias criadas no navegador.

Headers e políticas de hardening configurados em `vercel.json` e `netlify.toml`:

- Content-Security-Policy restritiva.
- Strict-Transport-Security.
- Cross-Origin-Opener-Policy.
- Cross-Origin-Embedder-Policy.
- Cross-Origin-Resource-Policy.
- Referrer-Policy: `no-referrer`.
- Permissions-Policy com recursos sensíveis desabilitados.
- X-Frame-Options: `DENY`.
- X-Content-Type-Options: `nosniff`.
- `frame-ancestors 'none'`.
- `object-src 'none'`.
- Cache conservador para HTML e cache longo para assets versionados.

Hardening de build:

- Build de produção sem sourcemaps.
- Minificação com esbuild.
- Remoção de `console` e `debugger` no build.
- Target moderno `es2022`.

---

## Limitações importantes

Nenhuma aplicação web client-side consegue esconder totalmente o próprio código, porque o navegador precisa receber JavaScript executável. Por isso, o projeto evita depender de segredo embutido no frontend.

O CriptoVéu não deve ser entendido como substituto para auditoria criptográfica formal. Ele usa primitivas sólidas do navegador, mas a proteção final ainda depende da senha, do dispositivo, do navegador e da integridade do deploy.

Argon2id dificulta ataques de força bruta paralela ao exigir memória por tentativa. AES-256 é considerado uma escolha prudente diante de modelos quânticos conhecidos, mas o projeto não afirma resistência quântica absoluta. Senhas com pouca entropia continuam vulneráveis a adivinhação.

Também é importante lembrar:

- Se a senha for perdida, o conteúdo não poderá ser recuperado.
- Links e QR Codes carregam o payload criptografado; compartilhe apenas com pessoas autorizadas.
- O limite de visualizações do link protegido é controlado localmente pelo navegador que abre o link.
- O `localStorage` do VéuNotes pertence ao navegador atual e pode ser apagado pelo usuário, pelo sistema ou por políticas do navegador.
- O projeto não usa, atualmente, KEMs pós-quânticos para troca de chaves entre usuários. Ferramentas baseadas em senha dependem principalmente da entropia da senha e do custo da KDF.

---

## Auditoria e contribuições de segurança

Este projeto é open source e revisões de segurança são bem-vindas.

Áreas especialmente importantes para revisão:

- uso correto de AES-GCM e IVs únicos;
- geração de `salt` e `iv` com `crypto.getRandomValues`;
- derivação de chave com Argon2id e PBKDF2;
- validação de payloads, cabeçalhos e tamanhos;
- autenticação de dados adicionais, especialmente nos blocos de arquivos;
- segurança do Service Worker e política de cache;
- CSP e headers de segurança;
- riscos de XSS e manipulação de DOM;
- segurança do `localStorage` no VéuNotes;
- compatibilidade e segurança dos formatos legados.

Para reportar vulnerabilidades ou discutir melhorias de segurança, consulte o arquivo `SECURITY.md` do repositório.

---

## Roadmap

Ideias e melhorias futuras planejadas ou em estudo:

- [ ] Chat criptografado efêmero sem banco de dados.
- [ ] Pareamento por ID temporário de sala.
- [ ] Transporte por WebSocket ou WebRTC DataChannel.
- [ ] Criptografia ponta a ponta no navegador.
- [ ] Troca de chaves híbrida clássica/pós-quântica para o chat.
- [ ] Verificação manual de fingerprint da sessão.
- [ ] Migração gradual de mensagens, QR Codes, links e VéuNotes para Argon2id, mantendo compatibilidade com payloads antigos.

> Observação sobre o futuro chat: mesmo sem armazenar mensagens, um servidor de sinalização ou relay poderá observar metadados como IP, horário, duração da sessão e tamanho aproximado dos pacotes. Isso deve ser documentado claramente quando o recurso for implementado.

---

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

---

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

---

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

---

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

---

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.
