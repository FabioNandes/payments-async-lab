# payments-async-lab

[![CI](https://github.com/FabioNandes/payments-async-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/FabioNandes/payments-async-lab/actions/workflows/ci.yml)
[![Relatório](https://img.shields.io/badge/relat%C3%B3rio-ao%20vivo-2ea44f)](https://FabioNandes.github.io/payments-async-lab/)
[![TypeScript](https://img.shields.io/github/package-json/dependency-version/FabioNandes/payments-async-lab/dev/typescript?logo=typescript&logoColor=white&color=3178c6)](tsconfig.json)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)](LICENSE)

> **Estado: Fase 0 — fundação.** Lint, typecheck e publicação do relatório estão configurados.
> As camadas descritas abaixo são o escopo planejado e **ainda não estão implementadas** —
> a seção [Progresso](#progresso) mostra exatamente o que já existe.

## Problema

Em um sistema onde não existe resposta síncrona, o teste de request/response não enxerga as
falhas que importam: o evento que chega duas vezes e gera **estorno duplo**, a ordem de liquidação
perdida durante o deploy do worker, a compensação que não executa no meio de uma saga. Quando há
dinheiro envolvido, cada uma dessas falhas tem consequência financeira e regulatória.

## Escopo

Sistema alvo: [Medusa v2](https://github.com/medusajs/medusa) — server, worker, PostgreSQL e
Redis (event bus BullMQ e workflow engine durável, com retry e rollback).

| Camada                    | O que cobre                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| 0 — Contrato de mensagem  | Message pacts (Pact JS), sem ambiente integrado                                 |
| 1 — Integração assíncrona | Idempotência, ordenação, dead letter, retry, conciliação — com broker real      |
| 2 — Saga e compensação    | Falha injetada no meio do fluxo, asserção final no PostgreSQL                   |
| 3 — Performance e SLO     | k6 com SLOs declarados em código, incluindo estorno concorrente sob carga       |
| 4 — Caos                  | Toxiproxy e falhas reimplantadas do catálogo do Train Ticket, com origem citada |
| 5 — BDD                   | Gherkin para cancelamento, devolução, não-duplicação e conciliação              |

**Regras do repositório:** nenhum broker mockado na camada de integração; nenhuma espera fixa —
toda espera é polling com timeout (há regra de lint para isso).

### Limite honesto do domínio

O sistema testado é um **e-commerce open source**, não um arranjo de pagamento. A tese deste
repositório é aplicar a um sistema de pedidos o rigor que um sistema de pagamento instantâneo
exige — chave de idempotência, devolução, liquidação, janela de conciliação, estorno — a partir de
experiência prévia com entregas regulatórias de pagamento instantâneo.

## O que este repositório demonstra

- Teste de comportamento assíncrono com **broker real**, sem espera fixa.
- Que testar microsserviços **não exige rodar o sistema inteiro**: contract testing de mensagem.
- Uma **matriz falha × detecção** publicada, incluindo as falhas que a suíte **não** capturou e
  a análise do porquê.

## Progresso

- [x] ESLint, Prettier e TypeScript estrito, com regra de lint contra espera fixa
- [x] Workflows de CI (lint + typecheck) e de publicação no GitHub Pages
- [x] Ambiente Medusa 2.21 com um comando (server, worker, Postgres, Redis): cerca de 700–930 MiB
      medidos ([docs/ambiente.md](docs/ambiente.md))
- [ ] Reprodução determinística da perda de evento na inicialização do worker
- [ ] Fatia vertical: evento → consumidor → message pact → teste de idempotência
- [ ] `quality-exports/` (`manifest.json`, `scenarios.json`)
- [ ] Saga, carga com SLO e caos
- [ ] Matriz falha × detecção

## Desenvolvimento

Requer Node 24 e Docker.

```sh
npm ci
npm run check                        # lint + formatação + typecheck

cp .env.example .env                 # preencha as senhas (qualquer valor local)
docker compose up -d --build --wait  # Medusa em http://localhost:9000
```

Endereços, consumo de memória e troubleshooting: [docs/ambiente.md](docs/ambiente.md).

## Relação com os outros repositórios

Este repositório publica dados normalizados em `quality-exports/`, consumidos pelo
[`quality-strategy-lab`](https://github.com/FabioNandes/quality-strategy-lab). O catálogo de
falhas (`F-##`) pertence a este repositório; os IDs de risco (`RSK-###`) pertencem àquele.
