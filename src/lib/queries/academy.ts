import { supabase } from '../supabase/client'

export type AcademyCourse = {
  slug: string
  title: string
  shortTitle: string
  summary: string
  level: 'beginner' | 'intermediate' | 'advanced'
  audience: string
  accessTier: 'free' | 'pro' | 'business'
  languageCode: string
  estimatedMinutes: number
  displayOrder: number
  learningObjectives: string[]
  version: string
  lessonCount: number
}

export type AcademyContentSection = {
  heading: string
  body: string
  callout?: string
  bullets?: string[]
}

export type AcademyLesson = {
  slug: string
  courseSlug: string
  title: string
  summary: string
  lessonKind: 'reading' | 'guided_practice' | 'quiz' | 'video'
  content: AcademyContentSection[]
  estimatedMinutes: number
  displayOrder: number
  version: string
}

export type AcademyQuizQuestion = {
  id: number
  lessonSlug: string
  prompt: string
  options: string[]
  displayOrder: number
}

export type AcademyLessonProgress = {
  lessonSlug: string
  courseSlug?: string
  status: 'in_progress' | 'completed'
  bestScore: number | null
  attempts: number
  lastPosition: number
  completedAt: string | null
  updatedAt: string
}

export type AcademyQuizResult = {
  lessonSlug: string
  score: number
  passed: boolean
  correct: number
  total: number
  results: Array<{
    questionId: number
    correct: boolean
    correctOption: number
    explanation: string
  }>
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function contentSections(value: unknown): AcademyContentSection[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    if (typeof row.heading !== 'string' || typeof row.body !== 'string') return []

    return [{
      heading: row.heading,
      body: row.body,
      callout: typeof row.callout === 'string' ? row.callout : undefined,
      bullets: stringArray(row.bullets),
    }]
  })
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

export async function getAcademyCatalog(): Promise<AcademyCourse[]> {
  const { data, error } = await supabase
    .from('academy_catalog')
    .select('*')
    .order('display_order')

  if (error) throw error

  return (data ?? []).map((course) => ({
    slug: course.slug,
    title: course.title,
    shortTitle: course.short_title,
    summary: course.summary,
    level: course.level as AcademyCourse['level'],
    audience: course.audience,
    accessTier: course.access_tier as AcademyCourse['accessTier'],
    languageCode: course.language_code,
    estimatedMinutes: course.estimated_minutes,
    displayOrder: course.display_order,
    learningObjectives: stringArray(course.learning_objectives),
    version: course.version,
    lessonCount: course.lesson_count,
  }))
}

export async function getAcademyLessons(courseSlug: string): Promise<{
  lessons: AcademyLesson[]
  questions: AcademyQuizQuestion[]
}> {
  const lessonResult = await supabase
    .from('academy_lessons')
    .select('slug, course_slug, title, summary, lesson_kind, content, estimated_minutes, display_order, version')
    .eq('course_slug', courseSlug)
    .eq('published', true)
    .order('display_order')

  if (lessonResult.error) throw lessonResult.error

  const lessons = (lessonResult.data ?? []).map((lesson) => ({
    slug: lesson.slug,
    courseSlug: lesson.course_slug,
    title: lesson.title,
    summary: lesson.summary,
    lessonKind: lesson.lesson_kind as AcademyLesson['lessonKind'],
    content: contentSections(lesson.content),
    estimatedMinutes: lesson.estimated_minutes,
    displayOrder: lesson.display_order,
    version: lesson.version,
  }))
  const lessonSlugs = lessons.map((lesson) => lesson.slug)

  if (lessonSlugs.length === 0) return { lessons, questions: [] }

  const questionResult = await supabase
    .from('academy_quiz_questions_public')
    .select('id, lesson_slug, prompt, options, display_order')
    .in('lesson_slug', lessonSlugs)
    .order('display_order')

  if (questionResult.error) throw questionResult.error

  return {
    lessons,
    questions: (questionResult.data ?? []).map((question) => ({
      id: question.id,
      lessonSlug: question.lesson_slug,
      prompt: question.prompt,
      options: stringArray(question.options),
      displayOrder: question.display_order,
    })),
  }
}

export async function getAcademyProgress(): Promise<AcademyLessonProgress[]> {
  const userId = await currentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('academy_lesson_progress')
    .select('lesson_slug, status, best_score, attempts, last_position, completed_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const lessonSlugs = (data ?? []).map((progress) => progress.lesson_slug)
  const courseByLesson = new Map<string, string>()

  if (lessonSlugs.length > 0) {
    const lessonResult = await supabase
      .from('academy_lessons')
      .select('slug, course_slug')
      .in('slug', lessonSlugs)

    if (lessonResult.error) throw lessonResult.error
    for (const lesson of lessonResult.data ?? []) {
      courseByLesson.set(lesson.slug, lesson.course_slug)
    }
  }

  return (data ?? []).map((progress) => ({
    lessonSlug: progress.lesson_slug,
    courseSlug: courseByLesson.get(progress.lesson_slug),
    status: progress.status as AcademyLessonProgress['status'],
    bestScore: numberOrNull(progress.best_score),
    attempts: progress.attempts,
    lastPosition: progress.last_position,
    completedAt: progress.completed_at,
    updatedAt: progress.updated_at,
  }))
}

export async function saveAcademyProgress(input: {
  lessonSlug: string
  status: 'in_progress' | 'completed'
  lastPosition?: number
}) {
  const userId = await currentUserId()
  if (!userId) return

  const completedAt = input.status === 'completed' ? new Date().toISOString() : null
  const { error } = await supabase
    .from('academy_lesson_progress')
    .upsert({
      user_id: userId,
      lesson_slug: input.lessonSlug,
      status: input.status,
      last_position: input.lastPosition ?? 0,
      completed_at: completedAt,
    }, { onConflict: 'user_id,lesson_slug' })

  if (error) throw error
}

export async function gradeAcademyQuiz(
  lessonSlug: string,
  answers: Record<number, number>,
): Promise<AcademyQuizResult> {
  const { data, error } = await supabase.rpc('grade_academy_quiz', {
    p_lesson_slug: lessonSlug,
    p_answers: answers,
  })

  if (error) throw error
  return data as AcademyQuizResult
}

export async function saveAcademyOnboarding(input: {
  currentStep: number
  completed?: boolean
  skipped?: boolean
}) {
  const userId = await currentUserId()
  if (!userId) return

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('academy_onboarding_state')
    .upsert({
      user_id: userId,
      tour_version: 'product-tour-v2',
      current_step: input.currentStep,
      completed_at: input.completed ? now : null,
      skipped_at: input.skipped ? now : null,
    }, { onConflict: 'user_id' })

  if (error) throw error
}
