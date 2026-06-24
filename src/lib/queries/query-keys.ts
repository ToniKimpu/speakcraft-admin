export const queryKeys = {
  days: {
    all: ["days"] as const,
    list: (filters: Record<string, unknown>) =>
      ["days", "list", filters] as const,
    detail: (id: number) => ["days", id] as const,
  },
  lessons: {
    all: ["lessons"] as const,
    byDay: (dayId: number) => ["lessons", "byDay", dayId] as const,
    detail: (id: number) => ["lessons", id] as const,
  },
  patterns: {
    all: ["patterns"] as const,
    byLesson: (lessonId: number) =>
      ["patterns", "byLesson", lessonId] as const,
    detail: (id: number) => ["patterns", id] as const,
  },
  patternExamples: {
    byPattern: (patternId: number) =>
      ["patternExamples", "byPattern", patternId] as const,
    detail: (id: number) => ["patternExamples", id] as const,
  },
  exercises: {
    byDay: (dayId: number) => ["exercises", "byDay", dayId] as const,
    detail: (id: number) => ["exercises", id] as const,
  },
  patternExercises: {
    byExercise: (exerciseId: number) =>
      ["patternExercises", "byExercise", exerciseId] as const,
    detail: (id: number) => ["patternExercises", id] as const,
  },
  vocabularies: {
    search: (query: string) => ["vocabularies", "search", query] as const,
    byPatternExample: (exampleId: number) =>
      ["vocabularies", "byPatternExample", exampleId] as const,
    byPatternExercise: (exerciseId: number) =>
      ["vocabularies", "byPatternExercise", exerciseId] as const,
  },
  listenings: {
    all: ["listenings"] as const,
    list: (filters: Record<string, unknown>) =>
      ["listenings", "list", filters] as const,
    detail: (id: number) => ["listenings", id] as const,
  },
  listeningCategories: {
    all: ["listeningCategories"] as const,
    list: () => ["listeningCategories", "list"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (filters: Record<string, unknown>) =>
      ["users", "list", filters] as const,
    subscriptions: (userId: number) =>
      ["users", userId, "subscriptions"] as const,
  },
  subscriptionPlans: {
    all: ["subscriptionPlans"] as const,
  },
  dailySpeakingTopics: {
    all: ["dailySpeakingTopics"] as const,
    list: (filters: Record<string, unknown>) =>
      ["dailySpeakingTopics", "list", filters] as const,
    detail: (id: string) => ["dailySpeakingTopics", id] as const,
  },
  paymentMethods: {
    all: ["paymentMethods"] as const,
    list: () => ["paymentMethods", "list"] as const,
  },
  paymentSubmissions: {
    all: ["paymentSubmissions"] as const,
    list: (filters: Record<string, unknown>) =>
      ["paymentSubmissions", "list", filters] as const,
  },
  breadcrumb: {
    label: (table: string, id: number) =>
      ["breadcrumb", table, id] as const,
  },
};
