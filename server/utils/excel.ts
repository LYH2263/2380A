import * as XLSX from 'xlsx'

export interface ColumnDef {
  key: string
  label: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  enumValues?: string[]
  maxLength?: number
  defaultValue?: any
}

export interface ValidationError {
  row: number
  column: string
  message: string
  value?: any
}

export interface ImportResult<T = any> {
  success: boolean
  data: T[]
  errors: ValidationError[]
  totalRows: number
  validRows: number
  errorRows: number
}

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any, row: any) => any
}

export const excelUtils = {
  parseBuffer(buffer: Buffer): any[][] {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheet = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheet]
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null })
  },

  validateHeaders(headers: string[], requiredColumns: ColumnDef[]): { valid: boolean; missing: string[]; mapping: Record<string, number> } {
    const mapping: Record<string, number> = {}
    const missing: string[] = []

    const headerLower = headers.map(h => h?.toString().trim().toLowerCase() ?? '')

    for (const col of requiredColumns) {
      const idx = headerLower.indexOf(col.label.toLowerCase())
      if (idx === -1) {
        if (col.required) {
          missing.push(col.label)
        }
      } else {
        mapping[col.key] = idx
      }
    }

    return { valid: missing.length === 0, missing, mapping }
  },

  validateAndParseRows(rows: any[][], mapping: Record<string, number>, columns: ColumnDef[]): ImportResult {
    const errors: ValidationError[] = []
    const data: Record<string, any>[] = []
    let validRows = 0

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx]
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue
      }

      const rowData: Record<string, any> = {}
      let rowHasError = false

      for (const col of columns) {
        const colIdx = mapping[col.key]
        let value = colIdx !== undefined ? row[colIdx] : undefined

        if (value === null || value === undefined || value === '') {
          if (col.required && col.defaultValue === undefined) {
            errors.push({
              row: rowIdx + 2,
              column: col.label,
              message: `缺少必填值`,
              value
            })
            rowHasError = true
            continue
          }
          value = col.defaultValue
        }

        if (value !== undefined && value !== null) {
          switch (col.type) {
            case 'number': {
              const num = Number(value)
              if (isNaN(num)) {
                errors.push({
                  row: rowIdx + 2,
                  column: col.label,
                  message: `值不是有效数字`,
                  value
                })
                rowHasError = true
              } else {
                value = num
              }
              break
            }
            case 'boolean': {
              const strVal = String(value).toLowerCase().trim()
              if (['true', '1', '是', 'yes'].includes(strVal)) value = true
              else if (['false', '0', '否', 'no'].includes(strVal)) value = false
              else {
                errors.push({
                  row: rowIdx + 2,
                  column: col.label,
                  message: `值不是有效布尔值（true/false）`,
                  value
                })
                rowHasError = true
              }
              break
            }
            case 'date': {
              if (value instanceof Date) {
                // keep
              } else {
                const parsed = new Date(value)
                if (isNaN(parsed.getTime())) {
                  errors.push({
                    row: rowIdx + 2,
                    column: col.label,
                    message: `值不是有效日期`,
                    value
                  })
                  rowHasError = true
                } else {
                  value = parsed
                }
              }
              break
            }
            case 'enum': {
              const strVal = String(value).trim().toUpperCase()
              if (col.enumValues && !col.enumValues.map(e => e.toUpperCase()).includes(strVal)) {
                errors.push({
                  row: rowIdx + 2,
                  column: col.label,
                  message: `值必须是: ${col.enumValues.join(', ')}`,
                  value
                })
                rowHasError = true
              } else {
                value = strVal
              }
              break
            }
            case 'string':
            default: {
              value = String(value).trim()
              if (col.maxLength && value.length > col.maxLength) {
                errors.push({
                  row: rowIdx + 2,
                  column: col.label,
                  message: `文本长度超过 ${col.maxLength} 字符`,
                  value
                })
                rowHasError = true
              }
              break
            }
          }
        }

        rowData[col.key] = value
      }

      if (!rowHasError) {
        data.push(rowData)
        validRows++
      }
    }

    return {
      success: errors.length === 0,
      data,
      errors,
      totalRows: rows.length,
      validRows,
      errorRows: rows.length - validRows
    }
  },

  processImport(buffer: Buffer, columns: ColumnDef[]): ImportResult {
    const rawData = this.parseBuffer(buffer)
    if (rawData.length === 0) {
      return { success: false, data: [], errors: [{ row: 0, column: '', message: '文件为空' }], totalRows: 0, validRows: 0, errorRows: 0 }
    }

    const headers = rawData[0].map(h => h?.toString() ?? '')
    const headerValidation = this.validateHeaders(headers, columns)

    if (!headerValidation.valid) {
      return {
        success: false,
        data: [],
        errors: headerValidation.missing.map(col => ({
          row: 1,
          column: col,
          message: `缺少必填列: ${col}`
        })),
        totalRows: 0,
        validRows: 0,
        errorRows: 0
      }
    }

    const dataRows = rawData.slice(1)
    return this.validateAndParseRows(dataRows, headerValidation.mapping, columns)
  },

  exportToExcel(rows: any[], columns: ExportColumn[], sheetName: string = 'Sheet1'): Buffer {
    const processedRows = rows.map(row => {
      const output: Record<string, any> = {}
      for (const col of columns) {
        const value = row[col.key]
        output[col.label] = col.format ? col.format(value, row) : value
      }
      return output
    })

    const worksheet = XLSX.utils.json_to_sheet(processedRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  },

  generateTemplate(columns: ColumnDef[], sheetName: string = 'Template'): Buffer {
    const headers = columns.map(col => {
      let label = col.label
      if (col.required) label += ' *'
      if (col.enumValues) label += ` (${col.enumValues.join('/')})`
      return label
    })

    const exampleRow = columns.map(col => {
      if (col.defaultValue !== undefined) return col.defaultValue
      switch (col.type) {
        case 'number': return 0
        case 'boolean': return 'true'
        case 'date': return new Date().toISOString().split('T')[0]
        case 'enum': return col.enumValues?.[0] ?? ''
        case 'string':
        default: return `示例${col.label}`
      }
    })

    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }
}

export default excelUtils
