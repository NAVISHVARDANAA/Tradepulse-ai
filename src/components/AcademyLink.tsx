import { BookOpen } from 'lucide-react'

type AcademyLinkProps = {
  courseSlug: string
  lessonSlug?: string
  label?: string
}

export function AcademyLink({
  courseSlug,
  lessonSlug,
  label = 'Learn this',
}: AcademyLinkProps) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('tradepulse:open-academy', {
      detail: { courseSlug, lessonSlug },
    }))
  }

  return (
    <a className="academy-context-link" href="#academy" onClick={handleClick}>
      <BookOpen size={13} /> {label}
    </a>
  )
}
