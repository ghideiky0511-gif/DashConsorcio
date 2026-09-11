# Análise da planilha de precificação (`precificacao.xlsx`)

Origem: Google Sheets do Marcelo. 1 aba só (`Planilha1`). Tem macros VBA
(3 botões: CALCULAR / QUITAR / ATINGIR) que são todos `GoalSeek` — ou seja,
a planilha calibra parâmetros por tentativa e erro.

## Macros (o que cada botão faz)

| Macro | Alvo = 0 | Mexendo em | Significado |
|---|---|---|---|
| `ajusta_taxa` | `C11` (diferença saldo devedor) | `D4` (taxa adm %) | acha a taxa de adm que faz o saldo devedor calculado bater com o do extrato |
| `ajusta_pago` | `C11` | `D8` (% pago) | idem, mexendo no % pago em vez da taxa |
| `quitar` | `K19` (novo saldo devedor) | `D20` (lance histórico %) | acha o lance que zera o saldo devedor |
| `atingir_lance` | `D24` (= D19 − D23) | `D20` | acha o lance histórico % que resulta no valor de lance desejado (D23) |

## Bloco principal — coluna B/C/D

| Célula | Rótulo | Fórmula | Papel |
|---|---|---|---|
| C3 | Crédito | input | crédito da carta |
| D4 | (taxa adm %) | input/calibrado | ~4% no exemplo |
| C4 | Taxa adm | `C3*D4` | |
| C5 | Crédito + Taxa adm | `C3+C4` | base de cálculo |
| D8 | (% pago) | input/calibrado | ~47% no exemplo |
| C8 | %pago (valor) | `C5*D8` | quanto já foi amortizado |
| C9 | Saldo devedor | `C5-C8` | |
| C10 | Saldo devedor extrato | input | valor real do extrato da administradora |
| C11 | diferença | `C9-C10` | deve ser 0 depois de calibrar |
| C12 | Sobra | `C3-C9` | crédito livre = o que sobra pra quem compra |
| D14 | Lance embutido % | input | 0 no exemplo |
| C14 | Lance embutido | `D14*C3` | |
| C15 | Novo crédito | `C3*(1-D14)` | |
| C16 | Novo saldo devedor | `C9-C14` | |
| D20 | Lance histórico % | input/calibrado | ~61,5% no exemplo |
| D21 | Lance com margem | `D20+2%` | |
| D19 | Lance | `IF(D20=0,0,D21*C5)` | valor do lance a dar |
| D23 | Atingir Lance | input | valor de lance desejado |

## Bloco retorno — F/I

| Célula | Rótulo | Fórmula |
|---|---|---|
| I6 | Aquisição | input — **preço pago pela cota** |
| I7 | Comissão | input (0 no exemplo) |
| I8 | Total | `I6+I7` = investimento na compra |
| I10 | Retorno | `C12-I8` (Sobra − investimento) = lucro em R$ |
| I11 | Retorno % | `I10/C3` = lucro sobre o crédito |

## Bloco diluição de parcela — F13:M16

| Célula | Rótulo | Fórmula |
|---|---|---|
| M13 | Total parcelas | input (prazo do grupo) |
| M14 | Parcela após contemplar | input |
| M15 | Parcelas restantes | `M13-M14` |
| M16 | Nova parcela (após diluir) | `(C16 - AA9 - AA11 - AA10)/M15` |

## Fluxo de caixa do investimento — Q/X/AA

`X` = "meses" (quando cada desembolso acontece): 7,7,7,5,4,3,2,1,0

| Linha | Rótulo | Valor |
|---|---|---|
| AA8 | Aquisição da cota | `=I8` (25.000) |
| AA9 | Parcela 0 | 1.527,12 |
| AA10 | Lance contemplação | `=D19` (60.000) |
| AA11..AA15 | Parcela 1..5 | 0 |
| AA16 | Taxa de transferência | 0 |
| AA17 | **Investimento total** | `SUM(AA8:AA16)` = 86.527,12 |

## Cenários de taxa — P/S, Y/AA, AG/AH

Colunas paralelas para taxa de adm = 11% (P2), 12% (Y2), 13% (AG2):
- `sobra` = `C3 - C10` (40.814,3)
- `Taxa` = `C3 * taxa%`
- resultado = `sobra - Taxa` → sobra líquida em cada cenário

## Bloco resgate / correção — F22:K24

| Célula | Rótulo | Fórmula |
|---|---|---|
| O22 | Prazo de resgate (meses) | 6 |
| O23 | Rentabilidade de correção (a.m.) | 1% |
| K18 | Novo crédito | `IF(C16=T19, C15, C15-T19)` (T19 vazio → = C15) |
| K19 | Novo saldo devedor | `C16 - SUM(AA9..AA16)` |
| K24 | Crédito corrigido | `C15*(1+O23)^O22 - K19` |

## Lacunas / o que falta confirmar

1. **Segunda precificação (carta CANCELADA)** — não está neste arquivo. Onde está?
2. **CDI** — não há comparação com CDI na planilha; o usuário quer adicionar.
3. `T19` referenciado mas vazio — o que seria?
4. `X` (meses) — timing dos fluxos: de onde saem esses números?
5. "Parcela 0" (AA9 = 1.527,12) — é a parcela mensal do grupo? entra fixa?
6. "Lance histórico" — vem de histórico real de contemplações do grupo?
7. `D4` e `D8` são **os dois** calibrados pra mesma diferença — qual usar quando?
8. Comissão (I7) — % sobre o quê?
9. Qual desses números é o **output final** ("quanto pagar pela carta")? Parece ser
   um input (I6) que o operador testa até o retorno (I11) ficar bom — não há
   fórmula que devolva "preço justo" diretamente.

---

## Decisão final: não portamos a mecânica da planilha, construímos motor próprio

Muitas células ficaram sem resposta (itens 3–9 acima nunca foram confirmados:
origem do "lance histórico", o que é "Parcela 0", base da comissão etc.). Em vez
de tentar replicar o `GoalSeek` da planilha, aplicamos a mesma filosofia da
carta cancelada — **meta de retorno**, não fator de mercado — só que aqui o
fluxo tem várias parcelas em vez de uma entrada/saída única.

### Escopo: só cota JÁ CONTEMPLADA (por enquanto)

`precificarAtivaContemplada()` em `src/lib/precificador/ativa.ts`:

```
fluxo = [ crédito recebido hoje − taxa de transferência,
          −parcela em cada um dos meses 1..parcelasRestantes ]
valorNominalTotal = soma desse fluxo (crédito − total das parcelas)
```

Trata `valorNominalTotal` como se fosse um resgate único recebido ao fim das
`parcelasRestantes` — e reaproveita **as mesmas** `precoJusto()` /
`metricasRetorno()` da carta cancelada. Preço justo = preço que faz
`valorNominalTotal / preço − 1 = meta × CDI do período`.

**Por que não TIR "de livro-texto":** o formato do fluxo (entrada grande hoje,
saídas pequenas depois) faz a TIR clássica medir a taxa implícita de um
financiamento, não o retorno de um investimento — o sinal fica contraintuitivo
justamente quando o negócio é muito bom (testamos e vimos o problema na prática).
`src/lib/precificador/fluxo.ts` (valor presente + TIR por bisseção, genérico e
testado) fica guardado pra quando modelarmos o próximo caso.

### Falta (não modelado ainda)

- **Cota NÃO contemplada** — aguardando sorteio, ou dando lance pra antecipar.
  Precisa de exemplos reais (igual os que destravaram a carta cancelada) pra
  decidir: de onde vem o "lance histórico" (é % real do grupo?), como diluir a
  parcela após contemplar, e o que fazer com o cenário "aguardar vs lance".
- UI ainda não tem uma aba para carta ativa em `/precificador` — só o motor.
