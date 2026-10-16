"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createCustomerAction,
  createSupplierAction,
  deleteCustomerAction,
  deleteSupplierAction,
  updateCustomerAction,
  updateSupplierAction,
} from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { FormState } from "@/lib/form";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type ContactKind = "customers" | "suppliers";

const actions = {
  customers: {
    create: createCustomerAction,
    update: updateCustomerAction,
    remove: deleteCustomerAction,
  },
  suppliers: {
    create: createSupplierAction,
    update: updateSupplierAction,
    remove: deleteSupplierAction,
  },
} as const;

function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        {state.ok}
      </p>
    );
  return null;
}

export function NewContactButton({ kind }: { kind: ContactKind }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    actions[kind].create,
    {},
  );
  const noun = kind === "customers" ? "customer" : "supplier";

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus /> New {noun}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`New ${noun}`}>
        <Feedback state={state} />
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="nc-name">Name</Label>
            <Input id="nc-name" name="name" placeholder="Company or person" required />
          </div>
          <div>
            <Label htmlFor="nc-email">Email</Label>
            <Input id="nc-email" name="email" type="email" placeholder="billing@company.com" />
          </div>
          <div>
            <Label htmlFor="nc-phone">Phone</Label>
            <Input id="nc-phone" name="phone" placeholder="+65 …" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditContactButton({
  kind,
  contact,
}: {
  kind: ContactKind;
  contact: Contact;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    actions[kind].update,
    {},
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Edit ${contact.name}`}
      >
        <Pencil className="size-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${contact.name}`}>
        <Feedback state={state} />
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={contact.id} />
          <div>
            <Label htmlFor={`ec-name-${contact.id}`}>Name</Label>
            <Input id={`ec-name-${contact.id}`} name="name" defaultValue={contact.name} required />
          </div>
          <div>
            <Label htmlFor={`ec-email-${contact.id}`}>Email</Label>
            <Input id={`ec-email-${contact.id}`} name="email" type="email" defaultValue={contact.email ?? ""} />
          </div>
          <div>
            <Label htmlFor={`ec-phone-${contact.id}`}>Phone</Label>
            <Input id={`ec-phone-${contact.id}`} name="phone" defaultValue={contact.phone ?? ""} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DeleteContactButton({
  kind,
  id,
  name,
}: {
  kind: ContactKind;
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Delete ${name}?`)) {
          const fd = new FormData();
          fd.set("id", id);
          startTransition(async () => {
            await actions[kind].remove(fd);
          });
        }
      }}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
      aria-label={`Delete ${name}`}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
