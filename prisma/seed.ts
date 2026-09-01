import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  TipoBem,
  StatusConsorcio,
  TipoSaida,
  FormaContemplacao,
  StatusParcela,
  PapelContraparte,
  TipoDespesa,
  TipoMovimento,
  CategoriaMovimento,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

/** Data (só dia) em UTC, para casar com colunas @db.Date. */
function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addMonths(base: Date, months: number): Date {
  const r = new Date(base);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

function firstOfMonth(base: Date): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
}

const ETAPAS = [
  { nome: "Prospecção", cor: "#94a3b8" },
  { nome: "Compra", cor: "#6366f1" },
  { nome: "Cadastro BOLSA", cor: "#0ea5e9" },
  { nome: "Cópias p/ Severi", cor: "#14b8a6" },
  { nome: "Originais p/ Severi", cor: "#22c55e" },
  { nome: "Notificação", cor: "#eab308" },
  { nome: "Docto p/ ADM", cor: "#f97316" },
  { nome: "Contemplação", cor: "#a855f7" },
  { nome: "Pedido de Resgate", cor: "#ec4899" },
  { nome: "Resgatada / Revendida", cor: "#16a34a" },
];

async function main() {
  const hoje = new Date();

  // Limpa dados transacionais (mantém idempotência do seed).
  await prisma.movimentoCaixa.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.parcela.deleteMany();
  await prisma.despesaCarta.deleteMany();
  await prisma.acessoCota.deleteMany();
  await prisma.etapaHistorico.deleteMany();
  await prisma.contraparte.deleteMany();
  await prisma.carta.deleteMany();

  // ─── Config de caixa ───
  await prisma.configCaixa.upsert({
    where: { id: "singleton" },
    update: { saldoInicial: 250_000, dataSaldoInicial: d("2026-01-01") },
    create: {
      id: "singleton",
      saldoInicial: 250_000,
      dataSaldoInicial: d("2026-01-01"),
    },
  });

  // ─── Profile "sistema" (dono dos registros do seed) ───
  const sistema = await prisma.profile.upsert({
    where: { email: "sistema@hhconsorcio.local" },
    update: {},
    create: {
      id: randomUUID(),
      nome: "Sistema (seed)",
      email: "sistema@hhconsorcio.local",
      role: Role.ADMIN,
    },
  });

  // ─── Etapas ───
  const etapas: { id: string; ordem: number }[] = [];
  for (let i = 0; i < ETAPAS.length; i++) {
    const ordem = i + 1;
    const e = ETAPAS[i];
    const row = await prisma.etapa.upsert({
      where: { ordem },
      update: { nome: e.nome, cor: e.cor },
      create: { nome: e.nome, ordem, cor: e.cor },
    });
    etapas.push({ id: row.id, ordem });
  }
  const etapaOrdem = (o: number) => etapas.find((e) => e.ordem === o)!.id;

  // ─── Administradoras ───
  const admNomes = ["Porto", "Itaú", "Rodobens", "Bradesco", "Honda"];
  const adms: Record<string, string> = {};
  for (const nome of admNomes) {
    const row = await prisma.administradora.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
    adms[nome] = row.id;
  }

  // ─── Cessionárias ───
  const cessNomes = [
    { key: "A", nome: "HH Participações LTDA", cnpj: "11.111.111/0001-11" },
    { key: "B", nome: "HH Gestão SSA LTDA", cnpj: "22.222.222/0001-22" },
  ];
  const cess: Record<string, string> = {};
  for (const c of cessNomes) {
    const row = await prisma.cessionaria.upsert({
      where: { nome: c.nome },
      update: { cnpj: c.cnpj },
      create: { nome: c.nome, cnpj: c.cnpj },
    });
    cess[c.key] = row.id;
  }

  // ─── Tipos de despesa padrão por carta ───
  const despesasPadrao = (base: number) => [
    { tipo: TipoDespesa.COMISSAO, valor: base * 0.03 },
    { tipo: TipoDespesa.DARE, valor: 320 },
    { tipo: TipoDespesa.GUIA_TJ, valor: 190 },
    { tipo: TipoDespesa.CARTORIO, valor: 260 },
  ];

  type CartaSeed = {
    codigo: string;
    cess: string;
    adm: string;
    grupo: string;
    cota: string;
    contrato: string;
    tipoBem: TipoBem;
    status: StatusConsorcio;
    etapa: number;
    valorCredito: number;
    valorCompra: number;
    previsaoResgate: number;
    dataCompra: string;
    cedente: string;
    cpf: string;
    origem: string;
    datas?: Partial<{
      dataCadastroBolsa: string;
      dataCopiasSeveri: string;
      dataOriginaisSeveri: string;
      dataNotificacao: string;
      dataDoctoAdm: string;
      contempladaEm: string;
      dataPedidoResgate: string;
      dataResgate: string;
    }>;
    tipoSaida?: TipoSaida;
    valorResgatado?: number;
    formaContemplacao?: FormaContemplacao;
    parcelasTotais?: number;
    parcelasQuitadas?: number;
    parcelaValor?: number;
    diaVencimento?: number;
    parcelasAbertas?: number;
    parcelasAtrasadas?: number;
  };

  const cartas: CartaSeed[] = [
    {
      codigo: "SSA-0001",
      cess: "A",
      adm: "Porto",
      grupo: "1450",
      cota: "092",
      contrato: "PRT-88213",
      tipoBem: TipoBem.IMOVEL,
      status: StatusConsorcio.ATIVA,
      etapa: 3,
      valorCredito: 180_000,
      valorCompra: 42_000,
      previsaoResgate: 96_000,
      dataCompra: "2026-02-12",
      cedente: "João Pereira da Silva",
      cpf: "123.456.789-01",
      origem: "Corretor Marcos",
      datas: { dataCadastroBolsa: "2026-02-20" },
      parcelasTotais: 200,
      parcelasQuitadas: 70,
      parcelaValor: 980,
      diaVencimento: 10,
      parcelasAbertas: 15,
      parcelasAtrasadas: 1,
    },
    {
      codigo: "SSA-0002",
      cess: "A",
      adm: "Itaú",
      grupo: "0821",
      cota: "045",
      contrato: "ITU-33110",
      tipoBem: TipoBem.IMOVEL,
      status: StatusConsorcio.ATIVA,
      etapa: 6,
      valorCredito: 240_000,
      valorCompra: 68_000,
      previsaoResgate: 150_000,
      dataCompra: "2025-11-03",
      cedente: "Maria Aparecida Gomes",
      cpf: "987.654.321-00",
      origem: "Indicação interna",
      datas: {
        dataCadastroBolsa: "2025-11-10",
        dataCopiasSeveri: "2025-12-01",
        dataOriginaisSeveri: "2025-12-15",
        dataNotificacao: "2026-01-20",
      },
      parcelasTotais: 220,
      parcelasQuitadas: 120,
      parcelaValor: 1_240,
      diaVencimento: 15,
      parcelasAbertas: 12,
      parcelasAtrasadas: 2,
    },
    {
      codigo: "SSA-0003",
      cess: "B",
      adm: "Rodobens",
      grupo: "3390",
      cota: "011",
      contrato: "RDB-55021",
      tipoBem: TipoBem.VEICULO,
      status: StatusConsorcio.CANCELADA,
      etapa: 8,
      valorCredito: 90_000,
      valorCompra: 31_000,
      previsaoResgate: 63_000,
      dataCompra: "2025-08-19",
      cedente: "Carlos Henrique Souza",
      cpf: "456.123.789-22",
      origem: "Leilão de canceladas",
      datas: {
        dataCadastroBolsa: "2025-08-25",
        dataCopiasSeveri: "2025-09-10",
        dataOriginaisSeveri: "2025-09-28",
        dataNotificacao: "2025-10-30",
        dataDoctoAdm: "2025-12-05",
        contempladaEm: "2026-02-01",
      },
      formaContemplacao: FormaContemplacao.SORTEIO,
      parcelasTotais: 80,
      parcelasQuitadas: 80,
      parcelaValor: 0,
      diaVencimento: 5,
    },
    {
      codigo: "SSA-0004",
      cess: "B",
      adm: "Bradesco",
      grupo: "2205",
      cota: "078",
      contrato: "BRA-71904",
      tipoBem: TipoBem.IMOVEL,
      status: StatusConsorcio.CANCELADA,
      etapa: 10,
      valorCredito: 130_000,
      valorCompra: 48_500,
      previsaoResgate: 92_000,
      dataCompra: "2025-05-14",
      cedente: "Fernanda Lima Castro",
      cpf: "321.654.987-33",
      origem: "Corretor Ana",
      datas: {
        dataCadastroBolsa: "2025-05-20",
        dataCopiasSeveri: "2025-06-02",
        dataOriginaisSeveri: "2025-06-18",
        dataNotificacao: "2025-07-25",
        dataDoctoAdm: "2025-09-01",
        contempladaEm: "2025-10-15",
        dataPedidoResgate: "2025-11-01",
        dataResgate: "2026-01-12",
      },
      tipoSaida: TipoSaida.RESGATE,
      valorResgatado: 94_800,
      formaContemplacao: FormaContemplacao.LANCE,
      parcelasTotais: 150,
      parcelasQuitadas: 150,
      parcelaValor: 0,
      diaVencimento: 20,
    },
    {
      codigo: "SSA-0005",
      cess: "A",
      adm: "Honda",
      grupo: "7781",
      cota: "150",
      contrato: "HND-10233",
      tipoBem: TipoBem.VEICULO,
      status: StatusConsorcio.ATIVA,
      etapa: 2,
      valorCredito: 75_000,
      valorCompra: 19_500,
      previsaoResgate: 40_000,
      dataCompra: "2026-03-05",
      cedente: "Roberto Álvares Pinto",
      cpf: "159.357.486-11",
      origem: "Corretor Marcos",
      parcelasTotais: 60,
      parcelasQuitadas: 22,
      parcelaValor: 720,
      diaVencimento: 8,
      parcelasAbertas: 18,
      parcelasAtrasadas: 0,
    },
    {
      codigo: "SSA-0006",
      cess: "A",
      adm: "Porto",
      grupo: "1450",
      cota: "093",
      contrato: "PRT-88214",
      tipoBem: TipoBem.IMOVEL,
      status: StatusConsorcio.ATIVA,
      etapa: 7,
      valorCredito: 200_000,
      valorCompra: 61_000,
      previsaoResgate: 132_000,
      dataCompra: "2025-12-01",
      cedente: "Luciana Prado Martins",
      cpf: "753.951.852-44",
      origem: "Indicação interna",
      datas: {
        dataCadastroBolsa: "2025-12-08",
        dataCopiasSeveri: "2026-01-05",
        dataOriginaisSeveri: "2026-01-22",
        dataNotificacao: "2026-02-18",
        dataDoctoAdm: "2026-03-20",
      },
      parcelasTotais: 200,
      parcelasQuitadas: 95,
      parcelaValor: 1_050,
      diaVencimento: 10,
      parcelasAbertas: 14,
      parcelasAtrasadas: 1,
    },
  ];

  for (const c of cartas) {
    const despesas = despesasPadrao(c.valorCompra);
    const custoDespesas = despesas.reduce((s, x) => s + x.valor, 0);

    const carta = await prisma.carta.create({
      data: {
        codigo: c.codigo,
        cessionariaId: cess[c.cess],
        administradoraId: adms[c.adm],
        grupo: c.grupo,
        cota: c.cota,
        contrato: c.contrato,
        origem: c.origem,
        tipoBem: c.tipoBem,
        statusConsorcio: c.status,
        tipoSaida: c.tipoSaida ?? null,
        etapaId: etapaOrdem(c.etapa),
        valorCredito: c.valorCredito,
        valorCreditoContemplacao: c.datas?.contempladaEm ? c.valorCredito : null,
        percentualPago:
          c.parcelasTotais && c.parcelasQuitadas
            ? Number((c.parcelasQuitadas / c.parcelasTotais).toFixed(4))
            : null,
        valorCompra: c.valorCompra,
        previsaoResgate: c.previsaoResgate,
        valorResgatado: c.valorResgatado ?? null,
        dataCompra: d(c.dataCompra),
        dataCadastroBolsa: c.datas?.dataCadastroBolsa
          ? d(c.datas.dataCadastroBolsa)
          : null,
        dataCopiasSeveri: c.datas?.dataCopiasSeveri
          ? d(c.datas.dataCopiasSeveri)
          : null,
        dataOriginaisSeveri: c.datas?.dataOriginaisSeveri
          ? d(c.datas.dataOriginaisSeveri)
          : null,
        dataNotificacao: c.datas?.dataNotificacao
          ? d(c.datas.dataNotificacao)
          : null,
        dataDoctoAdm: c.datas?.dataDoctoAdm ? d(c.datas.dataDoctoAdm) : null,
        contempladaEm: c.datas?.contempladaEm ? d(c.datas.contempladaEm) : null,
        dataPedidoResgate: c.datas?.dataPedidoResgate
          ? d(c.datas.dataPedidoResgate)
          : null,
        dataResgate: c.datas?.dataResgate ? d(c.datas.dataResgate) : null,
        formaContemplacao: c.formaContemplacao ?? null,
        parcelasTotais: c.parcelasTotais ?? null,
        parcelasQuitadas: c.parcelasQuitadas ?? null,
        parcelaValor: c.parcelaValor ?? null,
        diaVencimento: c.diaVencimento ?? null,
        createdById: sistema.id,
        acesso: {
          create: {
            emailCadastro: `${c.codigo.toLowerCase()}@cotas.hh.local`,
            cotaChave: `CHV-${c.grupo}-${c.cota}`,
            celular: "(71) 90000-0000",
            senha: "trocar-123",
          },
        },
        despesas: { create: despesas.map((x) => ({ ...x })) },
        contrapartes: {
          create: {
            papel: PapelContraparte.CEDENTE,
            nome: c.cedente,
            documento: c.cpf,
          },
        },
        etapaHistorico: {
          create: {
            etapaParaId: etapaOrdem(c.etapa),
            observacao: "Etapa inicial (seed).",
            userId: sistema.id,
          },
        },
      },
    });

    // Movimentos: compra + despesas
    await prisma.movimentoCaixa.create({
      data: {
        tipo: TipoMovimento.SAIDA,
        categoria: CategoriaMovimento.COMPRA_CARTA,
        descricao: `Compra da carta ${c.codigo}`,
        valor: c.valorCompra,
        data: d(c.dataCompra),
        cartaId: carta.id,
        conciliado: true,
      },
    });
    for (const dp of despesas) {
      await prisma.movimentoCaixa.create({
        data: {
          tipo: TipoMovimento.SAIDA,
          categoria: CategoriaMovimento.DESPESA_CARTA,
          descricao: `${dp.tipo} — ${c.codigo}`,
          valor: dp.valor,
          data: d(c.dataCompra),
          cartaId: carta.id,
          conciliado: true,
        },
      });
    }
    void custoDespesas;

    // Entrada de resgate
    if (c.valorResgatado && c.datas?.dataResgate) {
      await prisma.movimentoCaixa.create({
        data: {
          tipo: TipoMovimento.ENTRADA,
          categoria: CategoriaMovimento.RESGATE_CARTA,
          descricao: `Resgate da carta ${c.codigo}`,
          valor: c.valorResgatado,
          data: d(c.datas.dataResgate),
          cartaId: carta.id,
          conciliado: true,
        },
      });
    }

    // Parcelas em aberto (só cartas ainda em pagamento)
    const abertas = c.parcelasAbertas ?? 0;
    const atrasadas = c.parcelasAtrasadas ?? 0;
    if (abertas > 0 && c.parcelaValor && c.diaVencimento && c.parcelasQuitadas) {
      const compBase = firstOfMonth(addMonths(hoje, -atrasadas));
      for (let i = 0; i < abertas; i++) {
        const competencia = addMonths(compBase, i);
        const vencimento = new Date(
          Date.UTC(
            competencia.getUTCFullYear(),
            competencia.getUTCMonth(),
            c.diaVencimento,
          ),
        );
        const atrasada = i < atrasadas;
        await prisma.parcela.create({
          data: {
            cartaId: carta.id,
            numero: c.parcelasQuitadas + i + 1,
            competencia,
            vencimento,
            valorPrevisto: c.parcelaValor,
            status: atrasada ? StatusParcela.ATRASADO : StatusParcela.PENDENTE,
          },
        });
      }
    }
  }

  const totalCartas = await prisma.carta.count();
  const totalParcelas = await prisma.parcela.count();
  console.log(
    `Seed concluído: ${totalCartas} cartas, ${totalParcelas} parcelas em aberto, ${etapas.length} etapas.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
