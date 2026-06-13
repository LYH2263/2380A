export const useCommentUtils = () => {
  const parseMentions = (content: string): { users: string[], content: string } => {
    const mentionRegex = /@(\w{2,20})/g
    const matches = content.match(mentionRegex) || []
    const users = matches.map(m => m.slice(1))
    return { users, content }
  }

  const renderContentWithMentions = (content: string): string => {
    return content.replace(
      /@(\w{2,20})/g,
      '<a class="text-neuro-primary hover:underline font-medium" href="/user/$1">@$1</a>'
    )
  }

  const canEditComment = (createdAt: string): boolean => {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return now - created < fiveMinutes
  }

  const extractMentionsFromContent = (content: string): string[] => {
    const mentionRegex = /@(\w{2,20})/g
    const matches = content.match(mentionRegex) || []
    return matches.map(m => m.slice(1))
  }

  return {
    parseMentions,
    renderContentWithMentions,
    canEditComment,
    extractMentionsFromContent
  }
}
