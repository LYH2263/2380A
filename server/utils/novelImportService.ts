import prisma from './prisma'
import storage from './storage'
import taskManager from './taskManager'
import excelUtils, { ColumnDef, ImportResult } from './excel'

export const novelImportColumns: ColumnDef[] = [
  { key: 'title', label: '标题', required: true, type: 'string', maxLength: 255 },
  { key: 'description', label: '简介', required: true, type: 'string' },
  { key: 'author', label: '作者', required: true, type: 'string', maxLength: 100 },
  { key: 'cover', label: '封面URL', type: 'string', maxLength: 500 },
  { key: 'status', label: '状态', type: 'enum', enumValues: ['ONGOING', 'COMPLETED', 'HIATUS'], defaultValue: 'ONGOING' },
  { key: 'tags', label: '标签', type: 'string' },
  { key: 'isFeatured', label: '是否推荐', type: 'boolean', defaultValue: false },
  { key: 'viewCount', label: '浏览量', type: 'number', defaultValue: 0 }
]

export interface NovelImportRow {
  title: string
  description: string
  author: string
  cover?: string
  status?: string
  tags?: string
  isFeatured?: boolean
  viewCount?: number
}

export interface ImportReport {
  totalRows: number
  validRows: number
  createdRows: number
  updatedRows: number
  failedRows: number
  validationErrors: { row: number; column: string; message: string }[]
  importErrors: { row: number; title: string; message: string }[]
  createdIds: number[]
  updatedIds: number[]
  skippedTitles: string[]
}

const CHUNK_SIZE = 100

export const novelImportService = {
  async createImportTask(buffer: Buffer, adminId: number, originalName: string): Promise<number> {
    const fileName = storage.generateFileName(`novel_import`, originalName.split('.').pop() || 'xlsx')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    storage.saveImport(fileName, buffer)

    const task = await taskManager.createTask('ADMIN_NOVEL_IMPORT', {
      adminId,
      fileName: originalName,
      expiresAt
    })

    setImmediate(() => this.executeImport(task.id, buffer))

    return task.id
  },

  async executeImport(taskId: number, buffer: Buffer) {
    try {
      await taskManager.updateTask(taskId, { status: 'PROCESSING', progress: 5 })

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      const parsed = excelUtils.processImport(buffer, novelImportColumns)
      await taskManager.updateTask(taskId, { progress: 20, totalItems: parsed.totalRows })

      if (!parsed.success && parsed.errors.length > 0 && parsed.data.length === 0) {
        await taskManager.updateTask(taskId, {
          status: 'FAILED',
          result: { report: { validationErrors: parsed.errors } } as any,
          errorMessage: '文件格式校验失败'
        })
        return
      }

      const report: ImportReport = {
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        createdRows: 0,
        updatedRows: 0,
        failedRows: parsed.errorRows,
        validationErrors: parsed.errors,
        importErrors: [],
        createdIds: [],
        updatedIds: [],
        skippedTitles: []
      }

      let processed = 0
      const total = parsed.data.length

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        if (taskManager.isCancelled(taskId)) break

        const chunk = parsed.data.slice(i, i + CHUNK_SIZE)
        const chunkResults = await this.importChunk(chunk, report, i + 1)

        processed += chunk.length
        const progress = 20 + Math.round((processed / Math.max(total, 1)) * 75)
        await taskManager.updateTask(taskId, { processedItems: processed, progress })
        await taskManager.yieldToEventLoop()
      }

      await taskManager.updateTask(taskId, { progress: 100 })

      await taskManager.updateTask(taskId, {
        status: 'COMPLETED',
        progress: 100,
        result: { report } as any
      })

    } catch (err: any) {
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: err.message || '导入失败'
      })
    }
  },

  async importChunk(data: NovelImportRow[], report: ImportReport, startIdx: number): Promise<void> {
    for (let j = 0; j < data.length; j++) {
      const row = data[j]
      const excelRow = startIdx + j + 1

      try {
        let authorUser = await prisma.user.findFirst({
          where: { username: { equals: row.author, mode: 'insensitive' } }
        })

        if (!authorUser) {
          authorUser = await prisma.user.create({
            data: {
              username: row.author,
              email: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@imported.local`,
              password: '$2a$10$placeholder',
              role: 'USER',
              bio: '通过批量导入系统创建的作者账号'
            }
          })
        }

        const tags = row.tags
          ? row.tags.split(/[,，、;；]/).map((t: string) => t.trim()).filter(Boolean)
          : []

        const existing = await prisma.novel.findFirst({
          where: {
            title: { equals: row.title, mode: 'insensitive' },
            authorId: authorUser.id
          }
        })

        if (existing) {
          const updated = await prisma.novel.update({
            where: { id: existing.id },
            data: {
              description: row.description,
              cover: row.cover || existing.cover,
              status: (row.status as any) || existing.status,
              tags: tags.length > 0 ? tags : existing.tags,
              isFeatured: row.isFeatured !== undefined ? row.isFeatured : existing.isFeatured,
              viewCount: row.viewCount !== undefined ? row.viewCount : existing.viewCount
            }
          })
          report.updatedRows++
          report.updatedIds.push(updated.id)
        } else {
          const created = await prisma.novel.create({
            data: {
              title: row.title,
              description: row.description,
              authorId: authorUser.id,
              cover: row.cover || null,
              status: (row.status as any) || 'ONGOING',
              tags,
              isFeatured: row.isFeatured || false,
              viewCount: row.viewCount || 0
            }
          })
          report.createdRows++
          report.createdIds.push(created.id)
        }
      } catch (err: any) {
        report.failedRows++
        report.importErrors.push({
          row: excelRow,
          title: row.title,
          message: err.message || '未知错误'
        })
      }
    }
  },

  validateFile(buffer: Buffer): ImportResult {
    return excelUtils.processImport(buffer, novelImportColumns)
  },

  getTemplateBuffer(): Buffer {
    return excelUtils.generateTemplate(novelImportColumns, '小说导入模板')
  }
}

export default novelImportService
