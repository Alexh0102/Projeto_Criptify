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
- Pacotes de arquivos `CRIPTOVEU3` usam Argon2id em WASM dentro de Web Worker, com RAM e passes registrados no cabeçalho autenticado
- O Worker Argon2id é criado por uma política Trusted Types nomeada e permitida explicitamente pela CSP
- Blocos V3 autenticam tamanho, ordem e término do fluxo para rejeitar reordenação e truncamento
- A recuperação de arquivos V3 extrai parâmetros do próprio pacote, sem depender de cache local

## Limites

- codigo frontend nunca fica secreto
- minificacao nao substitui arquitetura segura
- qualquer segredo deve ficar fora do frontend
- Argon2id aumenta o custo de força bruta, mas nao compensa senha fraca nem constitui garantia absoluta contra ataques quanticos

## Recomendacoes de deploy

- publicar apenas em HTTPS
- usar `npm run build` para gerar a versao publica
- validar os headers finais com o deploy ja no ar
- revisar dependencias periodicamente
- habilitar `Dependabot`, `CodeQL` e workflow de CI no GitHub
