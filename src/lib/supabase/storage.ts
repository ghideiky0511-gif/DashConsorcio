import { createClient } from "@/lib/supabase/server";

const BUCKET = "documentos";

export async function uploadDocumento(path: string, file: File): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
}

export async function excluirDocumentoStorage(path: string): Promise<void> {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/** URL de download válida por `expiresIn` segundos (padrão 60s). */
export async function getDocumentoSignedUrl(
  path: string,
  expiresIn = 60,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw error ?? new Error("Não foi possível gerar o link.");
  return data.signedUrl;
}
