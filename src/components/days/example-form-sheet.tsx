"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patternExampleFormSchema,
  type PatternExampleFormValues,
} from "@/lib/validations/pattern-example";
import {
  useCreatePatternExample,
  useUpdatePatternExample,
} from "@/lib/queries/pattern-examples";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { PatternExample } from "@/types/database.types";

interface ExampleFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patternId: number;
  example?: PatternExample | null;
}

export function ExampleFormSheet({
  open,
  onOpenChange,
  patternId,
  example,
}: ExampleFormSheetProps) {
  const isEditing = !!example;
  const create = useCreatePatternExample(patternId);
  const update = useUpdatePatternExample(patternId);
  const isLoading = create.isPending || update.isPending;

  const form = useForm<PatternExampleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(patternExampleFormSchema) as any,
    defaultValues: {
      english_text: example?.english_text ?? "",
      burmese_text: example?.burmese_text ?? "",
      audio_url: example?.audio_url ?? "",
      start_at: example?.start_at ?? 0,
      practicable: example?.practicable ?? false,
      explanation: example?.explanation ?? "",
      words: example?.words ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        english_text: example?.english_text ?? "",
        burmese_text: example?.burmese_text ?? "",
        audio_url: example?.audio_url ?? "",
        start_at: example?.start_at ?? 0,
        practicable: example?.practicable ?? false,
        explanation: example?.explanation ?? "",
        words: example?.words ?? "",
      });
    }
  }, [open, example, form]);

  async function onSubmit(values: PatternExampleFormValues) {
    if (isEditing && example) {
      await update.mutateAsync({ id: example.id, values });
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
            {isEditing ? "Edit Example" : "Create Example"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the example sentence details."
              : "Add a new example sentence to this pattern."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              {/* Text content section */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Content
                </p>
                <FormField
                  control={form.control}
                  name="english_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        English Text{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="I want to go home."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="burmese_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Burmese Text (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Burmese translation"
                          rows={2}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Audio & settings section */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Audio & Settings
                </p>
                <FormField
                  control={form.control}
                  name="audio_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audio URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="bunny/day_01/example.mp3"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start At (ms)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="words"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Words (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Word bank"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="practicable"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Practicable</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Make this example available for practice exercises.
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
              </div>

              <Separator />

              {/* Explanation section */}
              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explanation (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Grammar explanation for this example"
                        rows={2}
                        {...field}
                        value={field.value ?? ""}
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
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Example"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
