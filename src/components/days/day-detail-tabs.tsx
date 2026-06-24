"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { LessonFormDialog } from "@/components/days/lesson-form-dialog";
import { ExerciseFormDialog } from "@/components/days/exercise-form-dialog";
import { useLessonsByDay, useSoftDeleteLesson } from "@/lib/queries/lessons";
import {
  useExercisesByDay,
  useSoftDeleteExercise,
} from "@/lib/queries/exercises";
import { useUIStore } from "@/stores/ui-store";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Lesson, Exercise } from "@/types/database.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface DayDetailTabsProps {
  dayId: number;
}

export function DayDetailTabs({ dayId }: DayDetailTabsProps) {
  const router = useRouter();
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  // Lessons state
  const { data: lessons, isLoading: lessonsLoading } = useLessonsByDay(dayId);
  const deleteLesson = useSoftDeleteLesson(dayId);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);

  // Exercises state
  const { data: exercises, isLoading: exercisesLoading } =
    useExercisesByDay(dayId);
  const deleteExercise = useSoftDeleteExercise(dayId);
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(
    null
  );

  const lessonColumns: ColumnDef<Lesson>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="text-muted-foreground">#{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "lesson_name",
      header: "Lesson Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("lesson_name")}</span>
      ),
    },
    {
      accessorKey: "subtitle",
      header: "Subtitle",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("subtitle") || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const lesson = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setBreadcrumbLabel("lessons", lesson.id, lesson.lesson_name);
                  router.push(`/days/${dayId}/lessons/${lesson.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Patterns
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingLesson(lesson);
                  setLessonFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingLesson(lesson)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const exerciseColumns: ColumnDef<Exercise>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="text-muted-foreground">#{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "exercise_name",
      header: "Exercise Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("exercise_name")}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const exercise = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setBreadcrumbLabel(
                    "exercises",
                    exercise.id,
                    exercise.exercise_name
                  );
                  router.push(`/days/${dayId}/exercises/${exercise.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Pattern Exercises
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingExercise(exercise);
                  setExerciseFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingExercise(exercise)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <Tabs defaultValue="lessons" className="mt-6">
        <TabsList>
          <TabsTrigger value="lessons">
            Lessons ({lessons?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="exercises">
            Exercises ({exercises?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingLesson(null);
                setLessonFormOpen(true);
              }}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
          </div>
          <DataTable
            columns={lessonColumns}
            data={lessons ?? []}
            isLoading={lessonsLoading}
            onRowClick={(lesson) => {
              setBreadcrumbLabel("lessons", lesson.id, lesson.lesson_name);
              router.push(`/days/${dayId}/lessons/${lesson.id}`);
            }}
            emptyMessage="No lessons yet. Add your first lesson."
          />
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingExercise(null);
                setExerciseFormOpen(true);
              }}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </div>
          <DataTable
            columns={exerciseColumns}
            data={exercises ?? []}
            isLoading={exercisesLoading}
            onRowClick={(exercise) => {
              setBreadcrumbLabel(
                "exercises",
                exercise.id,
                exercise.exercise_name
              );
              router.push(`/days/${dayId}/exercises/${exercise.id}`);
            }}
            emptyMessage="No exercises yet. Add your first exercise."
          />
        </TabsContent>
      </Tabs>

      <LessonFormDialog
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        dayId={dayId}
        lesson={editingLesson}
      />
      <ExerciseFormDialog
        open={exerciseFormOpen}
        onOpenChange={setExerciseFormOpen}
        dayId={dayId}
        exercise={editingExercise}
      />
      <DeleteConfirmDialog
        open={!!deletingLesson}
        onOpenChange={(open) => !open && setDeletingLesson(null)}
        title={`Delete lesson "${deletingLesson?.lesson_name}"?`}
        onConfirm={() => {
          if (deletingLesson) {
            deleteLesson.mutate(deletingLesson.id);
            setDeletingLesson(null);
          }
        }}
        isLoading={deleteLesson.isPending}
      />
      <DeleteConfirmDialog
        open={!!deletingExercise}
        onOpenChange={(open) => !open && setDeletingExercise(null)}
        title={`Delete exercise "${deletingExercise?.exercise_name}"?`}
        onConfirm={() => {
          if (deletingExercise) {
            deleteExercise.mutate(deletingExercise.id);
            setDeletingExercise(null);
          }
        }}
        isLoading={deleteExercise.isPending}
      />
    </>
  );
}
