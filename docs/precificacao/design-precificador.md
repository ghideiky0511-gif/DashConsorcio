# Precificador — decisão de abordagem

## Objetivo real
Dado uma carta, responder: **quanto pagar** (preço justo) e **quanto recebo no fim**,
e se o retorno **≥ ~2× CDI** no período (meta configurável por risco).

## Abordagem escolhida: META DE RETORNO (não tabela de fator)

Copiar uma tabela de fator por faixa de meses (como MDV/Objetiva fazem) só imita o
concorrente — não diz se o negócio é bom. O que decide é retorno vs CDI. Então:

```
n          = meses até o encerramento do grupo
resgate    = valor estimado a receber no encerramento   (ver "base do resgate")
cdi_acum   = CDI projetado acumulado nesses n meses      (ver fontes-juros.md)
meta       = múltiplo alvo do CDI (default 2,0; ajustável por administradora/risco)

preço_justo = resgate / (1 + meta × cdi_acum)
```

Saída da tela, para qualquer preço P que o operador digitar (ou para o preço_justo):
- retorno total  = resgate / P − 1
- retorno ao mês = (resgate / P)^(1/n) − 1
- retorno anualizado
- múltiplo do CDI = (resgate/P − 1) / cdi_acum
- lucro em R$ = resgate − P
- comparativo: **Proposta MDV** e **Proposta Objetiva** (fórmulas em formulas-benchmarks.md)
  — mostram onde o mercado está pagando

Assim o operador vê o preço_justo (meta batida) e quanto o mercado paga; decide no meio.

## Base do resgate — é PROJEÇÃO, não valor fixo

O recebimento final nunca é conhecido hoje: a carta sofre **reajuste anual** pelo
índice do grupo (IPCA/INCC/IGP-M) até o encerramento, então a base de resgate cresce
ano a ano. O modelo trata isso como projeção explícita e ajustável:

```
base_hoje  = fundo comum efetivamente pago (do extrato)   # ou proxy credito*%pago*0,87 se faltar
indice_aa  = índice de correção projetado ao ano           # assunção visível, default de mercado
anos       = meses_ate_encerramento / 12
resgate_projetado = base_hoje * (1 + indice_aa) ^ anos
                    * (1 - multa_pct)                       # multa contratual da administradora, se houver
```

Na tela:
- `indice_aa` vem pré-preenchido (projeção IPCA do Focus / Tesouro IPCA+), o operador
  pode sobrescrever.
- Mostrar **cenários**: índice base, base −2 p.p., base +2 p.p. → faixa de resgate e
  de retorno. O operador vê a sensibilidade, não um número falso de preciso.
- O `multiplo do CDI` é relativamente robusto: se a projeção de inflação sobe, a
  projeção de CDI sobe junto — o erro se cancela em parte. É por isso que a decisão
  é "retorno vs CDI", não "valor absoluto do resgate".

### Config por administradora (novo)
- `indice_correcao` (IPCA/INCC/IGP-M)
- `resgate_corrigido` (bool) — a administradora devolve o fundo comum corrigido ou nominal?
- `multa_exclusao_pct` — multa contratual retida do excluído (0 quando não há)
- `momento_resgate` — no encerramento do grupo / por sorteio entre excluídos / prazo fixo

Defaults razoáveis + refinar por administradora conforme os resgates forem acontecendo.


## Carta ATIVA (planilha `precificacao.xlsx`) — mesma lógica, fluxo de caixa

Lá existe entrada/saída em vários meses (aquisição + parcelas + lance) e a "Sobra"
(crédito livre) entra na contemplação. Métrica = TIR mensal do fluxo, comparada a CDI.
`preço_justo (aquisição)` = valor que faz a TIR = meta × CDI equivalente.
