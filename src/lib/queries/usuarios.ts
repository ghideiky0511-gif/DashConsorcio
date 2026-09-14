import { prisma } from "@/lib/db";

export function getUsuarios() {
  return prisma.profile.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
}
