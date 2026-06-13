import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage')
const EXPORT_DIR = path.join(STORAGE_ROOT, 'exports')
const IMPORT_DIR = path.join(STORAGE_ROOT, 'imports')
const BACKUP_DIR = path.join(STORAGE_ROOT, 'backups')
const SHARE_DIR = path.join(STORAGE_ROOT, 'shares')

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

ensureDir(STORAGE_ROOT)
ensureDir(EXPORT_DIR)
ensureDir(IMPORT_DIR)
ensureDir(BACKUP_DIR)
ensureDir(SHARE_DIR)

export const storage = {
  getExportPath() { return EXPORT_DIR },
  getImportPath() { return IMPORT_DIR },
  getBackupPath() { return BACKUP_DIR },
  getSharePath() { return SHARE_DIR },

  saveExport(fileName: string, data: Buffer | string): { filePath: string; fileSize: number } {
    ensureDir(EXPORT_DIR)
    const filePath = path.join(EXPORT_DIR, fileName)
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
    fs.writeFileSync(filePath, buffer)
    return { filePath, fileSize: buffer.length }
  },

  saveImport(fileName: string, data: Buffer): { filePath: string; fileSize: number } {
    ensureDir(IMPORT_DIR)
    const filePath = path.join(IMPORT_DIR, fileName)
    fs.writeFileSync(filePath, data)
    return { filePath, fileSize: data.length }
  },

  saveBackup(fileName: string, data: Buffer): { filePath: string; fileSize: number } {
    ensureDir(BACKUP_DIR)
    const filePath = path.join(BACKUP_DIR, fileName)
    fs.writeFileSync(filePath, data)
    return { filePath, fileSize: data.length }
  },

  saveShare(fileName: string, data: Buffer): { filePath: string; fileSize: number } {
    ensureDir(SHARE_DIR)
    const filePath = path.join(SHARE_DIR, fileName)
    fs.writeFileSync(filePath, data)
    return { filePath, fileSize: data.length }
  },

  readFile(filePath: string): Buffer {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(STORAGE_ROOT, filePath)
    return fs.readFileSync(absolutePath)
  },

  readFileAsStream(filePath: string) {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(STORAGE_ROOT, filePath)
    return fs.createReadStream(absolutePath)
  },

  fileExists(filePath: string): boolean {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(STORAGE_ROOT, filePath)
    return fs.existsSync(absolutePath)
  },

  deleteFile(filePath: string): boolean {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(STORAGE_ROOT, filePath)
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
        return true
      }
      return false
    } catch {
      return false
    }
  },

  getFileInfo(filePath: string): { size: number; createdAt: Date } | null {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(STORAGE_ROOT, filePath)
      const stat = fs.statSync(absolutePath)
      return { size: stat.size, createdAt: stat.birthtime }
    } catch {
      return null
    }
  },

  computeChecksum(filePath: string, algorithm: string = 'md5'): string {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(STORAGE_ROOT, filePath)
    const fileBuffer = fs.readFileSync(absolutePath)
    return crypto.createHash(algorithm).update(fileBuffer).digest('hex')
  },

  generateFileName(prefix: string, ext: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    return `${prefix}_${timestamp}_${random}.${ext}`
  },

  getRelativePath(absolutePath: string): string {
    return path.relative(STORAGE_ROOT, absolutePath)
  },

  getAbsolutePath(relativePath: string): string {
    return path.join(STORAGE_ROOT, relativePath)
  },

  cleanupExpired(): string[] {
    const removed: string[] = []
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000

    for (const dir of [EXPORT_DIR, IMPORT_DIR]) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const filePath = path.join(dir, file)
          try {
            const stat = fs.statSync(filePath)
            if (now - stat.birthtime.getTime() > maxAge) {
              fs.unlinkSync(filePath)
              removed.push(filePath)
            }
          } catch {}
        }
      }
    }

    return removed
  }
}

export default storage
