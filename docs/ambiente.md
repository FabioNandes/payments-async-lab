# Ambiente do sistema sob teste

O alvo é o **Medusa 2.21.2** sem customizações, na topologia de produção, com quatro contêineres:

| Serviço    | Imagem                             | Papel                                                     |
| ---------- | ---------------------------------- | --------------------------------------------------------- |
| `postgres` | `postgres:17-alpine`               | Banco; exposto em `127.0.0.1:5432` para asserções         |
| `redis`    | `redis:7-alpine`                   | Event bus (BullMQ), workflow engine, cache e locks        |
| `server`   | `payments-async-lab/medusa:2.21.2` | `MEDUSA_WORKER_MODE=server`: Store API, Admin API, admin  |
| `worker`   | mesma imagem                       | `MEDUSA_WORKER_MODE=worker`: subscribers, jobs, workflows |

O código do alvo fica em [`app/`](../app). Ele saiu do backend do `create-medusa-app` 2.21.2, sem
o índice de busca, as rotas de exemplo e o ferramental de teste do starter. A configuração dos
módulos Redis está em [`app/medusa-config.ts`](../app/medusa-config.ts). `app/` fica fora do lint
e do typecheck da suíte.

O server e o worker são o mesmo build rodando em dois processos. Os dois só funcionam juntos
porque compartilham o Redis, e é exatamente essa fronteira que este repositório testa.

## Subir

```sh
cp .env.example .env              # preencha as senhas (qualquer valor local)
docker compose up -d --build --wait
```

Na subida, o entrypoint do server ([`app/server-entrypoint.sh`](../app/server-entrypoint.sh))
roda as migrations e cria o admin do `.env`. A criação é idempotente: se o admin já existe, o boot
segue. Só depois do healthcheck do server o worker sobe. Essa ordem de inicialização é a mesma que
o bug F-01 explora, então não pode ser alterada sem registro.

| Endereço                                    | O quê                                     |
| ------------------------------------------- | ----------------------------------------- |
| `http://localhost:9000/store/...`           | Store API (exige `x-publishable-api-key`) |
| `http://localhost:9000/admin/...`           | Admin API                                 |
| `http://localhost:9000/auth/user/emailpass` | Login do admin (devolve o token)          |
| `http://localhost:9000/app`                 | Admin (dashboard)                         |
| `http://localhost:9000/health`              | Healthcheck (server e worker)             |

O primeiro boot cria a store, o sales channel padrão e a "Default Publishable API Key". Região,
estoque e catálogo **não** existem: são massa de teste e serão criados via API pela suíte.

```sh
docker compose down      # para, mantém o banco (o Redis não tem volume: filas são perdidas)
docker compose down -v   # descarta o banco: o próximo `up` começa vazio
```

## Consumo medido

Medição de 2026-10-17 no Docker Desktop 29.8.2 (WSL2, 16 CPUs e 9,6 GiB alocados para a VM), com
o banco **vazio** (store padrão e admin, sem região nem catálogo), usando `docker stats`:

| Serviço    |  Ocioso, após o boot | Após 350 requisições REST | Pico no boot a frio |
| ---------- | -------------------: | ------------------------: | ------------------: |
| `server`   |              400 MiB |                   426 MiB |             518 MiB |
| `worker`   |        167 a 309 MiB |                   185 MiB |             330 MiB |
| `postgres` |               78 MiB |                    68 MiB |              76 MiB |
| `redis`    |               20 MiB |                    20 MiB |              10 MiB |
| **Total**  | **cerca de 800 MiB** |               **699 MiB** |         **933 MiB** |

O plano previa cerca de 2,0 GB. O consumo real ficou abaixo da metade disso. O pico do server
acontece durante as migrations do primeiro boot. O worker sobe perto de 310 MiB e cai para cerca
de 170 MiB depois da primeira coleta de lixo. Em repouso, o worker e o server mostram picos
intermitentes de 10% a 14% de CPU: é o polling das filas, não carga real.

**Medir de novo com massa de teste e durante a carga do k6** (Fase 5). Os números acima mostram o
piso do ambiente.

| Tempo                                        |  Medido |
| -------------------------------------------- | ------: |
| Build da imagem, sem cache                   |   236 s |
| Build com cache das dependências             |   123 s |
| `up --wait` com a imagem pronta, banco vazio | 28–36 s |

A imagem tem 1,18 GB.

O `npm ci` do build leva cerca de 2 minutos. A documentação do Medusa sugere rodar `npm install`
dentro de `.medusa/server`, mas ali não existe lockfile: a resolução do zero levou 11,5 minutos e
não é reproduzível. Por isso a imagem reaproveita o `node_modules` instalado pelo lockfile e
remove as dependências de desenvolvimento.

## Observação para a tarefa 4.1

No primeiro boot, o log do worker mostra:

```
Processing user.created (priority: 100) which has 0 subscribers
```

O evento foi emitido pelo `medusa user` do entrypoint antes de o worker existir. Ele ficou no
Redis e foi consumido quando o worker subiu. O formato da mensagem é o mesmo do bug de perda de
evento na inicialização do worker (F-01). Aqui, porém, `user.created` não tem subscriber no Medusa
padrão, então "0 subscribers" é o comportamento correto e **não** confirma o bug. Pode servir de
ponto de partida para a reprodução determinística: emitir um evento que tenha subscriber antes de
o worker subir.

## Troubleshooting

**`Could not connect to the database while running migrations`**: falta `?sslmode=disable` na
`DATABASE_URL`. O Medusa liga SSL para qualquer host que não seja `localhost`, e dentro do Compose
o host é `postgres`. O `docker-compose.yml` já inclui o parâmetro. Este erro só aparece se alguém
removê-lo.

**`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`**: o
Docker Desktop está fechado. Abra o aplicativo e espere o indicador ficar verde.

**`defina MEDUSA_... no .env`**: o `.env` não existe ou falta alguma variável. O Compose recusa
subir sem as credenciais, e isso é proposital: nenhuma senha fica no repositório.

**Porta 9000, 5432 ou 6379 ocupada**: troque `POSTGRES_PORT` ou `REDIS_PORT` no `.env`. Nunca
suba este ambiente junto com o do `vendure-contract-suite`: os dois usam o Postgres na 5432.

**Quadro "Medusa collects anonymous usage analytics" no log**: o Medusa imprime esse aviso mesmo
com `MEDUSA_DISABLE_TELEMETRY=true`, que já está no Compose.
