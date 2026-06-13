export const extractMentionsFromContent = (content: string): string[] => {
  const mentionRegex = /@(\w{2,20})/g
  const matches = content.match(mentionRegex) || []
  return matches.map(m => m.slice(1))
}
