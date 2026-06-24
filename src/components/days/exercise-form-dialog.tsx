"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  exerciseFormSchema,
  type ExerciseFormValues,
} from "@/lib/validations/exercise";
import { useCreateExercise, useUpdateExercise } from "@/lib/queries/exercises";
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
import type { Exercise } from "@/types/database.types";

interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: number;
  exercise?: Exercise | null;
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  dayId,
  exercise,
}: ExerciseFormDialogProps) {
  const isEditing = !!exercise;
  const create = useCreateExercise(dayId);
  const update = useUpdateExercise(dayId);
  const isLoading = create.isPending || update.isPending;

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      exercise_name: exercise?.exercise_name ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        exercise_name: exercise?.exercise_name ?? "",
      });
    }
  }, [open, exercise, form]);

  async function onSubmit(values: ExerciseFormValues) {
    if (isEditing && exercise) {
      await update.mutateAsync({ id: exercise.id, values });
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
            {isEditing ? "Edit Exercise" : "Create Exercise"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="exercise_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercise Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Pattern Practice 1"
                      {...field}
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
