"use client";

import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/action-utils";

export function ConfirmDelete({
  open,
  onOpenChange,
  titulo,
  descricao,
  onConfirm,
  sucesso = "Registro removido.",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  onConfirm: () => Promise<ActionResult>;
  sucesso?: string;
}) {
  const [pending, start] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await onConfirm();
                if (r.ok) {
                  toast.success(sucesso);
                  onOpenChange(false);
                } else {
                  toast.error(r.error);
                }
              })
            }
          >
            {pending ? "Excluindo…" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
