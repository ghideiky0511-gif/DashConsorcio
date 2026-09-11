# Estrutura do backend do precificador

`src/lib/precificador/` organizado em caixas — cada pasta tem uma responsabilidade,
e os números de negócio ficam TODOS em `parametros.ts`.

```
src/lib/precificador/
├── parametros.ts       ⭐ toda regra de negócio ajustável — mexer numa fórmula
│                          é mexer só aqui (meta de CDI padrão, fórmulas MDV/
│                          Objetiva, deságio do proxy SSA, prazo padrão de
│                          liberação, limites de alerta do agente)
├── index.ts             ponto único de import: `import { ... } from "@/lib/precificador"`
├── curva-juros.ts        busca + snapshot diário do CDI/curva (I/O, sem teste)
│
├── core/                 motor financeiro genérico — não sabe o que é "carta"
│   ├── tempo.ts             contagem de meses (mesesEntre)
│   ├── juros.ts             juro composto, interpolação de curva, correção
│   ├── fluxo.ts             valor presente / TIR de um fluxo de caixa
│   └── retorno.ts           retorno vs. CDI + preço justo (fórmula-base,
│                             usada por TODOS os motores)
│
├── mercado/              réplica das calculadoras da concorrência
│   └── benchmarks.ts        propostaMdv / propostaObjetiva / resgateProxySsa
│
├── motores/              um arquivo por tipo de precificação
│   ├── cancelada.ts         carta CANCELADA (consorciado excluído)
│   ├── ativa-parcelas.ts    carta ATIVA — já contemplada / lance de
│   │                         contemplação (parcelas continuam)
│   └── ativa-quitacao.ts    carta ATIVA — lance de quitação (carência)
│
└── agente/               extração via IA + checagem de atualidade do extrato
    ├── schema.ts            campos que a IA extrai
    ├── atualidade.ts        checagens determinísticas (mês vigente, assembleia,
    │                         encerramento, reajuste, situação → motor)
    ├── extrair.ts           chamada ao Claude (I/O)
    └── index.ts             barrel da caixa
```

## Regra de ouro

- **Precisa ajustar um número de negócio** (meta de CDI, fórmula de mercado,
  prazo padrão, limite de alerta)? → só em `parametros.ts`.
- **Precisa ajustar como um motor combina esses números**? → só no arquivo do
  motor em `motores/`.
- **Precisa de uma conta financeira nova que sirva pra mais de um motor**? →
  entra em `core/`, testada, e os motores reaproveitam.
- Ninguém faz `import` cruzado direto entre `motores/*` e `agente/*` — quem
  conecta os dois é a camada de cima (`src/app/actions/*.ts`).

## Onde estão os pontos de entrada usados pelo app

- `src/app/actions/precificador.ts` — action da carta cancelada
- `src/app/actions/precificador-ativa.ts` — action da carta ativa (as 2 variantes)
- `src/app/actions/agente-extracao.ts` — action do upload do extrato
