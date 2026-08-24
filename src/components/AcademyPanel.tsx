import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  GraduationCap,
  Languages,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getAcademyCatalog,
  getAcademyLessons,
  getAcademyProgress,
  gradeAcademyQuiz,
  saveAcademyProgress,
  type AcademyCourse,
  type AcademyLesson,
  type AcademyLessonProgress,
  type AcademyQuizQuestion,
  type AcademyQuizResult,
} from '../lib/queries/academy'
import { useAuth } from '../lib/auth/AuthProvider'

const GUEST_PROGRESS_KEY = 'tradepulse-academy-progress-v1'

type GuestProgress = Record<string, AcademyLessonProgress>

function displayError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'TradePulse Academy could not load this learning activity.'
}

function readGuestProgress(): GuestProgress {
  try {
    const value = localStorage.getItem(GUEST_PROGRESS_KEY)
    return value ? JSON.parse(value) as GuestProgress : {}
  } catch {
    return {}
  }
}

function writeGuestProgress(progress: GuestProgress) {
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress))
}

function progressPercent(course: AcademyCourse, completedCount: number) {
  if (course.lessonCount === 0) return 0
  return Math.round(completedCount / course.lessonCount * 100)
}

export function AcademyPanel() {
  const { session } = useAuth()
  const [catalog, setCatalog] = useState<AcademyCourse[]>([])
  const [lessons, setLessons] = useState<AcademyLesson[]>([])
  const [questions, setQuestions] = useState<AcademyQuizQuestion[]>([])
  const [progress, setProgress] = useState<AcademyLessonProgress[]>([])
  const [guestProgress, setGuestProgress] = useState<GuestProgress>(() => readGuestProgress())
  const [selectedCourseSlug, setSelectedCourseSlug] = useState('')
  const [selectedLessonSlug, setSelectedLessonSlug] = useState('')
  const [requestedLessonSlug, setRequestedLessonSlug] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('all')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [quizResult, setQuizResult] = useState<AcademyQuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void getAcademyCatalog()
      .then((courses) => {
        setCatalog(courses)
        setSelectedCourseSlug((current) => current || courses[0]?.slug || '')
        setError(null)
      })
      .catch((loadError) => setError(displayError(loadError)))
      .finally(() => setLoading(false))
  }, [])

  const refreshProgress = async () => {
    if (!session) {
      setProgress([])
      return
    }
    setProgress(await getAcademyProgress())
  }

  useEffect(() => {
    void refreshProgress().catch((loadError) => setError(displayError(loadError)))
  }, [session])

  useEffect(() => {
    const handleAcademyOpen = (event: Event) => {
      const detail = (event as CustomEvent<{
        courseSlug?: string
        lessonSlug?: string
      }>).detail
      if (!detail?.courseSlug) return

      setRequestedLessonSlug(detail.lessonSlug ?? null)
      setSelectedCourseSlug(detail.courseSlug)
      document.getElementById('academy')?.scrollIntoView({ behavior: 'smooth' })
    }

    window.addEventListener('tradepulse:open-academy', handleAcademyOpen)
    return () => window.removeEventListener('tradepulse:open-academy', handleAcademyOpen)
  }, [])

  const completedSlugs = useMemo(() => new Set(
    session
      ? progress.filter((item) => item.status === 'completed').map((item) => item.lessonSlug)
      : Object.values(guestProgress).filter((item) => item.status === 'completed').map((item) => item.lessonSlug),
  ), [guestProgress, progress, session])

  useEffect(() => {
    if (!selectedCourseSlug) return

    setLessonLoading(true)
    setAnswers({})
    setQuizResult(null)
    void getAcademyLessons(selectedCourseSlug)
      .then((result) => {
        setLessons(result.lessons)
        setQuestions(result.questions)
        const requested = result.lessons.find((item) => item.slug === requestedLessonSlug)
        const firstIncomplete = result.lessons.find((item) => !completedSlugs.has(item.slug))
        setSelectedLessonSlug(requested?.slug ?? firstIncomplete?.slug ?? result.lessons[0]?.slug ?? '')
        setRequestedLessonSlug(null)
        setError(null)
      })
      .catch((loadError) => setError(displayError(loadError)))
      .finally(() => setLessonLoading(false))
  }, [selectedCourseSlug])

  useEffect(() => {
    setAnswers({})
    setQuizResult(null)
    setMessage(null)
  }, [selectedLessonSlug])

  const selectedCourse = catalog.find((course) => course.slug === selectedCourseSlug) ?? null
  const selectedLesson = lessons.find((lesson) => lesson.slug === selectedLessonSlug) ?? null
  const selectedIndex = lessons.findIndex((lesson) => lesson.slug === selectedLessonSlug)
  const lessonQuestions = questions.filter((question) => question.lessonSlug === selectedLessonSlug)
  const filteredCourses = catalog.filter((course) => {
    const query = search.trim().toLowerCase()
    const matchesQuery = !query ||
      course.title.toLowerCase().includes(query) ||
      course.summary.toLowerCase().includes(query)
    return matchesQuery && (level === 'all' || course.level === level)
  })

  const courseCompleted = selectedCourse
    ? lessons.filter((lesson) => completedSlugs.has(lesson.slug)).length
    : 0
  const courseProgress = selectedCourse
    ? progressPercent(selectedCourse, courseCompleted)
    : 0

  const updateGuestProgress = (
    lessonSlug: string,
    status: 'in_progress' | 'completed',
    score: number | null = null,
  ) => {
    const previous = guestProgress[lessonSlug]
    const next: GuestProgress = {
      ...guestProgress,
      [lessonSlug]: {
        lessonSlug,
        courseSlug: selectedLesson?.courseSlug,
        status,
        bestScore: Math.max(previous?.bestScore ?? 0, score ?? 0) || null,
        attempts: (previous?.attempts ?? 0) + (score === null ? 0 : 1),
        lastPosition: 0,
        completedAt: status === 'completed'
          ? previous?.completedAt ?? new Date().toISOString()
          : null,
        updatedAt: new Date().toISOString(),
      },
    }
    setGuestProgress(next)
    writeGuestProgress(next)
  }

  const markLessonComplete = async () => {
    if (!selectedLesson) return
    setActionLoading(true)
    setError(null)
    try {
      if (session) {
        await saveAcademyProgress({ lessonSlug: selectedLesson.slug, status: 'completed' })
        await refreshProgress()
      } else {
        updateGuestProgress(selectedLesson.slug, 'completed')
      }
      setMessage('Lesson completed. Your progress has been updated.')
    } catch (actionError) {
      setError(displayError(actionError))
    } finally {
      setActionLoading(false)
    }
  }

  const checkQuiz = async () => {
    if (!selectedLesson || lessonQuestions.length === 0) return
    if (lessonQuestions.some((question) => answers[question.id] === undefined)) {
      setError('Answer every knowledge-check question before submitting.')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const result = await gradeAcademyQuiz(selectedLesson.slug, answers)
      setQuizResult(result)
      if (!session) {
        updateGuestProgress(
          selectedLesson.slug,
          result.passed ? 'completed' : 'in_progress',
          result.score,
        )
      } else {
        await refreshProgress()
      }
      setMessage(result.passed
        ? `Knowledge check passed with ${Math.round(result.score)}%.`
        : `Score ${Math.round(result.score)}%. Review the explanations and try again.`)
    } catch (actionError) {
      setError(displayError(actionError))
    } finally {
      setActionLoading(false)
    }
  }

  const goToLesson = (index: number) => {
    const lesson = lessons[index]
    if (!lesson) return
    setSelectedLessonSlug(lesson.slug)
    document.getElementById('academy-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="panel academy-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">TradePulse Academy · Phase 3E</p>
          <h2>Learn the platform. Understand the risk.</h2>
        </div>
        <span className="status-badge academy-badge">
          <GraduationCap size={14} /> Essential courses free
        </span>
      </div>

      <p className="panel-description academy-description">
        Follow short, practical lessons from your first dashboard tour through
        AI forecast literacy, stock research, paper trading and portfolio risk.
        Guests can learn immediately; signing in preserves progress across devices.
      </p>

      <div className="academy-trust-row">
        <div><Languages size={16} /><span>English launch</span><strong>More languages planned</strong></div>
        <div><ShieldCheck size={16} /><span>Education boundary</span><strong>Not financial advice</strong></div>
        <div><Award size={16} /><span>Learning records</span><strong>Certificates-ready</strong></div>
        <div><LockKeyhole size={16} /><span>Your progress</span><strong>{session ? 'Private and synced' : 'Stored on this device'}</strong></div>
      </div>

      {loading ? (
        <div className="academy-state" role="status"><RefreshCw size={20} /> Loading Academy…</div>
      ) : error && catalog.length === 0 ? (
        <div className="academy-state" role="alert">{error}</div>
      ) : (
        <div className="academy-layout">
          <aside className="academy-catalog" aria-label="Academy courses">
            <div className="academy-filter-row">
              <label className="academy-search">
                <Search size={14} />
                <span className="sr-only">Search courses</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Search courses"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <select value={level} aria-label="Course level" onChange={(event) => setLevel(event.target.value)}>
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="academy-course-list">
              {filteredCourses.map((course) => {
                const progressRecords = session ? progress : Object.values(guestProgress)
                const completed = progressRecords.filter((item) =>
                  item.courseSlug === course.slug && item.status === 'completed',
                ).length
                const value = course.slug === selectedCourseSlug
                  ? courseProgress
                  : progressPercent(course, completed)

                return (
                  <button
                    type="button"
                    key={course.slug}
                    className={course.slug === selectedCourseSlug ? 'academy-course active' : 'academy-course'}
                    onClick={() => setSelectedCourseSlug(course.slug)}
                  >
                    <div className="academy-course-title">
                      <BookOpen size={16} />
                      <div><strong>{course.shortTitle}</strong><span>{course.level} · {course.lessonCount} lessons</span></div>
                      <small>{value}%</small>
                    </div>
                    <p>{course.summary}</p>
                    <span className="academy-progress-track"><span style={{ width: `${value}%` }} /></span>
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="academy-workspace">
            {selectedCourse ? (
              <header className="academy-course-head">
                <div>
                  <span>{selectedCourse.level} · {selectedCourse.estimatedMinutes} minutes · {selectedCourse.languageCode.toUpperCase()}</span>
                  <h3>{selectedCourse.title}</h3>
                  <p>{selectedCourse.audience}</p>
                </div>
                <div className="academy-course-progress">
                  <strong>{courseProgress}%</strong>
                  <span>{courseCompleted}/{selectedCourse.lessonCount} complete</span>
                </div>
              </header>
            ) : null}

            <div className="academy-lesson-layout">
              <nav className="academy-lesson-list" aria-label="Course lessons">
                {lessons.map((lesson, index) => {
                  const complete = completedSlugs.has(lesson.slug)
                  return (
                    <button
                      type="button"
                      key={lesson.slug}
                      className={lesson.slug === selectedLessonSlug ? 'academy-lesson active' : 'academy-lesson'}
                      onClick={() => setSelectedLessonSlug(lesson.slug)}
                    >
                      {complete ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                      <div><span>Lesson {index + 1}</span><strong>{lesson.title}</strong></div>
                      <small>{lesson.estimatedMinutes}m</small>
                    </button>
                  )
                })}
              </nav>

              <article className="academy-reader" id="academy-reader">
                {lessonLoading ? (
                  <div className="academy-state"><RefreshCw size={18} /> Loading lessons…</div>
                ) : !selectedLesson ? (
                  <div className="academy-state">Select a course to begin.</div>
                ) : (
                  <>
                    <div className="academy-reader-head">
                      <div>
                        <span><PlayCircle size={13} /> {selectedLesson.lessonKind.replace('_', ' ')} · <Clock3 size={13} /> {selectedLesson.estimatedMinutes} min</span>
                        <h4>{selectedLesson.title}</h4>
                        <p>{selectedLesson.summary}</p>
                      </div>
                      {completedSlugs.has(selectedLesson.slug)
                        ? <span className="lesson-complete-pill"><Check size={13} /> Completed</span>
                        : null}
                    </div>

                    <div className="academy-content">
                      {selectedLesson.content.map((section) => (
                        <section key={section.heading}>
                          <h5>{section.heading}</h5>
                          <p>{section.body}</p>
                          {section.bullets?.length
                            ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                            : null}
                          {section.callout ? <div className="academy-callout">{section.callout}</div> : null}
                        </section>
                      ))}
                    </div>

                    {lessonQuestions.length > 0 ? (
                      <section className="academy-quiz">
                        <div className="academy-quiz-head">
                          <div><span>Knowledge check</span><strong>Pass mark: 70%</strong></div>
                          {quizResult ? <strong>{Math.round(quizResult.score)}%</strong> : null}
                        </div>
                        {lessonQuestions.map((question) => {
                          const result = quizResult?.results.find((item) => item.questionId === question.id)
                          return (
                            <fieldset key={question.id}>
                              <legend>{question.prompt}</legend>
                              {question.options.map((option, optionIndex) => (
                                <label key={option} className={
                                  result && optionIndex === result.correctOption
                                    ? 'quiz-option correct'
                                    : result && answers[question.id] === optionIndex && !result.correct
                                      ? 'quiz-option incorrect'
                                      : 'quiz-option'
                                }>
                                  <input
                                    type="radio"
                                    name={`academy-question-${question.id}`}
                                    value={optionIndex}
                                    checked={answers[question.id] === optionIndex}
                                    disabled={Boolean(quizResult)}
                                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                              {result ? <p className="quiz-explanation">{result.explanation}</p> : null}
                            </fieldset>
                          )
                        })}
                        {quizResult ? (
                          <button className="secondary-button" type="button" onClick={() => { setQuizResult(null); setAnswers({}) }}>
                            Try knowledge check again
                          </button>
                        ) : (
                          <button className="primary-button" type="button" disabled={actionLoading} onClick={() => void checkQuiz()}>
                            Check answers
                          </button>
                        )}
                      </section>
                    ) : (
                      <button className="primary-button" type="button" disabled={actionLoading} onClick={() => void markLessonComplete()}>
                        <Check size={14} /> Mark lesson complete
                      </button>
                    )}

                    <div className="academy-reader-nav">
                      <button className="secondary-button" type="button" disabled={selectedIndex <= 0} onClick={() => goToLesson(selectedIndex - 1)}>
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button className="secondary-button" type="button" disabled={selectedIndex < 0 || selectedIndex >= lessons.length - 1} onClick={() => goToLesson(selectedIndex + 1)}>
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </>
                )}
              </article>
            </div>
          </div>
        </div>
      )}

      {error && catalog.length > 0 ? <div className="inline-message error" role="alert">{error}</div> : null}
      {message ? <div className="inline-message success" role="status">{message}</div> : null}

      <p className="academy-boundary">
        TradePulse Academy provides product education and general financial
        literacy. Course completion does not certify investment competence,
        establish suitability or authorize live trading.
      </p>
    </section>
  )
}
