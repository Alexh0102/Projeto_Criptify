# Deploy Seguro na Vercel

## 1. Subir para o GitHub

No terminal da raiz do projeto:

```bash
git init
git add .
git commit -m "feat: release inicial segura"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/Projeto_Criptoveu.git
git push -u origin main
```

## 2. Importar na Vercel

1. Acesse a Vercel e entre com sua conta GitHub.
2. Clique em `Add New Project`.
3. Escolha o repositorio `Projeto_Criptoveu`.
4. Revise as configuracoes de build:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`

5. Clique em `Deploy`.

## 3. Endurecer a conta

No GitHub:

- ative `2FA`
- proteja a branch `main`
- ative `Dependabot`
- ative `Code scanning`
- ative `Secret scanning`

Na Vercel:

- ative `2FA`
- ative `Vercel Authentication` para previews
- use dominio com HTTPS

## 4. Pos-deploy

Depois do deploy:

1. abra o site publicado
2. confirme que a URL usa `https://`
3. teste upload, criptografia e descriptografia
4. valide os headers de seguranca no navegador ou em servicos como Mozilla Observatory

## 5. O que nao fazer

- nao colocar segredos em variaveis `VITE_*`
- nao commitar `.env` com credenciais
- nao desabilitar os headers de seguranca sem revisar o impacto
- nao publicar preview aberto se houver funcionalidade sensivel no futuro

## 6. App nativo Android

Para builds Capacitor, defina `VITE_API_BASE_URL` com a origem publica que hospeda
os endpoints `/api/create-checkout-session` e `/api/verify-license`.

Os endpoints aceitam as origens nativas locais do Capacitor por padrao. Se a
origem publica ou o esquema nativo for alterado, configure `CORS_ALLOWED_ORIGINS`
no provedor de deploy como uma lista separada por virgulas, por exemplo:

```text
CORS_ALLOWED_ORIGINS=https://criptoveu.com,https://www.criptoveu.com,https://localhost
```
