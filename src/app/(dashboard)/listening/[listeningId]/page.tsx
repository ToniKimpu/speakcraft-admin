"use client";

import { use } from "react";
import { ListeningDetail } from "@/components/listening/listening-detail";

export default function ListeningDetailPage({
  params,
}: {
  params: Promise<{ listeningId: string }>;
}) {
  const { listeningId } = use(params);
  return <ListeningDetail listeningId={Number(listeningId)} />;
}
