"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getListeningThumbnailUrl } from "@/lib/actions/storage";
import { useListening } from "@/lib/queries/listenings";
import { useListeningCategories } from "@/lib/queries/listening-categories";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FolderOpen,
  Hash,
  Headphones,
  ShieldCheck,
  Video,
} from "lucide-react";

interface ListeningDetailProps {
  listeningId: number;
}

export function ListeningDetail({ listeningId }: ListeningDetailProps) {
  const router = useRouter();
  const { data: listening, isLoading } = useListening(listeningId);
  const { data: categoriesData } = useListeningCategories();
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (listening?.thumbnail) {
      getListeningThumbnailUrl(listening.thumbnail).then(setThumbnailUrl);
    }
  }, [listening?.thumbnail]);

  const categoryName = categoriesData?.data?.find(
    (c) => c.id === listening?.listening_category_id
  )?.name;

  useEffect(() => {
    if (listening) {
      setBreadcrumbLabel("listening", listening.id, listening.title);
    }
  }, [listening, setBreadcrumbLabel]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!listening) return <p>Listening not found.</p>;

  const paths = [
    { label: "Subtitle Path", value: listening.subtitle_path },
    { label: "Shadowing Path", value: listening.shadowing_path },
    { label: "Multiple Choice Path", value: listening.multiple_choice_path },
    { label: "Record Subtitle Path", value: listening.record_subtitle_path },
    {
      label: "Sentence Explanation Path",
      value: listening.sentence_explanation_path,
    },
    { label: "Vocabulary Path", value: listening.vocabulary_path },
    { label: "Key Takeaways Path", value: listening.key_takeaways_path },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={listening.title}>
        <Button
          variant="outline"
          onClick={() => router.push("/listening")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Listening
        </Button>
      </PageHeader>

      {/* Thumbnail */}
      {thumbnailUrl && (
        <Card>
          <CardContent className="pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={listening.title}
              className="h-40 w-auto rounded-lg border object-cover"
            />
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YouTube ID</p>
              <p className="text-sm font-mono font-medium">
                {listening.youtube_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="text-sm font-medium">
                {categoryName ?? "Uncategorized"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant={listening.is_deleted ? "destructive" : "success"}
                className="mt-0.5"
              >
                {listening.is_deleted ? "Deleted" : "Active"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="text-lg font-semibold">{listening.order_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time Range</p>
              <p className="text-sm font-medium">
                {listening.start}s — {listening.end}s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {new Date(listening.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Options</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Published:</span>
            <Badge
              variant={listening.is_published ? "success" : "secondary"}
            >
              {listening.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Access:</span>
            <Badge variant={listening.is_free ? "success" : "secondary"}>
              {listening.is_free ? "Free" : "Premium"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">MM Subtitle:</span>
            <Badge
              variant={listening.mm_subtitle ? "success" : "secondary"}
            >
              {listening.mm_subtitle ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Has Vocabularies:
            </span>
            <Badge
              variant={listening.has_vocabularies ? "success" : "secondary"}
            >
              {listening.has_vocabularies ? "Yes" : "No"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Content Paths */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Paths</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paths.map((p) => (
            <div key={p.label} className="flex items-start gap-3">
              <span className="text-sm text-muted-foreground min-w-44 shrink-0">
                {p.label}
              </span>
              {p.value ? (
                <span className="text-sm font-mono break-all">{p.value}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Not set
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
