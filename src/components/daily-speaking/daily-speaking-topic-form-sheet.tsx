"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  dailySpeakingTopicFormSchema,
  type DailySpeakingTopicFormValues,
} from "@/lib/validations/daily-speaking-topic";
import {
  useCreateDailySpeakingTopic,
  useUpdateDailySpeakingTopic,
} from "@/lib/queries/daily-speaking-topics";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type {
  DailySpeakingTopic,
  DailySpeakingTopicInsert,
} from "@/types/database.types";

interface DailySpeakingTopicFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: DailySpeakingTopic | null;
}

function emptyDefaults(
  topic?: DailySpeakingTopic | null
): DailySpeakingTopicFormValues {
  return {
    title: topic?.title ?? "",
    prompt_en: topic?.prompt_en ?? "",
    prompt_mm: topic?.prompt_mm ?? "",
    difficulty: topic?.difficulty ?? "beginner",
    duration_target_seconds: topic?.duration_target_seconds ?? 180,
    vocabulary: topic?.vocabulary ?? [],
    target_phrases: topic?.target_phrases ?? [],
    warmup_questions: (topic?.warmup_questions ?? []).map((q) => ({
      value: q,
    })),
    tags: (topic?.tags ?? []).join(", "),
    sort_order: topic?.sort_order ?? 0,
    is_published: topic?.is_published ?? false,
  };
}

export function DailySpeakingTopicFormSheet({
  open,
  onOpenChange,
  topic,
}: DailySpeakingTopicFormSheetProps) {
  const isEditing = !!topic;
  const create = useCreateDailySpeakingTopic();
  const update = useUpdateDailySpeakingTopic();
  const isLoading = create.isPending || update.isPending;

  const form = useForm<DailySpeakingTopicFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dailySpeakingTopicFormSchema) as any,
    defaultValues: emptyDefaults(topic),
  });

  const vocab = useFieldArray({ control: form.control, name: "vocabulary" });
  const phrases = useFieldArray({
    control: form.control,
    name: "target_phrases",
  });
  const warmups = useFieldArray({
    control: form.control,
    name: "warmup_questions",
  });

  useEffect(() => {
    if (open) form.reset(emptyDefaults(topic));
  }, [open, topic, form]);

  async function onSubmit(values: DailySpeakingTopicFormValues) {
    const payload: DailySpeakingTopicInsert = {
      title: values.title.trim(),
      prompt_en: values.prompt_en.trim(),
      prompt_mm: values.prompt_mm.trim(),
      difficulty: values.difficulty,
      duration_target_seconds: values.duration_target_seconds,
      vocabulary: values.vocabulary.map((v) => ({
        term: v.term.trim(),
        definition_mm: v.definition_mm.trim(),
        example_en: v.example_en.trim(),
      })),
      target_phrases: values.target_phrases.map((p) => ({
        phrase_en: p.phrase_en.trim(),
        translation_mm: p.translation_mm.trim(),
      })),
      warmup_questions: values.warmup_questions
        .map((w) => w.value.trim())
        .filter(Boolean),
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      sort_order: values.sort_order,
      is_published: values.is_published,
    };

    if (isEditing && topic) {
      await update.mutateAsync({ id: topic.id, values: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Topic" : "Create Topic"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this suggested speaking topic."
              : "Author a new suggested speaking topic for the app."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Basic Info
                </p>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Title <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. My hometown" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prompt_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Prompt (English){" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Describe your hometown. Where is it, what is it known for…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prompt_mm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt (Burmese)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="မြန်မာဘာသာ prompt (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
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
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">
                              Intermediate
                            </SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_target_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target (sec)</FormLabel>
                        <FormControl>
                          <Input type="number" min={30} max={1800} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="places, description" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Comma-separated.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Vocabulary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Vocabulary ({vocab.fields.length})
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      vocab.append({
                        term: "",
                        definition_mm: "",
                        example_en: "",
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add word
                  </Button>
                </div>
                {vocab.fields.map((f, i) => (
                  <div
                    key={f.id}
                    className="space-y-2 rounded-lg border p-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => vocab.remove(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name={`vocabulary.${i}.term`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Term (English)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`vocabulary.${i}.definition_mm`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Definition (Burmese)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`vocabulary.${i}.example_en`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Example sentence (English)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Target phrases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Target phrases ({phrases.fields.length})
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      phrases.append({ phrase_en: "", translation_mm: "" })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add phrase
                  </Button>
                </div>
                {phrases.fields.map((f, i) => (
                  <div
                    key={f.id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => phrases.remove(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name={`target_phrases.${i}.phrase_en`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Phrase (English)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`target_phrases.${i}.translation_mm`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Translation (Burmese)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Warmup questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Things to mention ({warmups.fields.length})
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => warmups.append({ value: "" })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add question
                  </Button>
                </div>
                {warmups.fields.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`warmup_questions.${i}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="e.g. Where is your hometown?"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => warmups.remove(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Publish */}
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Published</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Make this topic visible in the app.
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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Topic"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
