# Security Notes

## Modelo de seguranca

CriptoVéu é um app 100% client-side. Isso significa que:

- o processamento e feito no navegador
- a senha nao deve ser persistida
- nenhum segredo sensivel pode existir no bundle frontend

## Hardening implementado

- `Content-Security-Policy` restritiva, com `wasm-unsafe-eval` limitado à execução do motor Argon2id em WASM
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` com recursos sensiveis desabilitados
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Cache-Control` conservador para HTML e agressivo para assets versionados
- `sourcemap` desabilitado
- Novos pacotes de arquivos `CRIPTOVEU4`, `CRIPTOVEU5` e `CRIPTOVEU6` usam Argon2id em WASM dentro de Web Worker, com RAM, passes, tamanho e quantidade de blocos no cabeçalho autenticado
- Os Workers Argon2id e SHA-256 usam políticas Trusted Types nomeadas e permitidas explicitamente pela CSP
- Registros V4 autenticam cabeçalho, tipo, índice e tamanho para rejeitar adulteração, reordenação e truncamento
- Registros V6 adicionam paridade XOR local após grupos de até quatro blocos para recuperar um único ciphertext de dados danificado; a verificação AES-GCM e SHA-256 continua obrigatória
- Um Worker separado calcula SHA-256 do arquivo completo e de cada bloco
- O manifesto de integridade é cifrado e autenticado; após a recuperação, os hashes são recalculados antes da confirmação
- O inspetor sem senha verifica somente a estrutura e nunca apresenta essa etapa como autenticação
- A recuperação extrai parâmetros do próprio pacote, sem depender de cache local
- Pacotes `CRIPTOVEU3`, `CRIPTOVEU2`, `CRIPTIFY2` e `CRIPTIFY1` permanecem compatíveis para leitura
- Frases, senhas aleatorias e chaves de 256 bits usam apenas `crypto.getRandomValues`, sem API externa ou persistencia
- O medidor de senha detecta padroes previsiveis, mas e uma orientacao heuristica e nao uma prova de entropia
- Pacotes `CRIPTOVEU5` combinam senha e SHA-256 do arquivo-chave com separacao de dominio antes do Argon2id
- Pacotes `CRIPTOVEU6` usam paridade recuperável sem arquivo-chave; a paridade não substitui criptografia, autenticação ou backup
- Nome, conteudo, hash e material derivado do arquivo-chave nao sao serializados no pacote nem no relatorio
- A assinatura V5 indica somente que o arquivo-chave e obrigatorio; pacotes V4 continuam compativeis
- Cofres portateis usam `NOTE2` como envelope Argon2id + AES-256-GCM e `PORTABLE_VAULT1` como documento interno
- O modo recuperável dos cofres usa `NOTE3` com dois ciphertexts AES-GCM e paridade XOR para recuperar um ciphertext danificado
- Titulos, etiquetas, textos e identificadores do cofre ficam cifrados; a busca ocorre somente apos o desbloqueio
- A importacao valida o envelope e o documento antes de substituir o cofre local
- A troca de senha exige a senha atual, cria novo salt e nao altera backups exportados anteriormente
- O diagnostico do navegador verifica localmente HTTPS, Web Crypto, WebAssembly, Workers, File API e perfis Argon2id sem ler arquivos, senhas ou chaves

## Limites

- codigo frontend nunca fica secreto
- minificacao nao substitui arquitetura segura
- qualquer segredo deve ficar fora do frontend
- Argon2id aumenta o custo de força bruta, mas nao compensa senha fraca nem constitui garantia absoluta contra ataques quanticos
- SHA-256 nao recupera arquivos corrompidos e nao substitui autenticacao AES-GCM; ele detecta divergencias no conteudo recuperado
- Uma credencial forte ainda pode ser exposta por malware, captura de tela, clipboard comprometido ou compartilhamento inseguro
- Um arquivo-chave conhecido pelo atacante oferece pouco ganho; perder ou alterar qualquer byte impede a recuperacao
- Perder a senha do cofre portatil impede a recuperacao; localStorage e arquivos de backup podem ser apagados ou corrompidos
- O bloqueio automatico reduz exposicao acidental, mas nao protege contra malware ou dispositivo comprometido durante a sessao aberta
- O diagnostico do navegador e uma estimativa de compatibilidade, nao uma auditoria do dispositivo nem garantia de desempenho sob carga real

## Recomendacoes de deploy

- publicar apenas em HTTPS
- usar `npm run build` para gerar a versao publica
- validar os headers finais com o deploy ja no ar
- revisar dependencias periodicamente
- habilitar `Dependabot`, `CodeQL` e workflow de CI no GitHub
