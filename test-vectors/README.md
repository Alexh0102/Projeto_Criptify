# Vetores de teste V2

Estes vetores permitem reproduzir e auditar os formatos `MSG2`, `QR2`, `LINK2`
e `NOTE2`.

Os valores de salt e IV são fixos exclusivamente para teste. O código de
produção sempre gera ambos com `crypto.getRandomValues`.

## Como reproduzir

```bash
node test-vectors/generate-vectors.mjs
```

Cada vetor registra:

- senha e texto puro de teste;
- salt e IV fixos;
- parâmetros Argon2id;
- AAD canônico em UTF-8;
- ciphertext esperado;
- payload final.

Qualquer alteração em versão, tipo, KDF, parâmetros Argon2id, ciphertext, IV,
salt ou metadados autenticados deve ser rejeitada.
