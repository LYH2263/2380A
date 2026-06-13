import prisma from './prisma'
import crypto from 'crypto'
import type { ShareType } from '@prisma/client'

export interface ShareBookshelfData {
  type: 'BOOKSHELF'
  userId: number
  username: string
  books: Array<{
    id: number
    title: string
    cover: string | null
    author: string
    status: string
    readingStatus: string
    progress: number
    addedAt: string
  }>
  totalBooks: number
  createdAt: string
}

export interface ShareBooklistData {
  type: 'BOOKLIST'
  bookListId: number
  name: string
  description: string | null
  userId: number
  username: string
  books: Array<{
    id: number
    title: string
    cover: string | null
    author: string
    status: string
    addedAt: string
  }>
  totalBooks: number
  createdAt: string
}

export const shareService = {
  generateToken(): string {
    return crypto.randomBytes(16).toString('base64url')
  },

  async createBookshelfShare(
    userId: number,
    expiresInDays?: number
  ): Promise<{ token: string; shareUrl: string; coverImage?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    })
    if (!user) throw new Error('用户不存在')

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        novel: {
          include: { author: { select: { username: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const data: ShareBookshelfData = {
      type: 'BOOKSHELF',
      userId: user.id,
      username: user.username,
      books: favorites.map(f => ({
        id: f.novel.id,
        title: f.novel.title,
        cover: f.novel.cover,
        author: f.novel.author?.username || '未知',
        status: f.novel.status,
        readingStatus: f.readingStatus,
        progress: f.progress,
        addedAt: f.createdAt.toISOString()
      })),
      totalBooks: favorites.length,
      createdAt: new Date().toISOString()
    }

    const token = this.generateToken()
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined

    await prisma.shareLink.create({
      data: {
        token,
        type: 'BOOKSHELF',
        userId: user.id,
        title: `${user.username} 的书架`,
        description: `共 ${favorites.length} 本收藏小说`,
        data: JSON.stringify(data),
        expiresAt
      }
    })

    return {
      token,
      shareUrl: `/s/${token}`,
      coverImage: favorites[0]?.novel.cover || undefined
    }
  },

  async createBooklistShare(
    userId: number,
    bookListId: number,
    expiresInDays?: number
  ): Promise<{ token: string; shareUrl: string; coverImage?: string }> {
    const bookList = await prisma.bookList.findUnique({
      where: { id: bookListId },
      include: {
        user: { select: { id: true, username: true } },
        items: {
          include: {
            favorite: {
              include: {
                novel: {
                  include: { author: { select: { username: true } } }
                }
              }
            }
          },
          orderBy: { addedAt: 'desc' },
          take: 100
        }
      }
    })

    if (!bookList) throw new Error('书单不存在')
    if (bookList.userId !== userId) throw new Error('无权分享此书单')

    const data: ShareBooklistData = {
      type: 'BOOKLIST',
      bookListId: bookList.id,
      name: bookList.name,
      description: bookList.description,
      userId: bookList.user.id,
      username: bookList.user.username,
      books: bookList.items.map(item => ({
        id: item.favorite.novel.id,
        title: item.favorite.novel.title,
        cover: item.favorite.novel.cover,
        author: item.favorite.novel.author?.username || '未知',
        status: item.favorite.novel.status,
        addedAt: item.addedAt.toISOString()
      })),
      totalBooks: bookList.items.length,
      createdAt: new Date().toISOString()
    }

    const token = this.generateToken()
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined

    await prisma.shareLink.create({
      data: {
        token,
        type: 'BOOKLIST',
        userId: userId,
        bookListId: bookList.id,
        title: bookList.name,
        description: bookList.description,
        data: JSON.stringify(data),
        expiresAt
      }
    })

    return {
      token,
      shareUrl: `/s/${token}`,
      coverImage: bookList.items[0]?.favorite.novel.cover || undefined
    }
  },

  async getShare(token: string): Promise<ShareBookshelfData | ShareBooklistData | null> {
    const share = await prisma.shareLink.findUnique({ where: { token } })
    if (!share) return null

    if (share.isExpired) return null
    if (share.expiresAt && share.expiresAt < new Date()) {
      await prisma.shareLink.update({
        where: { id: share.id },
        data: { isExpired: true }
      })
      return null
    }

    await prisma.shareLink.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } }
    })

    return JSON.parse(share.data)
  },

  async expireShare(userId: number, token: string): Promise<boolean> {
    const share = await prisma.shareLink.findUnique({ where: { token } })
    if (!share || share.userId !== userId) return false

    await prisma.shareLink.update({
      where: { id: share.id },
      data: { isExpired: true }
    })
    return true
  },

  async listUserShares(userId: number, page: number = 1, pageSize: number = 20) {
    const [shares, total] = await Promise.all([
      prisma.shareLink.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.shareLink.count({ where: { userId } })
    ])
    return { shares, total, page, pageSize }
  },

  async deleteShare(userId: number, shareId: number): Promise<boolean> {
    const share = await prisma.shareLink.findUnique({ where: { id: shareId } })
    if (!share || share.userId !== userId) return false
    await prisma.shareLink.delete({ where: { id: shareId } })
    return true
  }
}

export default shareService
