import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";

/** Usuário autenticado do Supabase, ou null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Profile (papel, nome) do usuário logado, ou null. */
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { id: user.id } });
}

/** Garante sessão; redireciona para /login se não houver. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Garante um profile ativo; redireciona para /login caso contrário. */
export async function requireProfile() {
  const profile = await getProfile();
  if (!profile || !profile.ativo) redirect("/login");
  return profile;
}

/** Garante que o usuário tem um dos papéis informados. Use em toda server action. */
export async function requireRole(...roles: Role[]) {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
  return profile;
}

/** Papéis que podem criar/editar cartas, parcelas, despesas, acesso e documentos. */
export async function requireEditor() {
  return requireRole(Role.ADMIN, Role.OPERADOR);
}

export const canEdit = (role: Role) =>
  role === Role.ADMIN || role === Role.OPERADOR;
export const isAdmin = (role: Role) => role === Role.ADMIN;
