# Vetores de teste

Estes vetores permitem reproduzir e auditar os formatos `MSG2`, `QR2`, `LINK2`
e `NOTE2`, além do pacote de arquivos `CRIPTOVEU4`.

Os valores de salt e IV são fixos exclusivamente para teste. O código de
produção sempre gera ambos com `crypto.getRandomValues`.

## Como reproduzir

```bash
node test-vectors/generate-vectors.mjs
node test-vectors/file-v4/generate-vector.mjs
```

Cada vetor registra:

- senha e texto puro de teste;
- salt e IV fixos;
- parâmetros Argon2id;
- AAD canônico em UTF-8;
- ciphertext esperado;
- payload final.

O vetor de arquivo V4 também registra o cabeçalho binário, o manifesto cifrado,
os AADs dos registros de dados e manifesto e o pacote completo em Base64. Sua
configuração Argon2id de 8 MB e uma iteração serve somente para tornar o teste
de interoperabilidade rápido; ela não é uma recomendação para produção.

Qualquer alteração em versão, tipo, KDF, parâmetros Argon2id, ciphertext, IV,
salt ou metadados autenticados deve ser rejeitada.
