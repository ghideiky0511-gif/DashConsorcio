"use client";

import { useState } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionFormDialog } from "@/components/carta/action-form-dialog";
import { ConfirmDelete } from "@/components/carta/confirm-delete";
import {
  excluirDocumentoAction,
  getDocumentoUrlAction,
  uploadDocumentoAction,
} from "@/app/actions/documentos";
import { formatDate } from "@/lib/format";
import { opcoesTipoDocumento, tipoDocumentoLabel } from "@/lib/labels";
import type { DocumentoResumo } from "@/lib/queries/carta";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosTab({
  cartaId,
  documentos,
  podeEditar,
}: {
  cartaId: string;
  documentos: DocumentoResumo[];
  podeEditar: boolean;
}) {
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<DocumentoResumo | null>(null);

  async function handleDownload(doc: DocumentoResumo) {
    setBaixando(doc.id);
    const res = await getDocumentoUrlAction(doc.id);
    setBaixando(null);
    if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
    else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Contrato, procuração, identificação e comprovantes ligados à carta.
        </p>
        {podeEditar && (
          <Button size="sm" onClick={() => setEnviando(true)}>
            <Plus /> Enviar documento
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Enviado por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Tamanho</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum documento enviado.
                </TableCell>
              </TableRow>
            ) : (
              documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="flex items-center gap-2 font-medium">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.nome}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tipoDocumentoLabel[doc.tipo]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.uploadedByNome}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatBytes(doc.tamanho)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Baixar"
                        disabled={baixando === doc.id}
                        onClick={() => handleDownload(doc)}
                      >
                        <Download />
                      </Button>
                      {podeEditar && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Excluir"
                          onClick={() => setToDelete(doc)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {enviando && (
        <ActionFormDialog
          title="Enviar documento"
          action={uploadDocumentoAction.bind(null, cartaId)}
          onClose={() => setEnviando(false)}
          onSuccess={() => {
            setEnviando(false);
            toast.success("Documento enviado.");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo *</Label>
            <NativeSelect id="tipo" name="tipo" defaultValue="OUTRO">
              {opcoesTipoDocumento.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arquivo">Arquivo * (até 15 MB)</Label>
            <input
              id="arquivo"
              name="arquivo"
              type="file"
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-medium"
            />
          </div>
        </ActionFormDialog>
      )}

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        titulo="Excluir documento?"
        descricao="O arquivo será removido do armazenamento e não poderá ser recuperado."
        sucesso="Documento excluído."
        onConfirm={() => excluirDocumentoAction(cartaId, toDelete!.id)}
      />
    </div>
  );
}
