/**
 * Проверка качества и осмысленности текста задачи
 */

/**
 * Проверяет, является ли текст осмысленным (не рандомные символы)
 */
export function isTextMeaningful(text: string): boolean {
	if (!text || text.length < 3) {
		return false
	}
	
	const lowerText = text.toLowerCase()
	
	// Проверка на рандомные символы (много повторяющихся символов)
	const uniqueChars = new Set(lowerText.replace(/\s/g, '')).size
	const totalChars = lowerText.replace(/\s/g, '').length
	const uniqueRatio = uniqueChars / totalChars
	
	// Если уникальных символов меньше 30% - вероятно рандомные символы
	if (uniqueRatio < 0.3 && totalChars > 5) {
		return false
	}
	
	// Проверка на повторяющиеся паттерны (например, "dsda" или "aaaa")
	const patterns = [
		/(.)\1{3,}/, // 4+ одинаковых символа подряд
		/(.{2,})\1{2,}/, // Повторяющиеся паттерны (dsdadsda)
	]
	
	for (const pattern of patterns) {
		if (pattern.test(lowerText)) {
			return false
		}
	}
	
	// Проверка на наличие осмысленных слов (русские или английские слова длиннее 3 символов)
	const russianWordPattern = /[а-яё]{3,}/i
	const englishWordPattern = /[a-z]{3,}/i
	
	const hasRussianWords = russianWordPattern.test(lowerText)
	const hasEnglishWords = englishWordPattern.test(lowerText)
	
	// Если нет ни русских, ни английских слов длиннее 3 символов - вероятно не осмысленный текст
	if (!hasRussianWords && !hasEnglishWords && text.length > 10) {
		return false
	}
	
	// Проверка на слишком много цифр или спецсимволов
	const digitCount = (text.match(/\d/g) || []).length
	const specialCharCount = (text.match(/[^\w\sа-яё]/gi) || []).length
	const totalCharsCount = text.replace(/\s/g, '').length
	
	if (totalCharsCount > 0) {
		const digitRatio = digitCount / totalCharsCount
		const specialRatio = specialCharCount / totalCharsCount
		
		// Если больше 50% цифр или спецсимволов - вероятно не осмысленный текст
		if (digitRatio > 0.5 || specialRatio > 0.5) {
			return false
		}
	}
	
	return true
}

/**
 * Проверяет, можно ли использовать адаптивную статистику для задачи
 */
export function canUseAdaptiveStats(title: string, description: string): boolean {
	const fullText = `${title} ${description}`
	
	// Если текст слишком короткий (меньше 10 символов) - не используем адаптивную статистику
	if (fullText.length < 10) {
		return false
	}
	
	// Проверяем осмысленность
	if (!isTextMeaningful(fullText)) {
		return false
	}
	
	return true
}

