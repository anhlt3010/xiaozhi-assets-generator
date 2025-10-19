/**
 * BrowserFontConverter - Trình chuyển đổi phông chữ đầy đủ cho trình duyệt
 * Dựa trên logic lõi của lv_font_conv, thích ứng cho môi trường trình duyệt
 */

import opentype from 'opentype.js'
import collect_font_data from './CollectFontData.js'
import AppError from './AppError.js'
import write_cbin from './writers/CBinWriter.js'

class BrowserFontConverter {
  constructor() {
    this.initialized = false
    this.supportedFormats = ['ttf', 'woff', 'woff2', 'otf']
    this.charsetCache = new Map() // 缓存已加载的字符集
  }

  /**
   * Khởi tạo bộ chuyển đổi
   */
  async initialize() {
    if (this.initialized) return
    
    try {
      // Kiểm tra các phụ thuộc có sẵn
      if (typeof opentype === 'undefined') {
        throw new Error('opentype.js chưa được nạp')
      }
      
      this.initialized = true
  console.log('BrowserFontConverter khởi tạo hoàn tất')
    } catch (error) {
      console.error('BrowserFontConverter 初始化失败:', error)
      throw error
    }
  }

  /**
   * Xác thực tệp phông chữ
   */
  validateFont(fontFile) {
    if (!fontFile) return false
    
    if (fontFile instanceof File) {
      const fileName = fontFile.name.toLowerCase()
      const fileType = fontFile.type.toLowerCase()
      
      const validExtension = this.supportedFormats.some(ext => 
        fileName.endsWith(`.${ext}`)
      )
      
  const validMimeType = [
        'font/ttf', 'font/truetype', 'application/x-font-ttf',
        'font/woff', 'font/woff2', 'application/font-woff',
        'font/otf', 'application/x-font-otf'
      ].some(type => fileType.includes(type))
      
      return validExtension || validMimeType
    }
    
  return fontFile instanceof ArrayBuffer && fontFile.byteLength > 0
  }

  /**
   * Lấy thông tin phông chữ
   */
  async getFontInfo(fontFile) {
    try {
      let buffer
      
      if (fontFile instanceof File) {
        buffer = await fontFile.arrayBuffer()
      } else if (fontFile instanceof ArrayBuffer) {
        buffer = fontFile
      } else {
        throw new Error('不支持的字体文件类型')
      }
      
      const font = opentype.parse(buffer)

      return {
        familyName: this.getLocalizedName(font.names.fontFamily) || 'Unknown',
        fullName: this.getLocalizedName(font.names.fullName) || 'Unknown',
        postScriptName: this.getLocalizedName(font.names.postScriptName) || 'Unknown',
        version: this.getLocalizedName(font.names.version) || 'Unknown',
        unitsPerEm: font.unitsPerEm,
        ascender: font.ascender,
        descender: font.descender,
        numGlyphs: font.numGlyphs,
        supported: true
      }
    } catch (error) {
      console.error('Lấy thông tin phông chữ thất bại:', error)
      return {
        familyName: 'Unknown',
        supported: false,
        error: error.message
      }
    }
  }

  /**
   * Lấy tên bản địa hóa
   */
  getLocalizedName(nameObj) {
    if (!nameObj) return null
    
    // 优先级：中文 > 英文 > 第一个可用的
    return nameObj['zh'] || nameObj['zh-CN'] || nameObj['en'] || 
           nameObj[Object.keys(nameObj)[0]]
  }

  /**
   * Chuyển đổi phông chữ sang định dạng CBIN
   */
  async convertToCBIN(options) {
    if (!this.initialized) {
      await this.initialize()
    }

    const {
      fontFile,
      fontName,
      fontSize = 20,
      bpp = 4,
      charset = 'deepseek',
      symbols = '',
      range = '',
      compression = false,
      lcd = false,
      lcd_v = false,
      progressCallback = null
    } = options

    if (!this.validateFont(fontFile)) {
      throw new AppError('Định dạng tệp phông chữ không được hỗ trợ')
    }

    try {
  if (progressCallback) progressCallback(0, 'Bắt đầu xử lý phông chữ...')

      // 准备字体数据
      let fontBuffer
      if (fontFile instanceof File) {
        fontBuffer = await fontFile.arrayBuffer()
      } else {
        fontBuffer = fontFile
      }

  if (progressCallback) progressCallback(10, 'Phân tích cấu trúc phông chữ...')

      // 构建字符范围和符号（使用异步版本支持从文件加载字符集）
      const { ranges, charSymbols } = await this.parseCharacterInputAsync(charset, symbols, range)

  if (progressCallback) progressCallback(20, 'Chuẩn bị tham số chuyển đổi...')

      // 构建转换参数
      const convertArgs = {
        font: [{
          source_path: fontName || 'custom_font',
          source_bin: fontBuffer,
          ranges: [{ 
            range: ranges, 
            symbols: charSymbols 
          }],
          autohint_off: false,
          autohint_strong: false
        }],
        size: fontSize,
        bpp: bpp,
        lcd: lcd,
        lcd_v: lcd_v,
        no_compress: !compression,
        no_kerning: false,
        use_color_info: false,
        format: 'cbin',
        output: fontName || 'font'
      }

  if (progressCallback) progressCallback(30, 'Thu thập dữ liệu phông chữ...')

      // 收集字体数据
      const fontData = await collect_font_data(convertArgs)

  if (progressCallback) progressCallback(70, 'Tạo dữ liệu CBIN...')

      // 生成 CBIN 数据
      const result = write_cbin(convertArgs, fontData)
      const outputName = convertArgs.output
      
  if (progressCallback) progressCallback(100, 'Chuyển đổi hoàn tất!')

      return result[outputName]

    } catch (error) {
      console.error('Chuyển đổi phông chữ thất bại:', error)
      throw new AppError(`Chuyển đổi phông chữ thất bại: ${error.message}`)
    }
  }

  /**
   * Phân tích input ký tự (charset, symbols, range) - phiên bản bất đồng bộ
   */
  async parseCharacterInputAsync(charset, symbols, range) {
    let ranges = []
    let charSymbols = symbols || ''

    // 处理预设字符集
    if (charset && charset !== 'custom') {
      const presetChars = await this.getCharsetContentAsync(charset)
      charSymbols = presetChars + charSymbols
    }

    // 处理 Unicode 范围
    if (range) {
      ranges = this.parseUnicodeRange(range)
    }

    return { ranges, charSymbols }
  }

  /**
   * Phân tích input ký tự (charset, symbols, range) - phiên bản đồng bộ (tương thích)
   */
  parseCharacterInput(charset, symbols, range) {
    let ranges = []
    let charSymbols = symbols || ''

    // 处理预设字符集
    if (charset && charset !== 'custom') {
      const presetChars = this.getCharsetContent(charset)
      charSymbols = presetChars + charSymbols
    }

    // 处理 Unicode 范围
    if (range) {
      ranges = this.parseUnicodeRange(range)
    }

    return { ranges, charSymbols }
  }


  /**
   * Tải file charset bất đồng bộ
   */
  async loadCharsetFromFile(charset) {
    const charsetFiles = {
      latin: './static/charsets/latin1.txt',
      deepseek: './static/charsets/deepseek.txt',
      gb2312: './static/charsets/gb2312.txt'
    }
    
    const filePath = charsetFiles[charset]
    if (!filePath) {
      return null
    }
    
    try {
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`Failed to load charset file: ${response.status}`)
      }
      
  const text = await response.text()
  // Nối các ký tự trên mỗi dòng thành một chuỗi, giữ lại tất cả ký tự (kể cả khoảng trắng)
  const characters = text.split('\n').join('')
      
  // Lưu vào cache
  this.charsetCache.set(charset, characters)
      return characters
    } catch (error) {
  console.error(`Tải charset ${charset} thất bại:`, error)
      return null
    }
  }

  /**
   * Lấy nội dung charset (đồng bộ, dùng cho charset đã cache)
   */
  getCharsetContent(charset) {
    const charsets = {}
    
    // 如果是需要从文件加载的字符集，先检查缓存
    if ((charset === 'latin' || charset === 'deepseek' || charset === 'gb2312') && this.charsetCache.has(charset)) {
      return this.charsetCache.get(charset)
    }
    
  // Nếu yêu cầu 'basic', chuyển sang 'latin' (tương thích)
    if (charset === 'basic') {
      return this.getCharsetContent('latin')
    }
    
  // Mặc định trả về chuỗi rỗng, cần gọi phương thức bất đồng bộ để tải trước
    return charsets[charset] || ''
  }

  /**
   * Lấy nội dung charset bất đồng bộ
   */
  async getCharsetContentAsync(charset) {
    // 如果请求 basic，重定向到 latin（向后兼容）
    if (charset === 'basic') {
      charset = 'latin'
    }
    
  // Nếu charset đã được cache, trả về ngay
    if (this.charsetCache.has(charset)) {
      return this.charsetCache.get(charset)
    }
    
  // Với các charset cần tải từ file
    if (charset === 'latin' || charset === 'deepseek' || charset === 'gb2312') {
      const loadedCharset = await this.loadCharsetFromFile(charset)
      if (loadedCharset) {
        return loadedCharset
      }
    }
    
    // 回退到同步方法
    return this.getCharsetContent(charset)
  }

  /**
   * Phân tích chuỗi phạm vi Unicode
   */
  parseUnicodeRange(rangeStr) {
    const ranges = []
    const parts = rangeStr.split(',')
    
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-')
        const startCode = this.parseHexOrDec(start)
        const endCode = this.parseHexOrDec(end)

        if (startCode !== null && endCode !== null) {
          ranges.push(startCode, endCode, startCode)
        }
      } else {
        const code = this.parseHexOrDec(trimmed)
        if (code !== null) {
          ranges.push(code, code, code)
        }
      }
    }
    
    return ranges
  }

  /**
   * Phân tích số thập lục phân hoặc thập phân
   */
  parseHexOrDec(str) {
    const trimmed = str.trim()
    
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      const parsed = parseInt(trimmed, 16)
      return isNaN(parsed) ? null : parsed
    }
    
    const parsed = parseInt(trimmed, 10)
    return isNaN(parsed) ? null : parsed
  }

  /**
   * Ước lượng kích thước đầu ra - phiên bản bất đồng bộ
   */
  async estimateSizeAsync(options) {
    const { fontSize = 20, bpp = 4, charset = 'latin', symbols = '', range = '' } = options
    
  // Tính số lượng ký tự
    let charCount = symbols.length
    
    if (charset && charset !== 'custom') {
      const charsetContent = await this.getCharsetContentAsync(charset)
      charCount += charsetContent.length
    }
    
    if (range) {
      const ranges = this.parseUnicodeRange(range)
      for (let i = 0; i < ranges.length; i += 3) {
        charCount += ranges[i + 1] - ranges[i] + 1
      }
    }
    
  // Loại trùng ký tự (ước lượng thô)
    charCount = Math.min(charCount, charCount * 0.8)
    
  // Ước tính số byte trung bình cho mỗi ký tự
    const avgBytesPerChar = Math.ceil((fontSize * fontSize * bpp) / 8) + 40
    
    const estimatedSize = charCount * avgBytesPerChar + 2048 // 加上头部和索引
    
    return {
      characterCount: Math.floor(charCount),
      avgBytesPerChar,
      estimatedSize,
      formattedSize: this.formatBytes(estimatedSize)
    }
  }

  /**
   * Ước lượng kích thước đầu ra - phiên bản đồng bộ (tương thích)
   */
  estimateSize(options) {
    const { fontSize = 20, bpp = 4, charset = 'latin', symbols = '', range = '' } = options
    
  // Tính số lượng ký tự
    let charCount = symbols.length
    
    if (charset && charset !== 'custom') {
      const charsetContent = this.getCharsetContent(charset)
      charCount += charsetContent.length
    }
    
    if (range) {
      const ranges = this.parseUnicodeRange(range)
      for (let i = 0; i < ranges.length; i += 3) {
        charCount += ranges[i + 1] - ranges[i] + 1
      }
    }
    
  // Loại trùng ký tự (ước lượng thô)
    charCount = Math.min(charCount, charCount * 0.8)
    
  // Ước tính số byte trung bình cho mỗi ký tự
    const avgBytesPerChar = Math.ceil((fontSize * fontSize * bpp) / 8) + 40
    
    const estimatedSize = charCount * avgBytesPerChar + 2048 // 加上头部和索引
    
    return {
      characterCount: Math.floor(charCount),
      avgBytesPerChar,
      estimatedSize,
      formattedSize: this.formatBytes(estimatedSize)
    }
  }

  /**
   * Định dạng kích thước byte
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Dọn dẹp tài nguyên
   */
  cleanup() {
    // 清理可能的资源引用
    // Dọn các tham chiếu tài nguyên có thể có
    this.initialized = false
  }
}

// Tạo thể hiện đơn lẻ
const browserFontConverter = new BrowserFontConverter()

export default browserFontConverter
export { BrowserFontConverter }
