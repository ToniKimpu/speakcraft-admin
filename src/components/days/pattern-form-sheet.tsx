"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patternFormSchema,
  type PatternFormValues,
} from "@/lib/validations/pattern";
import { useCreatePattern, useUpdatePattern } from "@/lib/queries/patterns";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Pattern } from "@/types/database.types";

interface PatternFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: number;
  pattern?: Pattern | null;
}

export function PatternFormSheet({
  open,
  onOpenChange,
  lessonId,
  pattern,
}: PatternFormSheetProps) {
  const isEditing = !!pattern;
  const create = useCreatePattern(lessonId);
  const update = useUpdatePattern(lessonId);
  const isLoading = create.isPending || update.isPending;

  const form = useForm<PatternFormValues>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: {
      pattern: pattern?.pattern ?? "",
      title: pattern?.title ?? "",
      description: pattern?.description ?? "",
      file_path: pattern?.file_path ?? "",
      self_practicable: pattern?.self_practicable ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        pattern: pattern?.pattern ?? "",
        title: pattern?.title ?? "",
        description: pattern?.description ?? "",
        file_path: pattern?.file_path ?? "",
        self_practicable: pattern?.self_practicable ?? true,
      });
    }
  }, [open, pattern, form]);

  async function onSubmit(values: PatternFormValues) {
    if (isEditing && pattern) {
      await update.mutateAsync({ id: pattern.id, values });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Pattern" : "Create Pattern"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the pattern details below."
              : "Fill in the details to create a new spoken pattern."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Pattern <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Subject + Verb" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Display title"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Pattern description"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Path (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="bunny/day_01/pattern.mp3"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="self_practicable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Self Practicable</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Allow students to practice this pattern on their own.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Pattern"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
