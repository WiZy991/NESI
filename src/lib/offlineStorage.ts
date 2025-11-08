/**
 * Базовое хранилище для офлайн режима с использованием IndexedDB
 */

const DB_NAME = 'nesi_offline_db'
const DB_VERSION = 1

type StoreName = 'tasks' | 'messages' | 'notifications' | 'user'

let dbInstance: IDBDatabase | null = null

// Инициализация базы данных
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Ошибка открытия IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Создаем хранилища для разных типов данных
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
        taskStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
        messageStore.createIndex('createdAt', 'createdAt', { unique: false })
        messageStore.createIndex('taskId', 'taskId', { unique: false })
      }

      if (!db.objectStoreNames.contains('notifications')) {
        const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' })
        notificationStore.createIndex('createdAt', 'createdAt', { unique: false })
        notificationStore.createIndex('read', 'read', { unique: false })
      }

      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user', { keyPath: 'id' })
      }
    }
  })
}

// Сохранение данных в IndexedDB
export async function saveToOffline<T>(storeName: StoreName, data: T | T[]): Promise<void> {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    const items = Array.isArray(data) ? data : [data]

    for (const item of items) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(item)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  } catch (error) {
    console.error(`Ошибка сохранения в ${storeName}:`, error)
  }
}

// Получение данных из IndexedDB
export async function getFromOffline<T>(storeName: StoreName, key?: string): Promise<T | T[] | null> {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)

    if (key) {
      return new Promise<T | null>((resolve, reject) => {
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } else {
      return new Promise<T[]>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    }
  } catch (error) {
    console.error(`Ошибка получения из ${storeName}:`, error)
    return null
  }
}

// Удаление данных из IndexedDB
export async function deleteFromOffline(storeName: StoreName, key: string): Promise<void> {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error(`Ошибка удаления из ${storeName}:`, error)
  }
}

// Очистка хранилища
export async function clearOfflineStore(storeName: StoreName): Promise<void> {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    await new Promise<void>((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error(`Ошибка очистки ${storeName}:`, error)
  }
}

// Проверка онлайн статуса
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

// Слушатель изменений онлайн статуса
export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

