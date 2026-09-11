# Fontes de CDI / curva de juro futuro (todas gratuitas, JSON)

## 1. CDI / Selic realizados — Banco Central SGS  (sem auth)
`https://api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados?formato=json`
`&dataInicial=dd/mm/aaaa&dataFinal=dd/mm/aaaa`
- **12** = CDI ao dia (% a.d.)   | 4389 = CDI ao ano
- 11 = Selic ao dia | 432 = Selic meta % a.a. | 433 = IPCA mensal
Uso: nível atual do CDI e acumular CDI realizado.

## 2. Curva de juro FUTURO (o que o mercado precifica) — melhor opção prática
### Tesouro Direto API (sem auth)
`https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json`
- Retorna todos os títulos com taxa a.a. e vencimento.
- **Tesouro Prefixado (LTN/NTN-F)** = curva de juro nominal por vencimento.
- Pega o vencimento mais próximo da data de encerramento do grupo, interpola,
  usa como "juro livre de risco a termo" daquele horizonte.

### Alternativas
- **BCB Focus (Expectativas de Mercado)** OData:
  `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$format=json&$filter=Indicador eq 'Selic'`
  → Selic projetada por ano (proxy do CDI futuro).
- **ANBIMA ETTJ** (estrutura a termo) — curva zero diária, CSV grátis no site;
  API só com licença ANBIMA Data.
- **B3 DI Futuro (DI1)** — preços de ajuste diários; curva mais "pura", mas
  coleta é via arquivo/scrape.

## Recomendação
- CDI atual: BCB SGS série 12.
- Projeção até a data do grupo: Tesouro Prefixado (título mais próximo, interpolado).
- **Salvar snapshot diário da curva no nosso banco** e guardar, junto de cada
  precificação, a curva usada — pra o cálculo ser reprodutível/auditável.
