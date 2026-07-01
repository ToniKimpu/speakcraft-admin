"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  writingLessonFormSchema,
  type WritingLessonFormValues,
} from "@/lib/validations/writing-lesson";
import {
  useCreateWritingLesson,
  useUpdateWritingLesson,
} from "@/lib/queries/writing-lessons";
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type {
  WritingLesson,
  WritingLessonInsert,
} from "@/types/database.types";

interface WritingLessonFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: WritingLesson | null;
}

const pretty = (v: unknown) => (v == null ? "" : JSON.stringify(v, null, 2));

function emptyDefaults(lesson?: WritingLesson | null): WritingLessonFormValues {
  return {
    id: lesson?.id ?? "",
    level: lesson?.level ?? 1,
    section_id: lesson?.section_id ?? "",
    section: lesson?.section ?? "",
    order_in_level: lesson?.order_in_level ?? 0,
    type: lesson?.type ?? "grammar_unit",
    title: lesson?.title ?? "",
    subtitle_mm: lesson?.subtitle_mm ?? "",
    teach: pretty(lesson?.teach ?? {}),
    toolkit: pretty(lesson?.toolkit ?? {}),
    exercises: pretty(lesson?.exercises ?? []),
    practice_recap_en: lesson?.practice_recap_en ?? "",
    practice_recap_mm: lesson?.practice_recap_mm ?? "",
    tags: (lesson?.tags ?? []).join(", "),
    is_published: lesson?.is_published ?? false,
  };
}

const parseOr = <T,>(text: string, fallback: T): T => {
  const t = text.trim();
  if (!t) return fallback;
  return JSON.parse(t) as T;
};

export function WritingLessonFormSheet({
  open,
  onOpenChange,
  lesson,
}: WritingLessonFormSheetProps) {
  const isEditing = !!lesson;
  const create = useCreateWritingLesson();
  const update = useUpdateWritingLesson();
  const isLoading = create.isPending || update.isPending;

  const form = useForm<WritingLessonFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(writingLessonFormSchema) as any,
    defaultValues: emptyDefaults(lesson),
  });

  useEffect(() => {
    if (open) form.reset(emptyDefaults(lesson));
  }, [open, lesson, form]);

  async function onSubmit(values: WritingLessonFormValues) {
    const payload: WritingLessonInsert = {
      id: values.id.trim(),
      level: values.level,
      section_id: values.section_id.trim(),
      section: values.section.trim(),
      order_in_level: values.order_in_level,
      type: values.type.trim() || "grammar_unit",
      title: values.title.trim(),
      subtitle_mm: values.subtitle_mm.trim(),
      teach: parseOr(values.teach, {} as Record<string, unknown>),
      toolkit: parseOr(values.toolkit, {} as Record<string, unknown>),
      exercises: parseOr(values.exercises, [] as unknown[]),
      practice_recap_en: values.practice_recap_en.trim(),
      practice_recap_mm: values.practice_recap_mm.trim(),
      image_path: lesson?.image_path ?? "",
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      is_published: values.is_published,
    };

    if (isEditing && lesson) {
      // id is the PK and not editable — send everything else.
      const { id: _id, ...rest } = payload;
      void _id;
      await update.mutateAsync({ id: lesson.id, values: rest });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Lesson" : "Create Lesson"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Editing ${lesson?.id}. The teach / toolkit / exercises are JSON.`
              : "Author a new grammar unit. The heavy fields are edited as JSON."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Basic Info
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Unit ID <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="l1_present_simple"
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
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Input placeholder="grammar_unit" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Title <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="be: am / is / are" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subtitle_mm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle (Burmese)</FormLabel>
                      <FormControl>
                        <Input placeholder="မြန်မာ subtitle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section ID</FormLabel>
                        <FormControl>
                          <Input placeholder="1.2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Section name</FormLabel>
                        <FormControl>
                          <Input placeholder="Present" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="order_in_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order in level</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input placeholder="present, a1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Content (JSON)
                </p>
                <FormField
                  control={form.control}
                  name="teach"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teach</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={10}
                          className="font-mono text-xs"
                          placeholder="{ }"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toolkit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Toolkit</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={6}
                          className="font-mono text-xs"
                          placeholder="{ }"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exercises"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exercises</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={12}
                          className="font-mono text-xs"
                          placeholder="[ ]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="practice_recap_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Practice recap (EN)</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="practice_recap_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Practice recap (MM)</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Published</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Make this unit visible in the app.
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
                {isEditing ? "Save Changes" : "Create Lesson"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
