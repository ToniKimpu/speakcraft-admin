"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  lessonFormSchema,
  type LessonFormValues,
} from "@/lib/validations/lesson";
import { useCreateLesson, useUpdateLesson } from "@/lib/queries/lessons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Lesson } from "@/types/database.types";

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: number;
  lesson?: Lesson | null;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  dayId,
  lesson,
}: LessonFormDialogProps) {
  const isEditing = !!lesson;
  const create = useCreateLesson(dayId);
  const update = useUpdateLesson(dayId);
  const isLoading = create.isPending || update.isPending;

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      lesson_name: lesson?.lesson_name ?? "",
      subtitle: lesson?.subtitle ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        lesson_name: lesson?.lesson_name ?? "",
        subtitle: lesson?.subtitle ?? "",
      });
    }
  }, [open, lesson, form]);

  async function onSubmit(values: LessonFormValues) {
    if (isEditing && lesson) {
      await update.mutateAsync({ id: lesson.id, values });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Lesson" : "Create Lesson"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lesson_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Greetings" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtitle (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional subtitle"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
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
                {isEditing ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
