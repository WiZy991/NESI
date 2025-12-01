/**
 * Генератор SEO-контента для категорий и задач
 */

/**
 * Генерирует краткое описание категории (200-300 символов)
 */
export function generateCategoryDescription(categoryName: string, freelancersCount: number): string {
  return `Категория ${categoryName} на платформе NESI. ${freelancersCount} проверенных фрилансеров, прошедших сертификацию. Быстрый подбор специалиста для вашего проекта. Безопасные сделки, система эскроу, гарантия качества.`
}

/**
 * Генерирует FAQ для категории (400-600 символов)
 */
export function generateCategoryFAQ(categoryName: string): string {
  return `В категории ${categoryName} вы найдете профессиональных специалистов с подтвержденными навыками. Все исполнители проходят сертификацию и имеют реальный опыт работы. При выборе специалиста обращайте внимание на рейтинг, количество отзывов и портфолио. Рекомендуем выбирать исполнителей с сертификацией в этой категории для гарантии качества работы.`
}

/**
 * Генерирует подзаголовки для задач
 */
export interface TaskSubtitles {
  whatToDo: string
  requirements: string
  description: string
}

export function generateTaskSubtitles(taskTitle: string): TaskSubtitles {
  return {
    whatToDo: `Что нужно сделать?`,
    requirements: `Требования`,
    description: `Описание проекта`,
  }
}

