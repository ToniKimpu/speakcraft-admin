"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patternExerciseFormSchema,
  type PatternExerciseFormValues,
} from "@/lib/validations/pattern-exercise";
import {
  useCreatePatternExercise,
  useUpdatePatternExercise,
} from "@/lib/queries/pattern-exercises";
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { PatternExercise } from "@/types/database.types";

interface PatternExerciseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: number;
  patternExercise?: PatternExercise | null;
}

export function PatternExerciseFormSheet({
  open,
  onOpenChange,
  exerciseId,
  patternExercise,
}: PatternExerciseFormSheetProps) {
  const isEditing = !!patternExercise;
  const create = useCreatePatternExercise(exerciseId);
  const update = useUpdatePatternExercise(exerciseId);
  const isLoading = create.isPending || update.isPending;

  const form = useForm<PatternExerciseFormValues>({
    resolver: zodResolver(patternExerciseFormSchema),
    defaultValues: {
      burmese_text: patternExercise?.burmese_text ?? "",
      english_text: patternExercise?.english_text ?? "",
      words: patternExercise?.words ?? "",
      audio_path: patternExercise?.audio_path ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        burmese_text: patternExercise?.burmese_text ?? "",
        english_text: patternExercise?.english_text ?? "",
        words: patternExercise?.words ?? "",
        audio_path: patternExercise?.audio_path ?? "",
      });
    }
  }, [open, patternExercise, form]);

  async function onSubmit(values: PatternExerciseFormValues) {
    if (isEditing && patternExercise) {
      await update.mutateAsync({ id: patternExercise.id, values });
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
            {isEditing ? "Edit Pattern Exercise" : "Create Pattern Exercise"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the question and answer details."
              : "Create a new exercise question with its correct answer."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              {/* Question & Answer */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Question & Answer
                </p>
                <FormField
                  control={form.control}
                  name="burmese_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Burmese Text (Question){" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Question in Burmese"
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
                  name="english_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        English Text (Correct Answer){" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Correct answer in English"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Options */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Options
                </p>
                <FormField
                  control={form.control}
                  name="words"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Words (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. I,want,to,go,home"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Comma-separated word bank for drag-and-drop exercises.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audio_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audio Path (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="bunny/day_01/exercise.mp3"
                          {...field}
                          value={field.value ?? ""}
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
                {isEditing ? "Save Changes" : "Create Exercise"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
