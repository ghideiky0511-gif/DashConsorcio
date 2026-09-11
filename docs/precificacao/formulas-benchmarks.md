# Fórmulas dos benchmarks (extraídas do JS dos sites) — CONFIRMADAS

Peguei o código-fonte das duas calculadoras e reproduzi os 3 exemplos reais.
Ambas usam a MESMA definição de "meses":

```
meses = (ano_encerr - ano_hoje) * 12 + (mes_encerr - mes_hoje)
        # datas truncadas pro dia 1 do mês; nunca negativo
```

E ambas partem do mesmo `recebível`:

```
recebivel = credito * (percentualPago / 100)
```
(sem o 0,87 — o 0,87 é só da planilha interna da SSA, ver `analise-carta-cancelada.md`)

---

## MDV — https://mdvconsorcios.com.br/calculadora/

```
se meses <= 91:  fator = 0.605 - 0.005 * meses
senão:           fator = 0.15

proposta = credito * percentualPago * fator / 100      # = recebivel * fator
proposta = round(proposta / 1000) * 1000               # múltiplo de 1.000
se proposta < 3000:  RECUSA ("abaixo do mínimo R$ 3.000")
```

- `percentualPago` é mascarado para **2 casas decimais** no input (6,7920 -> 6,79).
- fator vai de 0,60 (meses=1) até 0,15 (meses=91), depois trava em 0,15.
- Sem valor mínimo de recebível, sem teto de meses.

## Objetiva — https://www.objetivaconsorcio.com.br/

```
recebivel = credito * percentualPago / 100
se recebivel < 15000:  RECUSA ("recebível menor que R$ 15.000")

se 1  <= meses <= 70:  fator = 0.505 - 0.005 * meses
se 71 <= meses <= 94:  fator = 0.15
se meses >= 95:        fator = 0.10

proposta = recebivel * fator
lucro    = recebivel - proposta
se lucro < 5000:  proposta = 0            # lucro mínimo R$ 5.000
senão:            proposta = round(proposta / 1000) * 1000

se meses <= 3 ou meses > 120:  RECUSA ("meses < 3 ou > 120")
```

- `percentualPago` aceita **4 casas** (6,7920).
- fator vai de 0,50 (meses=1) até 0,155 (meses=70), depois 0,15 (71-94), depois 0,10.
- Objetiva paga **menos** que a MDV no mesmo cenário (fator base 0,505 vs 0,605;
  e degraus 0,15 / 0,10 vs só 0,15).

---

## Conferência com os exemplos reais (carta ERIKA: crédito 253.574,00, %pago 6,7920, encerr 23/03/2029, rodado em 09/2026 -> meses = 30)

| | fator | proposta calc | proposta site |
|---|---|---|---|
| MDV      | 0,605 - 0,15 = 0,455 | 253574 × 6,79  × 0,455/100 = 7.834 -> **8.000** | 8.000 ✓ |
| Objetiva | 0,505 - 0,15 = 0,355 | 253574 × 6,792 × 0,355/100 = 6.114 -> **6.000** | 6.000 ✓ |

`recebivel` = 253.574 × 6,792% = 17.222,75 (bate com "recebível" das duas).

## Implicação pro nosso precificador

Não preciso de mais dados — dá pra reimplementar as duas fórmulas exatas e mostrar
lado a lado:
- **Recebível** (crédito × %pago)
- **Proposta MDV** / **Proposta Objetiva** (as fórmulas acima, com os motivos de recusa)
- **Nossa proposta** (a definir) + retorno = recebível − nossa proposta, retorno
  ao mês em `meses`, retorno total %, e retorno vs CDI acumulado no mesmo prazo.
