"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  writingLexiconFormSchema,
  type WritingLexiconFormValues,
} from "@/lib/validations/writing-lexicon";
import {
  useCreateWritingLexiconEntry,
  useUpdateWritingLexiconEntry,
} from "@/lib/queries/writing-lexicon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type {
  WritingLexiconEntry,
  WritingLexiconInsert,
} from "@/types/database.types";

interface WritingLexiconFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WritingLexiconEntry | null;
}

const pretty = (v: unknown) => (v == null ? "" : JSON.stringify(v, null, 2));

function emptyDefaults(
  entry?: WritingLexiconEntry | null
): WritingLexiconFormValues {
  return {
    id: entry?.id ?? "",
    kind: entry?.kind ?? "verb",
    data: pretty(entry?.data ?? {}),
  };
}

export function WritingLexiconFormSheet({
  open,
  onOpenChange,
  entry,
}: WritingLexiconFormSheetProps) {
  const isEditing = !!entry;
  const create = useCreateWritingLexiconEntry();
  const update = useUpdateWritingLexiconEntry();
  const isLoading = create.isPending || update.isPending;

  const form = useForm<WritingLexiconFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(writingLexiconFormSchema) as any,
    defaultValues: emptyDefaults(entry),
  });

  useEffect(() => {
    if (open) form.reset(emptyDefaults(entry));
  }, [open, entry, form]);

  async function onSubmit(values: WritingLexiconFormValues) {
    const data = values.data.trim()
      ? (JSON.parse(values.data) as Record<string, unknown>)
      : {};
    const payload: WritingLexiconInsert = {
      id: values.id.trim(),
      kind: values.kind,
      data,
    };

    if (isEditing && entry) {
      await update.mutateAsync({
        id: entry.id,
        values: { kind: payload.kind, data: payload.data },
      });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Entry" : "Create Entry"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Editing ${entry?.id}. The entry body is JSON.`
              : "Author a new lexicon entry (verb / time word / adjective / noun)."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        ID <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="v_live"
                          disabled={isEditing}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kind</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="verb">verb</SelectItem>
                          <SelectItem value="time_word">time_word</SelectItem>
                          <SelectItem value="adjective">adjective</SelectItem>
                          <SelectItem value="noun">noun</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={16}
                        className="font-mono text-xs"
                        placeholder="{ }"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Entry"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
