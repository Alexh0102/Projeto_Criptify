# CriptoVéu

CriptoVéu é uma aplicação web pública e open source para proteger arquivos, mensagens, QR Codes, links, imagens com esteganografia e notas diretamente no navegador.

O projeto foi construído com foco em privacidade: arquivos, senhas, mensagens e notas são processados no dispositivo do usuário, sem upload de dados sensíveis para servidores da aplicação.

**Site em produção:** https://www.xn--criptovu-h1a.com/

> Aviso importante: o CriptoVéu não deve ser interpretado como uma solução “100% segura” ou como substituto para auditoria criptográfica formal. A segurança final depende da senha escolhida, do dispositivo, do navegador, da integridade do código JavaScript entregue ao usuário e do ambiente de execução.

---

## Resumo

O objetivo do CriptoVéu é oferecer ferramentas simples para criptografia, descriptografia e compartilhamento protegido de conteúdo em um ambiente **100% client-side**.

A aplicação usa a **Web Crypto API** nativa do navegador para realizar criptografia autenticada com **AES-GCM**. Novos arquivos, mensagens, QR Codes, links protegidos e cofres VéuNotes usam **Argon2id em WebAssembly**, executado dentro de um **Web Worker**. Formatos V1 anteriores com PBKDF2/SHA-256 continuam aceitos para leitura.

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
| Arquivos V4 | AES-256-GCM + manifesto SHA-256 cifrado | Argon2id v1.3 via WASM em Web Worker | Arquivo `.criptoveu` |
| Arquivos legados | AES-GCM | Argon2id no `CRIPTOVEU3`; PBKDF2/SHA-256 nos anteriores | Pacotes `CRIPTOVEU3`, `CRIPTOVEU2`, `CRIPTIFY2` e `CRIPTIFY1` |
| Mensagens `MSG2` | AES-256-GCM | Argon2id, 64 MB, `t=2`, `p=1` | Payload `CVM2` |
| QR protegido `QR2` | AES-256-GCM | Argon2id, 64 MB, `t=2`, `p=1` | Payload `CVQ2` no hash da URL |
| Link protegido `LINK2` | AES-256-GCM | Argon2id, 64 MB, `t=2`, `p=1` | Payload `CVL2` no hash da URL |
| Esteganografia | Mensagem `MSG2` protegida antes da ocultação | Argon2id, 64 MB, `t=2`, `p=1` | Imagem PNG com dados ocultos |
| VéuNotes `NOTE2` | AES-256-GCM | Argon2id, 128 MB, `t=2`, `p=1` | `localStorage` do navegador |
| Formatos V1 legados | AES-GCM | PBKDF2/SHA-256 | Leitura compatível; novas criações usam V2 |

---

## Como funciona

### Arquivos

A ferramenta de arquivos aceita múltiplos arquivos no modo de proteção e gera pacotes com extensão `.criptoveu`.

A criptografia acontece em blocos de até **2 MB**, reduzindo o consumo de memória e permitindo processar arquivos maiores com mais estabilidade.

Formato atual do pacote V4:

```text
CRIPTOVEU4 + ram_mb_ascii + passes_ascii + salt + iv_inicial
  + tamanho_bloco + quantidade_blocos
  + [tipo_dados + tamanho_ciphertext + ciphertext]...
  + [tipo_manifesto + tamanho_ciphertext + manifesto_cifrado]
```

Estrutura do cabeçalho V4:

```text
offset  tamanho   campo
0       10        assinatura: "CRIPTOVEU4"
10      4         RAM Argon2id em MB, ASCII decimal
14      4         passes Argon2id, ASCII decimal
18      16        salt
34      12        IV inicial
46      4         tamanho dos blocos em bytes
50      4         quantidade de blocos
54      ...       registros de dados e manifesto
```

Detalhes técnicos:

- Algoritmo: **AES-256-GCM**.
- Derivação de chave para novos arquivos: **Argon2id v1.3 via WASM em Web Worker**.
- Parâmetros Argon2id: `t=2`, `p=1`.
- Perfis de memória Argon2id: **64 MB**, **256 MB** por padrão ou **512 MB**.
- A seleção de memória fica em cache apenas para criar arquivos novos.
- O cabeçalho V4 registra RAM, passes, salt, IV inicial, tamanho de bloco e quantidade de blocos.
- A descriptografia lê os parâmetros diretamente do pacote; não depende de `localStorage`.
- Cada bloco tem até 2 MB.
- O cabeçalho fixo, tipo, índice e tamanho de cada registro entram no AAD para rejeitar alteração, reordenação e truncamento.
- O primeiro bloco usa o IV armazenado no cabeçalho.
- Os registros seguintes usam IVs exclusivos derivados do IV inicial e do índice; o manifesto usa o índice imediatamente posterior ao último bloco.
- O **Escudo de Integridade** calcula SHA-256 do arquivo completo e de cada bloco em um Web Worker separado.
- O manifesto guarda nome original, tipo MIME, tamanho, hashes, algoritmos e parâmetros Argon2id. Ele é cifrado e autenticado como o último registro do pacote.
- Depois da recuperação, o navegador recalcula os hashes do conteúdo e só confirma a integridade quando todos coincidem.
- O diagnóstico sem senha valida apenas a estrutura do pacote e usa a expressão **estrutura plausível**. Autenticidade exige a senha correta.
- Cada resultado pode gerar um relatório JSON local com formato, KDF, parâmetros, contagem de blocos e estado da verificação.
- Compatibilidade de leitura com `CRIPTOVEU3`, `CRIPTOVEU2`, `CRIPTIFY2` e `CRIPTIFY1`.
- Limite recomendado de arquivo: **2 GB**.

> Observação: o SHA-256 do manifesto complementa a autenticação AES-GCM e permite verificação explícita pós-recuperação. Ele não substitui AES-GCM nem torna uma estrutura sem senha “verificada”.

---

### Mensagens, QR Code e links protegidos

Mensagens são criptografadas localmente com AES-256-GCM e serializadas em payloads próprios do CriptoVéu. Novas criações usam Argon2id dentro de Web Worker:

- `CVM2.` / `MSG2` para mensagens protegidas e esteganografia;
- `CVQ2.` / `QR2` para QR protegido;
- `CVL2.` / `LINK2` para links protegidos;
- memória de **64 MB**, `t=2` e `p=1`;
- salt aleatório de 16 bytes e IV aleatório de 12 bytes;
- Base64URL para o envelope V2.

O QR protegido aponta para a rota `/qr-secreto` usando o hash da URL. O link protegido usa a rota `/link-secreto`, também com dados no hash da URL.

Importante:

- O hash da URL não é enviado ao servidor em requisições HTTP tradicionais.
- Quem recebe o link ou o QR Code tem acesso ao payload criptografado.
- A senha ou chave nunca é incluída no link ou no QR Code e deve ser compartilhada separadamente.
- A proteção real depende da senha usada para abrir a mensagem.
- Tipo, versão, KDF, parâmetros Argon2id e, no `LINK2`, criação, expiração e limite de visualizações entram no AAD do AES-GCM.
- Alterar ciphertext, IV, salt ou metadados autenticados faz a abertura falhar.
- Payloads V1 anteriores com **PBKDF2/SHA-256 e 600.000 iterações** continuam legíveis, mas não são mais gerados.

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

A nota é criptografada com AES-256-GCM e protegida por senha mestre. Novos cofres usam o formato `NOTE2`.

Parâmetros principais:

- Senha mínima: **12 caracteres**.
- Argon2id em Web Worker com **128 MB**, `t=2` e `p=1`.
- Tipo, versão e parâmetros da KDF são autenticados como AAD.
- Cofres `NOTE1` com PBKDF2 continuam legíveis.
- Depois de uma abertura V1 bem-sucedida, o cofre é recriptografado como `NOTE2`; o blob antigo só é substituído após a nova criptografia terminar.
- Backup em JSON com validação de formato antes da importação.

---

## Testes e vetores públicos

Os diretórios em `test-vectors/` contêm vetores reproduzíveis para `MSG2`,
`QR2`, `LINK2` e `NOTE2`, incluindo senha de teste, salt, IV, AAD e ciphertext
esperado.

Salt e IV fixos existem apenas nesses vetores. A produção sempre usa
`crypto.getRandomValues`.

A suíte automatizada verifica compatibilidade V1, migração de `NOTE1`, senha
incorreta, payload truncado e adulterações de ciphertext, IV, salt, tipo,
versão, KDF, parâmetros Argon2id, expiração e limite.

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
- [x] Migração de mensagens, QR Codes, links e VéuNotes para Argon2id, mantendo leitura dos payloads V1.
- [x] Escudo de Integridade para arquivos com `CRIPTOVEU4`, manifesto cifrado, verificação pós-recuperação, inspetor estrutural e relatório local.

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
