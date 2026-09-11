# Precificação de carta CANCELADA (consorciado EXCLUÍDO)

Produto diferente da carta ativa:
- **Ativa** (planilha `precificacao.xlsx`): compro a cota contemplável, uso o crédito.
  Valor = Sobra (crédito − saldo devedor) − investimento no fluxo de lance.
- **Cancelada**: consorciado foi **EXCLUÍDO**. Compro o direito ao **resgate futuro**
  do fundo comum pago, que o grupo devolve na data prevista de encerramento.

O gatilho no extrato é **`Sit. de cobrança: EXCLUÍDO`**.

## Exemplo real trabalhado (extrato Itaú — ERIKA / grupo 020358 cota 0223)

| Campo (extrato) | Valor |
|---|---|
| Administradora | Itaú Adm. Consórcio |
| Situação de cobrança | **EXCLUÍDO** |
| Valor crédito | 253.574,00 |
| % pago | 6,7920 |
| Taxa adm. | 12,00 · Fundo reserva 2,00 · % mensal fundo comum 1,3315 |
| Prazo do grupo | 100 meses (assembleia atual 063) |
| **Data prevista p/ encerramento** | **23/03/2029** |
| Total pago | 27.074,24  (fundo comum 15.727,70 + FR 474,24 + taxa adm 10.872,30) |

### Contas feitas pela SSA (planilha) e pelo site MDV

| Fonte | Resultado |
|---|---|
| **Valor previsto para resgate** (planilha SSA) | 14.983,79 |
| **Calculadora MDV** (mdvconsorcios.com.br/calculadora) | Proposta **8.000,00** |
| PROPOSTA DA OBJETIVA (planilha) | 6.000,00 |
| "Objetiva está pagando" | 40% |
| VALOR PARA COMPRA DA COTA (decisão SSA) | 6.000,00 |

## Fórmulas revertidas

### 1. Valor previsto para resgate  ✅ (2 exemplos batem exato)

```
resgate = Crédito × %pago × 0,87
```
- Ex A: 500.000 × 5,26% × 0,87 = 22.881,00 ✓
- Ex B: 253.574 × 6,792% × 0,87 = 14.983,78 ✓
- O `0,87` = deságio fixo de 13% (multa + taxa adm + FR não voltam). **Não** usa o
  fundo comum real do extrato — é um proxy sobre o nominal.
- Não tem correção monetária nem desconto por prazo.

### 2. "Proposta da Objetiva"  ✅ estrutura, ⚠️ o % é input

```
proposta_objetiva = resgate × X%      (arredondado)
```
- Ex A: 22.881 × 13% ≈ 3.000
- Ex B: 14.983,79 × 40% ≈ 6.000
- `X%` **varia muito** (13% → 40%): é conhecimento de mercado que o operador digita,
  não fórmula. Depende do perfil da carta (prazo p/ encerrar, administradora...).
- **Não temos a calculadora da Objetiva** — só esse parâmetro manual.

### 3. Calculadora MDV (web) — ⚠️ falta lockar a taxa

Inputs: Crédito, %pago, **Data de encerramento**. Estrutura provável:

```
proposta_MDV = resgate / (1 + i)^(meses_até_encerramento)
```
- Ex B: 14.983,79 / 8.000 = 1,8730 ; ~37,7 meses até 23/03/2029 → i ≈ **1,68% a.m.**
- Roda com forte arredondamento: 03/02/2029 e 23/03/2029 deram os mesmos 8.000.
- **Preciso de 3-4 execuções** variando só a data (daqui a 6m / 1a / 2a / 5a) pra
  confirmar: taxa i, se compõe ao mês ou ao ano, e a partir de que data conta.

## Auto-fill a partir do extrato

Os 3 inputs que os dois modelos precisam saem direto do extrato:
| Input | Campo no extrato |
|---|---|
| Crédito | "Valor crédito" |
| % pago | "% pago" (linha TOTAL) |
| Data de encerramento | "Data prevista para o encerramento" |

Extras úteis pra guardar / validar: administradora, grupo, cota, taxa adm, fundo
reserva, % mensal fundo comum, prazo do grupo, assembleia atual, total pago,
fundo comum pago, situação de cobrança.

## Saída do precificador (carta cancelada)

- Valor previsto para resgate (R$ e % do crédito)
- **Quanto a MDV pagaria** (fórmula com data) — benchmark
- **Quanto a Objetiva pagaria** (resgate × % de mercado) — benchmark
- **Nossa proposta** + retorno esperado (resgate − proposta), retorno mensal até a
  data de encerramento, retorno total, retorno vs CDI no mesmo prazo

---

## Update: Objetiva TEM calculadora pública (mesmos 3 inputs)

Exemplo (mesma carta ERIKA):
| Data da proposta | Crédito | %pago | Encerramento | Proposta Objetiva |
|---|---|---|---|---|
| 10/09/2026 | 253.574,00 | 6,7920% | 23/03/2029 | **6.000,00** |

→ confirma que o "40%" da planilha SSA era só o operador calculando 6.000/14.983,79
depois de pegar o número no site da Objetiva. Objetiva tem fórmula própria.

Reverso com 1 ponto (horizonte = 23/03/2029 − 10/09/2026 ≈ 30,4 meses):
- exponencial: `6.000 = 14.983,79 / (1+i)^30,4` → i ≈ **3,06% a.m.**
- OU linear: `6.000 = 14.983,79 × (1 − r×30,4)` → r ≈ **1,97% a.m.** (~2%/mês linear)

MDV no mesmo tipo de conta (horizonte ≈ 37,7 meses, proposta 8.000):
- exponencial i ≈ 1,68% a.m.  |  linear r ≈ 1,24% a.m.

**Não dá pra decidir exponencial vs linear nem travar a taxa com 1 ponto por site.**
Preciso da grade abaixo preenchida (rodar cada site variando só a data):

| Encerramento | Proposta Objetiva | Proposta MDV |
|---|---|---|
| hoje + 6 meses  | ? | ? |
| hoje + 1 ano    | ? | ? |
| hoje + 2 anos   | ? | ? |
| hoje + 4 anos   | ? | ? |
| hoje + 8 anos   | ? | ? |

(fixar Crédito 253.574,00 e %pago 6,7920% em todas)
