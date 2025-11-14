# Рефакторинг Header.tsx

## Созданные компоненты

### 1. `utils.ts`
Утилиты для работы с уведомлениями:
- `formatNotificationTime` - форматирование времени уведомления
- `NOTIFICATION_TYPE_LABELS` - метки типов уведомлений
- `getNotificationTypeLabel` - получение метки типа уведомления

### 2. `HeaderNotifications.tsx`
Компонент для отображения уведомлений (мобильная и десктопная версии).

**Props:**
- `notifications` - массив уведомлений
- `unreadCount` - количество непрочитанных
- `notifOpen` - состояние открытия меню уведомлений
- `setNotifOpen` - функция для изменения состояния
- `onNotificationClick` - обработчик клика по уведомлению
- `onGoToNotifications` - обработчик перехода на страницу уведомлений
- `setMobileMenuOpen` - функция для закрытия мобильного меню

### 3. `HeaderUserMenu.tsx`
Компонент выпадающего меню "Ещё".

**Props:**
- `menuOpen` - состояние открытия меню
- `setMenuOpen` - функция для изменения состояния
- `menuRef` - ref для элемента меню
- `unreadMessagesCount` - количество непрочитанных сообщений
- `userRole` - роль пользователя
- `onLogout` - обработчик выхода
- `linkStyle` - стиль ссылок

### 4. `FavoritesLink.tsx`
Компонент ссылки на избранное.

**Props:**
- `className` - дополнительные классы CSS

## Следующие шаги для полного рефакторинга

1. Создать `HeaderMobileMenu.tsx` - компонент мобильного меню
2. Создать `HeaderDesktopNavigation.tsx` - компонент десктопной навигации
3. Обновить основной `Header.tsx` для использования новых компонентов
4. Вынести логику работы с SSE и уведомлениями в отдельные хуки

## Использование

```tsx
import { HeaderNotifications } from './Header/HeaderNotifications'
import { HeaderUserMenu } from './Header/HeaderUserMenu'
import { FavoritesLink } from './Header/FavoritesLink'
import { formatNotificationTime, getNotificationTypeLabel } from './Header/utils'
```

