-- Bucket privado para os arquivos anexados às cartas (contrato, procuração,
-- identificação, comprovante etc). Acesso só via signed URL gerada no servidor.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documentos', 'documentos', false, 15728640) -- 15 MB
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado (já barrado por /login + requireProfile no app)
-- pode ler/gravar/excluir objetos deste bucket. Restrição por papel
-- (ADMIN/OPERADOR podem escrever, VISUALIZADOR só lê) já é aplicada nas
-- server actions antes de chamar o Storage.
DROP POLICY IF EXISTS "documentos_select" ON storage.objects;
CREATE POLICY "documentos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "documentos_insert" ON storage.objects;
CREATE POLICY "documentos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "documentos_delete" ON storage.objects;
CREATE POLICY "documentos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos');
