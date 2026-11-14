# Locadora

Frontend simples para gerir uma locadora de filmes (login, filmes, clientes e locações), com uma API mock em TypeScript que serve as telas.

## Tecnologias

- React, Vite e TypeScript
- react-router
- @tanstack/react-query
- axios
- react-hook-form + yup
- zustand (somente para autenticação)
- react-modal, react-toastify e react-icons

## Como rodar

Requer Node 22.6 ou superior (a API roda o `.ts` direto com `node`). O projeto traz um `.tool-versions` para o asdf.

```bash
npm install
npm run api   # API mock em http://localhost:3001
npm run dev   # frontend em http://localhost:5173
```

Os dados da API ficam em `mock/db.json`, criado a partir de `mock/seed.json` na primeira execução. Para voltar aos dados iniciais, apague o `mock/db.json`.

Outros comandos: `npm run lint` e `npm run build`.

## Usuário de teste

- E-mail: `admin@locadora.com`
- Senha: `123456`

## Telas

- **Login** (`/`): acesso ao sistema.
- **Filmes** (`/filmes`): lista com busca por título e cadastro de filme (botão "+"). Mostra se o filme está disponível ou alugado.
- **Detalhes do filme** (`/filmes/:id`): dados completos e exclusão (não permite excluir filme alugado).
- **Clientes** (`/clientes`): listagem, cadastro e exclusão (não permite CPF repetido nem excluir cliente com locação ativa).
- **Locações** (`/locacoes`): listagem, nova locação e devolução.

## API

Todas as rotas, exceto as de `/auth`, exigem `Authorization: Bearer <token>`. Erros retornam `{ "erro": "mensagem" }`.

| Recurso | Rotas |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Filmes | `GET /filmes` (`?q=`), `GET /filmes/:id`, `POST /filmes`, `DELETE /filmes/:id` |
| Clientes | `GET /clientes`, `POST /clientes`, `DELETE /clientes/:id` |
| Locações | `GET /locacoes`, `POST /locacoes`, `POST /locacoes/:id/devolucao` |