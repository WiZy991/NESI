/**
 * API для поиска организации/ИП по ИНН через официальный сервис ФНС (egrul.nalog.ru)
 * 
 * GET /api/inn/lookup?inn=7707083893
 * 
 * Бесплатно, не требует регистрации!
 * 
 * Возвращает:
 * - Для ООО: название, КПП, ОГРН, юридический адрес
 * - Для ИП: ФИО, ОГРНИП
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// Задержка для ожидания результата от ФНС
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const inn = req.nextUrl.searchParams.get('inn')

    if (!inn) {
      return NextResponse.json({ error: 'ИНН не указан' }, { status: 400 })
    }

    // Проверяем формат ИНН
    const cleanInn = inn.replace(/\D/g, '')
    
    // ИНН юр.лица = 10 цифр, ИНН ИП/физ.лица = 12 цифр
    if (cleanInn.length !== 10 && cleanInn.length !== 12) {
      return NextResponse.json({ 
        error: 'Некорректный ИНН. Для организации — 10 цифр, для ИП — 12 цифр' 
      }, { status: 400 })
    }

    // Шаг 1: Отправляем запрос на поиск в ФНС
    const searchResponse = await fetch('https://egrul.nalog.ru/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        query: cleanInn,
        region: '',
        page: '',
        pageSize: '1',
      }),
    })

    if (!searchResponse.ok) {
      logger.error('FNS search error', undefined, {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
      })
      return NextResponse.json({
        success: false,
        error: 'Ошибка при обращении к ФНС',
      }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    const token = searchData.t

    if (!token) {
      logger.error('FNS no token returned', undefined, { response: JSON.stringify(searchData) })
      return NextResponse.json({
        success: true,
        found: false,
        message: 'Не удалось получить данные от ФНС',
      })
    }

    // Шаг 2: Ждём и запрашиваем результат
    // ФНС обрабатывает запрос асинхронно, нужно подождать
    await sleep(1500) // Ждём 1.5 секунды

    const resultResponse = await fetch(`https://egrul.nalog.ru/search-result/${token}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!resultResponse.ok) {
      // Пробуем ещё раз с большей задержкой
      await sleep(1500)
      const retryResponse = await fetch(`https://egrul.nalog.ru/search-result/${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      if (!retryResponse.ok) {
        logger.error('FNS result error', undefined, {
          status: retryResponse.status,
        })
        return NextResponse.json({
          success: true,
          found: false,
          message: 'Не удалось получить результат от ФНС. Попробуйте позже.',
        })
      }
      
      const retryData = await retryResponse.json()
      return processResult(retryData, cleanInn, user.id)
    }

    const resultData = await resultResponse.json()
    return processResult(resultData, cleanInn, user.id)

  } catch (error) {
    logger.error('INN lookup error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при проверке ИНН' },
      { status: 500 }
    )
  }
}

function processResult(resultData: any, cleanInn: string, userId: string) {
  const rows = resultData.rows || []

  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      found: false,
      message: 'Организация с таким ИНН не найдена в ЕГРЮЛ/ЕГРИП',
    })
  }

  const entity = rows[0]
  
  // Определяем тип: ИП или юр.лицо
  // У ИП есть поле "i" (ФИО), у юр.лиц - "n" или "c" (название)
  const isIP = cleanInn.length === 12 || entity.k === 'fl' // fl = физлицо/ИП
  
  // Извлекаем данные
  const result: any = {
    success: true,
    found: true,
    type: isIP ? 'IP' : 'COMPANY',
    inn: cleanInn,
  }

  // Название/ФИО
  // n - полное название, c - краткое название, i - ФИО для ИП
  if (isIP) {
    result.name = entity.n || entity.c || entity.i || 'ИП'
    result.fullName = entity.n || entity.i
  } else {
    result.name = entity.c || entity.n || 'Организация'
    result.fullName = entity.n || entity.c
  }

  // КПП (только для юр.лиц)
  if (entity.p && !isIP) {
    result.kpp = entity.p
  }

  // ОГРН/ОГРНИП
  if (entity.o) {
    result.ogrn = entity.o
  }

  // Адрес
  if (entity.a) {
    result.address = entity.a
  }

  // Статус (g - дата регистрации, e - дата ликвидации)
  result.isActive = !entity.e // Если нет даты ликвидации - активна
  if (entity.e) {
    result.status = 'LIQUIDATED'
  } else {
    result.status = 'ACTIVE'
  }

  // Дата регистрации
  if (entity.g) {
    result.registrationDate = entity.g
  }

  logger.info('INN lookup success (FNS)', {
    userId,
    inn: cleanInn,
    found: true,
    type: result.type,
    name: result.name,
  })

  return NextResponse.json(result)
}

