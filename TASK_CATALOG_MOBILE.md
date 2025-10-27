# 📱 Адаптация каталога задач + Отображение категорий

## 📋 Обзор изменений

1. Страница каталога задач полностью адаптирована под мобильные устройства
2. Добавлено отображение категории и подкатегории для каждой задачи
3. API обновлен для возврата информации о категориях

---

## ✅ Реализованные изменения

### 1. **Обновление API** (`/api/tasks`)

**Файл:** `NESI/src/app/api/tasks/route.ts`

#### Изменения:

Добавлен select для subcategory, включая информацию о категории:

```typescript
select: {
  id: true,
  title: true,
  description: true,
  price: true,
  deadline: true,
  status: true,
  createdAt: true,
  customer: { select: { id: true, fullName: true } },
  subcategory: {
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true } },
    },
  },
  files: {
    select: { id: true, filename: true, mimetype: true, size: true },
  },
  _count: { select: { responses: true } },
}
```

---

### 2. **Обновление типов данных**

**Файл:** `NESI/src/app/tasks/TaskCatalogPage.tsx`

#### Добавлено в тип Task:

```typescript
type Task = {
	id: string
	title: string
	description: string
	createdAt: string
	price?: number
	status?: string
	customer: { fullName?: string }
	subcategory?: {
		id: string
		name: string
		category: { id: string; name: string }
	}
}
```

---

### 3. **Отображение категории в карточке задачи**

#### Добавлен блок категории:

```tsx
{
	task.subcategory && (
		<div className='flex flex-wrap items-center gap-2'>
			{/* Категория */}
			<span className='inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs sm:text-sm font-medium text-emerald-400'>
				<span className='text-base'>🏷️</span>
				{task.subcategory.category.name}
			</span>

			<span className='text-gray-500 text-xs'>→</span>

			{/* Подкатегория */}
			<span className='inline-flex items-center px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-400'>
				{task.subcategory.name}
			</span>
		</div>
	)
}
```

#### Визуальный дизайн:

- **Категория**: Изумрудный бейдж с иконкой 🏷️
- **Подкатегория**: Синий бейдж меньшего размера
- **Разделитель**: Стрелка `→` между ними

---

### 4. **Мобильная адаптация**

#### Заголовок страницы:

```tsx
<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
	<h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-400'>
		Каталог задач
	</h1>

	{/* Кнопка фильтров (только на мобильных) */}
	<button
		onClick={() => setIsFiltersOpen(!isFiltersOpen)}
		className='lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-semibold'
	>
		<span className='text-lg'>🔍</span>
		<span>{isFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}</span>
	</button>
</div>
```

#### Фильтры:

- **Мобильные**: Скрыты по умолчанию, открываются кнопкой
- **Десктоп**: Всегда видны, sticky позиционирование
- **Адаптивная ширина**: `w-full lg:w-72`

```tsx
<div
	className={`${
		isFiltersOpen ? 'block' : 'hidden'
	} lg:block w-full lg:w-72 lg:sticky lg:top-28 lg:self-start p-4 sm:p-6 bg-black/40 border border-emerald-500/30 rounded-2xl`}
>
	{/* Фильтры */}
</div>
```

#### Карточки задач:

- **Адаптивный padding**: `p-4 sm:p-6`
- **Адаптивные размеры текста**: `text-xs sm:text-sm`, `text-lg sm:text-xl`
- **Line clamp**: Ограничение строк для заголовка и описания
- **Вертикальная раскладка на мобильных**: Цена и информация располагаются вертикально

```tsx
<div className='p-4 sm:p-6 border border-emerald-500/30 rounded-xl bg-black/40 space-y-3'>
	{/* Категория */}
	{task.subcategory && (
		<div className='flex flex-wrap items-center gap-2'>
			{/* Бейджи категорий */}
		</div>
	)}

	{/* Заголовок */}
	<h2 className='text-lg sm:text-xl font-semibold text-emerald-300 line-clamp-2'>
		{task.title}
	</h2>

	{/* Описание */}
	<p className='text-sm sm:text-base text-gray-300 line-clamp-2 sm:line-clamp-3'>
		{task.description}
	</p>

	{/* Цена и информация */}
	<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 pt-2 border-t border-gray-700/50'>
		{task.price && (
			<p className='text-emerald-400 font-semibold text-base sm:text-lg flex items-center gap-1.5'>
				<span>💰</span>
				{task.price} ₽
			</p>
		)}
		<p className='text-xs sm:text-sm text-gray-400'>
			<span className='text-gray-500'>Автор:</span> {task.customer?.fullName} •{' '}
			{new Date(task.createdAt).toLocaleDateString('ru-RU')}
		</p>
	</div>
</div>
```

#### Пагинация:

```tsx
<div className='flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-6 sm:mt-8'>
	<button className='w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400'>
		← Назад
	</button>
	<span className='text-gray-400 text-sm sm:text-base'>
		Страница {page} из {totalPages}
	</span>
	<button className='w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400'>
		Далее →
	</button>
</div>
```

---

### 5. **Пустое состояние**

Улучшено отображение, когда нет задач:

```tsx
<div className='text-center py-12'>
	<div className='text-4xl mb-4'>📋</div>
	<div className='text-gray-400 text-lg'>Задач пока нет</div>
	<p className='text-gray-500 text-sm mt-2'>Попробуйте изменить фильтры</p>
</div>
```

---

## 🎨 Ключевые улучшения

### 1. **Отображение категорий**

- ✅ Категория и подкатегория видны сразу
- ✅ Цветовое кодирование (изумрудный для категории, синий для подкатегории)
- ✅ Иконка для визуального акцента
- ✅ Адаптивные размеры бейджей

### 2. **Мобильная адаптация**

- ✅ Кнопка показа/скрытия фильтров на мобильных
- ✅ Вертикальная раскладка элементов
- ✅ Адаптивные размеры текста и отступов
- ✅ Полноширинные кнопки пагинации на мобильных
- ✅ Line-clamp для длинных текстов

### 3. **UX улучшения**

- ✅ Фильтры автоматически скрываются после применения (на мобильных)
- ✅ Улучшенное пустое состояние
- ✅ Иконки для лучшей визуализации
- ✅ Hover-эффекты и тени

---

## 📦 Измененные файлы

1. ✅ `NESI/src/app/api/tasks/route.ts` - Добавлен select для subcategory
2. ✅ `NESI/src/app/tasks/TaskCatalogPage.tsx` - Мобильная адаптация + отображение категорий

---

## 🎯 Breakpoints

| Устройство         | Breakpoint | Изменения                                      |
| ------------------ | ---------- | ---------------------------------------------- |
| Мобильные          | 0-639px    | Фильтры скрыты, вертикальная раскладка         |
| Маленькие планшеты | 640px+     | Увеличенный текст                              |
| Планшеты           | 768px+     | -                                              |
| Десктоп            | 1024px+    | Фильтры всегда видны, горизонтальная раскладка |

---

## ✅ Проверка

- ✅ TypeScript типы корректны
- ✅ ESLint правила соблюдены
- ✅ Линтер: 0 ошибок
- ✅ Категории отображаются правильно
- ✅ Мобильная адаптация работает корректно

---

## 📝 Примечания

1. **Категории отображаются только если есть** - если задача без категории, бейджи не показываются
2. **Фильтры на мобильных** открываются кнопкой и автоматически скрываются после применения/сброса
3. **Line-clamp** ограничивает длину текста: заголовок - 2 строки, описание - 2-3 строки в зависимости от экрана
4. **Sticky фильтры** на десктопе остаются видимыми при прокрутке

---

**Дата обновления:** 27 октября 2025  
**Статус:** ✅ Завершено
