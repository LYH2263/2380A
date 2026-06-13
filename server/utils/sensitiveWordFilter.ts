import prisma from './prisma'

interface SensitiveWordMatch {
  word: string
  level: 'WARN' | 'BLOCK'
  start: number
  end: number
}

export const checkSensitiveWords = async (
  text: string
): Promise<{ hasSensitiveWords: boolean; matchedWords: SensitiveWordMatch[]; shouldBlock: boolean }> => {
  const sensitiveWords = await prisma.sensitiveWord.findMany({
    select: { word: true, level: true }
  })

  const matchedWords: SensitiveWordMatch[] = []
  let shouldBlock = false

  for (const sw of sensitiveWords) {
    const regex = new RegExp(escapeRegExp(sw.word), 'gi')
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      matchedWords.push({
        word: sw.word,
        level: sw.level,
        start: match.index,
        end: match.index + sw.word.length
      })

      if (sw.level === 'BLOCK') {
        shouldBlock = true
      }
    }
  }

  return {
    hasSensitiveWords: matchedWords.length > 0,
    matchedWords,
    shouldBlock
  }
}

export const maskSensitiveWords = (text: string, matchedWords: SensitiveWordMatch[]): string => {
  if (matchedWords.length === 0) return text

  const sortedMatches = [...matchedWords].sort((a, b) => b.start - a.start)
  let result = text

  for (const match of sortedMatches) {
    const mask = '*'.repeat(match.word.length)
    result = result.substring(0, match.start) + mask + result.substring(match.end)
  }

  return result
}

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
