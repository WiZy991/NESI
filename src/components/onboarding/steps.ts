// src/components/onboarding/steps.ts
export type Role = 'customer' | 'performer'
export type PageKey =
  | 'dashboard'
  | 'tasks'
  | 'task-details'
  | 'create-task'
  | 'level'
  | 'podium'
  | 'my-tasks'

export interface OnboardingStepGroup {
  role: Role
  page: PageKey
  steps: {
    element: string
    popover: {
      title: string
      description: string
      side?: 'top' | 'bottom' | 'left' | 'right'
    }
  }[]
}

export const onboardingSteps: OnboardingStepGroup[] = [
  {
    role: 'customer',
    page: 'dashboard',
    steps: [
      {
        element: '[data-onboarding="create-task-btn"]',
        popover: {
          title: 'Создание задачи ✏️',
          description:
            'Нажми здесь, чтобы создать задачу — исполнители сами предложат свои цены.',
        },
      },
      {
        element: '[data-onboarding="my-tasks-link"]',
        popover: {
          title: 'Мои задачи 📋',
          description:
            'Здесь ты видишь все свои активные и завершённые заказы.',
        },
      },
    ],
  },
  {
    role: 'customer',
    page: 'create-task',
    steps: [
      {
        element: '[data-onboarding="task-title"]',
        popover: {
          title: 'Название задачи',
          description: 'Дай задаче понятное имя, чтобы её проще было понять.',
        },
      },
      {
        element: '[data-onboarding="task-desc"]',
        popover: {
          title: 'Описание',
          description:
            'Опиши задачу подробно, чтобы исполнители знали, что делать.',
        },
      },
      {
        element: '[data-onboarding="task-category"]',
        popover: {
          title: 'Категория',
          description: 'Выбери подходящую категорию задачи.',
        },
      },
      {
        element: '[data-onboarding="task-create-btn"]',
        popover: {
          title: 'Создать задачу',
          description: 'После заполнения — нажми и задача появится в каталоге.',
        },
      },
    ],
  },
  {
    role: 'performer',
    page: 'dashboard',
    steps: [
      {
        element: '[data-onboarding="profile-link"]',
        popover: {
          title: 'Профиль исполнителя 💼',
          description:
            'Добавь фото, навыки и город, чтобы заказчики могли тебя найти.',
        },
      },
      {
        element: '[data-onboarding="tasks-link"]',
        popover: {
          title: 'Каталог задач',
          description:
            'Ищи задачи по навыкам — начни с простых, чтобы заработать XP.',
        },
      },
      {
        element: '[data-onboarding="level-field"]',
        popover: {
          title: 'Уровень / XP',
          description:
            'Выполняй задачи, получай бейджи и повышай уровень исполнителя.',
        },
      },
    ],
  },
]
