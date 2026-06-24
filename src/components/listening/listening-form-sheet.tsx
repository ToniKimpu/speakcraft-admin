"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  listeningFormSchema,
  type ListeningFormValues,
} from "@/lib/validations/listening";
import { useCreateListening, useUpdateListening } from "@/lib/queries/listenings";
import { useListeningCategories } from "@/lib/queries/listening-categories";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { normalizeListeningPath } from "@/lib/constants";
import { ThumbnailUpload } from "@/components/listening/thumbnail-upload";
import type { Listening } from "@/types/database.types";

interface ListeningFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listening?: Listening | null;
}

export function ListeningFormSheet({
  open,
  onOpenChange,
  listening,
}: ListeningFormSheetProps) {
  const isEditing = !!listening;
  const create = useCreateListening();
  const update = useUpdateListening();
  const isLoading = create.isPending || update.isPending;
  const { data: categoriesData } = useListeningCategories();
  const categories = categoriesData?.data ?? [];

  const form = useForm<ListeningFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(listeningFormSchema) as any,
    defaultValues: {
      title: listening?.title ?? "",
      youtube_id: listening?.youtube_id ?? "",
      listening_category_id: listening?.listening_category_id ?? null,
      order_number: listening?.order_number ?? 0,
      start: listening?.start ?? 0,
      end: listening?.end ?? 0,
      subtitle_path: listening?.subtitle_path ?? "",
      shadowing_path: listening?.shadowing_path ?? "",
      multiple_choice_path: listening?.multiple_choice_path ?? "",
      record_subtitle_path: listening?.record_subtitle_path ?? "",
      sentence_explanation_path: listening?.sentence_explanation_path ?? "",
      vocabulary_path: listening?.vocabulary_path ?? "",
      key_takeaways_path: listening?.key_takeaways_path ?? "",
      sentence_count: listening?.sentence_count ?? 0,
      vocab_count: listening?.vocab_count ?? 0,
      pattern_count: listening?.pattern_count ?? 0,
      mm_subtitle: listening?.mm_subtitle ?? false,
      has_vocabularies: listening?.has_vocabularies ?? false,
      is_published: listening?.is_published ?? false,
      is_free: listening?.is_free ?? false,
      thumbnail: listening?.thumbnail ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: listening?.title ?? "",
        youtube_id: listening?.youtube_id ?? "",
        listening_category_id: listening?.listening_category_id ?? null,
        order_number: listening?.order_number ?? 0,
        start: listening?.start ?? 0,
        end: listening?.end ?? 0,
        subtitle_path: listening?.subtitle_path ?? "",
        shadowing_path: listening?.shadowing_path ?? "",
        multiple_choice_path: listening?.multiple_choice_path ?? "",
        record_subtitle_path: listening?.record_subtitle_path ?? "",
        sentence_explanation_path: listening?.sentence_explanation_path ?? "",
        vocabulary_path: listening?.vocabulary_path ?? "",
        key_takeaways_path: listening?.key_takeaways_path ?? "",
        mm_subtitle: listening?.mm_subtitle ?? false,
        has_vocabularies: listening?.has_vocabularies ?? false,
        is_published: listening?.is_published ?? false,
        is_free: listening?.is_free ?? false,
        thumbnail: listening?.thumbnail ?? "",
      });
    }
  }, [open, listening, form]);

  async function onSubmit(values: ListeningFormValues) {
    const payload = {
      ...values,
      listening_category_id: values.listening_category_id || null,
      thumbnail: values.thumbnail || null,
      // Normalize any pasted full Bunny URL to the relative `bunny/...` form so
      // all path fields store consistently (the mobile app prepends the base).
      subtitle_path: normalizeListeningPath(values.subtitle_path),
      shadowing_path: normalizeListeningPath(values.shadowing_path),
      multiple_choice_path: normalizeListeningPath(values.multiple_choice_path),
      record_subtitle_path: normalizeListeningPath(values.record_subtitle_path),
      sentence_explanation_path: normalizeListeningPath(
        values.sentence_explanation_path
      ),
      vocabulary_path: normalizeListeningPath(values.vocabulary_path),
      key_takeaways_path: normalizeListeningPath(values.key_takeaways_path),
    };

    if (isEditing && listening) {
      await update.mutateAsync({ id: listening.id, values: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Listening" : "Create Listening"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the listening content details."
              : "Fill in the details to create new listening content."}
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
                        <Input placeholder="Listening title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="youtube_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        YouTube ID <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. dQw4w9WgXcQ"
                          className="font-mono"
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
                    name="listening_category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) =>
                            field.onChange(val ? Number(val) : null)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Uncategorized" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Uncategorized</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="order_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Order # <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Time Range */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Time Range
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Start (seconds){" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          End (seconds){" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Content Paths */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Content Paths
                </p>
                <FormField
                  control={form.control}
                  name="subtitle_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Subtitle Path{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="subtitles/video1.json" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shadowing_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Shadowing Path{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="shadowing/video1.json"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="multiple_choice_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Multiple Choice Path (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="mcq/video1.json" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="record_subtitle_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Record Subtitle Path{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="recording/video1.json" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sentence_explanation_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sentence Explanation Path (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="explanations/video1.json"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vocabulary_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vocabulary Path (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="vocab/video1.json" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="key_takeaways_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Takeaways Path (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="key_takeaways/video1.json"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Lesson content counts — power the mobile "what you'll get"
                  banner. Compute with count_lesson.py, then paste here. */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Lesson Content Counts
                </p>
                <p className="text-xs text-muted-foreground">
                  Shown in the app&apos;s &quot;what you&apos;ll get&quot;
                  banner. Run count_lesson.py on the lesson&apos;s JSON folder
                  and paste the numbers. Leave 0 to fall back to generic copy.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="sentence_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sentences</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vocab_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vocab</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pattern_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patterns</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Options */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Options
                </p>
                <FormField
                  control={form.control}
                  name="mm_subtitle"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Myanmar Subtitle</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          This content includes Burmese subtitles.
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
                <FormField
                  control={form.control}
                  name="has_vocabularies"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Has Vocabularies</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Vocabulary data is available for this content.
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
                <FormField
                  control={form.control}
                  name="is_published"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Published</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Make this listening visible to users.
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
                <FormField
                  control={form.control}
                  name="is_free"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Free Access</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          On = all features are free for everyone. Off =
                          Premium-only (subtitle play stays free regardless).
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

              {/* Media */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Media
                </p>
                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail (optional)</FormLabel>
                      <FormControl>
                        <ThumbnailUpload
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                {isEditing ? "Save Changes" : "Create Listening"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
