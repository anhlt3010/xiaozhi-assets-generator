/**
 * Lớp AssetsBuilder
 * Dùng để xử lý và đóng gói file assets.bin cho chủ đề tùy chỉnh của XiaoZhi AI
 *
 * Chức năng chính:
 * - Xác thực và xử lý cấu hình
 * - Sinh nội dung index.json
 * - Quản lý file tài nguyên
 * - Tương tác với API phía máy chủ để tạo assets.bin
 * - Tích hợp chức năng chuyển đổi font trong trình duyệt
 */

import browserFontConverter from './font_conv/BrowserFontConverter.js'
import WakenetModelPacker from './WakenetModelPacker.js'
import SpiffsGenerator from './SpiffsGenerator.js'
import GifScaler from './GifScaler.js'
import configStorage from './ConfigStorage.js'

class AssetsBuilder {
  constructor() {
    this.config = null
    this.resources = new Map() // Lưu trữ các file tài nguyên
    this.tempFiles = [] // Danh sách file tạm
    this.fontConverterBrowser = browserFontConverter // Bộ chuyển đổi font chạy trong trình duyệt
    this.convertedFonts = new Map() // Cache các font đã chuyển đổi
    this.wakenetPacker = new WakenetModelPacker() // Trình đóng gói mô hình wakeword
    this.spiffsGenerator = new SpiffsGenerator() // Trình tạo SPIFFS
    this.gifScaler = new GifScaler({ 
      quality: 10, 
      debug: true,
      scalingMode: 'auto'  // Tự động chọn chế độ scale phù hợp
    }) // Bộ xử lý GIF
    this.configStorage = configStorage // Quản lý lưu trữ cấu hình
    this.autoSaveEnabled = true // Bật/tắt tự động lưu
  }

  /**
   * Thiết lập đối tượng cấu hình
   * @param {Object} config - Đối tượng cấu hình đầy đủ
   */
  setConfig(config, options = {}) {
    const strict = options?.strict ?? true
    if (strict && !this.validateConfig(config)) {
  throw new Error('Xác thực đối tượng cấu hình thất bại')
    }
    this.config = { ...config }
    return this
  }

  /**
   * Xác thực đối tượng cấu hình
   * @param {Object} config - Đối tượng cấu hình cần xác thực
   * @returns {boolean} Kết quả xác thực
   */
  validateConfig(config) {
    if (!config) return false
    
  // Xác thực cấu hình chip
    if (!config.chip?.model) {
      console.error('Thiếu cấu hình model chip')
      return false
    }

  // Xác thực cấu hình hiển thị
    const display = config.chip.display
    if (!display?.width || !display?.height) {
      console.error('Thiếu cấu hình độ phân giải hiển thị')
      return false
    }

  // Xác thực cấu hình font
    const font = config.theme?.font
    if (font?.type === 'preset' && !font.preset) {
      console.error('Cấu hình font preset chưa đầy đủ')
      return false
    }
    if (font?.type === 'custom' && !font.custom?.file) {
      console.error('Chưa cung cấp file font tùy chỉnh')
      return false
    }

    return true
  }

  /**
  * Thêm file tài nguyên
  * @param {string} key - Khóa tài nguyên
  * @param {File|Blob} file - Đối tượng file
  * @param {string} filename - Tên file
  * @param {string} resourceType - Loại tài nguyên (font, emoji, background)
   */
  addResource(key, file, filename, resourceType = 'other') {
    this.resources.set(key, {
      file,
      filename,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified || Date.now(),
      resourceType
    })

  // Tự động lưu file vào storage
  if (this.autoSaveEnabled && file instanceof File) {
      this.saveFileToStorage(key, file, resourceType).catch(error => {
    console.warn(`Tự động lưu file ${filename} thất bại:`, error)
      })
    }

    return this
  }

  /**
  * Lưu file vào storage
  * @param {string} key - Khóa tài nguyên
  * @param {File} file - Đối tượng file
  * @param {string} resourceType - Loại tài nguyên
  * @returns {Promise<void>}
   */
  async saveFileToStorage(key, file, resourceType) {
    try {
      await this.configStorage.saveFile(key, file, resourceType)
  console.log(`File ${file.name} đã được tự động lưu vào storage`)
    } catch (error) {
  console.error(`Lưu file vào storage thất bại: ${file.name}`, error)
      throw error
    }
  }

  /**
   * Khôi phục file tài nguyên từ storage
   * @param {string} key - Khóa tài nguyên
   * @returns {Promise<boolean>} Có khôi phục được hay không
   */
  async restoreResourceFromStorage(key) {
    try {
      const file = await this.configStorage.loadFile(key)
      if (file) {
        this.resources.set(key, {
          file,
          filename: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          resourceType: file.storedType,
          fromStorage: true
        })
        console.log(`Tài nguyên ${key} đã phục hồi thành công từ storage: ${file.name}`)
        return true
      }
      return false
    } catch (error) {
      console.error(`Khôi phục tài nguyên từ storage thất bại: ${key}`, error)
      return false
    }
  }

  /**
   * Khôi phục tất cả file tài nguyên liên quan từ storage
   * @param {Object} config - Đối tượng cấu hình
   * @returns {Promise<void>}
   */
  async restoreAllResourcesFromStorage(config) {
    if (!config) return

    const restoredFiles = []

  // Khôi phục font tùy chỉnh
    if (config.theme?.font?.type === 'custom' && config.theme.font.custom?.file === null) {
      const fontKey = 'custom_font'
      if (await this.restoreResourceFromStorage(fontKey)) {
        const resource = this.resources.get(fontKey)
        if (resource) {
          config.theme.font.custom.file = resource.file
      restoredFiles.push(`Font tùy chỉnh: ${resource.filename}`)
        }
      }
    }

  // Khôi phục ảnh emoji tùy chỉnh
    if (config.theme?.emoji?.type === 'custom' && config.theme.emoji.custom?.images) {
      for (const [emojiName, file] of Object.entries(config.theme.emoji.custom.images)) {
        if (file === null) {
          const emojiKey = `emoji_${emojiName}`
          if (await this.restoreResourceFromStorage(emojiKey)) {
            const resource = this.resources.get(emojiKey)
            if (resource) {
              config.theme.emoji.custom.images[emojiName] = resource.file
        restoredFiles.push(`Biểu cảm ${emojiName}: ${resource.filename}`)
            }
          }
        }
      }
    }

  // Khôi phục ảnh nền
    if (config.theme?.skin?.light?.backgroundType === 'image' && config.theme.skin.light.backgroundImage === null) {
      const bgKey = 'background_light'
      if (await this.restoreResourceFromStorage(bgKey)) {
        const resource = this.resources.get(bgKey)
        if (resource) {
          config.theme.skin.light.backgroundImage = resource.file
      restoredFiles.push(`Nền sáng: ${resource.filename}`)
        }
      }
    }
    
    if (config.theme?.skin?.dark?.backgroundType === 'image' && config.theme.skin.dark.backgroundImage === null) {
      const bgKey = 'background_dark'
      if (await this.restoreResourceFromStorage(bgKey)) {
        const resource = this.resources.get(bgKey)
        if (resource) {
          config.theme.skin.dark.backgroundImage = resource.file
      restoredFiles.push(`Nền tối: ${resource.filename}`)
        }
      }
    }

  // Khôi phục dữ liệu font đã chuyển đổi
    try {
      const fontInfo = this.getFontInfo()
      if (fontInfo && fontInfo.type === 'custom') {
        const tempKey = `converted_font_${fontInfo.filename}`
        const tempData = await this.configStorage.loadTempData(tempKey)
        if (tempData) {
          this.convertedFonts.set(fontInfo.filename, tempData.data)
      console.log(`Dữ liệu font đã chuyển đổi đã phục hồi: ${fontInfo.filename}`)
        }
      }
    } catch (error) {
    console.warn('Lỗi khi khôi phục dữ liệu font đã chuyển đổi:', error)
    }

    if (restoredFiles.length > 0) {
    console.log('Các file đã được khôi phục từ storage:', restoredFiles)
    }
  }

  /**
   * Lấy thông tin mô hình wakeword
   * @returns {Object|null} Thông tin mô hình wakeword
   */
  getWakewordModelInfo() {
    if (!this.config || !this.config.chip || !this.config.theme) {
      return null
    }
    
    const chipModel = this.config.chip.model
    const wakeword = this.config.theme.wakeword
    
    if (!wakeword) return null

  // Xác định kiểu mô hình wakeword theo model chip
    const isC3OrC6 = chipModel === 'esp32c3' || chipModel === 'esp32c6'
    const modelType = isC3OrC6 ? 'WakeNet9s' : 'WakeNet9'
    
    return {
      name: wakeword,
      type: modelType,
      filename: 'srmodels.bin'
    }
  }

  /**
   * Lấy thông tin font
   * @returns {Object|null} Thông tin font
   */
  getFontInfo() {
    if (!this.config || !this.config.theme || !this.config.theme.font) {
      return null
    }
    
    const font = this.config.theme.font
    
    if (font.type === 'preset') {
      return {
        type: 'preset',
        filename: `${font.preset}.bin`,
        source: font.preset
      }
    }
    
    if (font.type === 'custom' && font.custom.file) {
      const custom = font.custom
      const filename = `font_custom_${custom.size}_${custom.bpp}.bin`
      
      return {
        type: 'custom',
        filename,
        source: font.custom.file,
        config: {
          size: custom.size,
          bpp: custom.bpp,
          charset: custom.charset
        }
      }
    }
    
    return null
  }

  /**
   * Lấy thông tin bộ emoji
   * @returns {Array} Mảng thông tin emoji
   */
  getEmojiCollectionInfo() {
    if (!this.config || !this.config.theme || !this.config.theme.emoji) {
      return []
    }
    
    const emoji = this.config.theme.emoji
    const collection = []
    
    if (emoji.type === 'preset') {
  // Gói emoji preset
      const presetEmojis = [
        'neutral', 'happy', 'laughing', 'funny', 'sad', 'angry', 'crying',
        'loving', 'embarrassed', 'surprised', 'shocked', 'thinking', 'winking',
        'cool', 'relaxed', 'delicious', 'kissy', 'confident', 'sleepy', 'silly', 'confused'
      ]
      
      const size = emoji.preset === 'twemoji32' ? '32' : '64'
      presetEmojis.forEach(name => {
        collection.push({
          name,
          file: `${name}.png`,
          source: `preset:${emoji.preset}`,
          size: { width: parseInt(size), height: parseInt(size) }
        })
      })
    } else if (emoji.type === 'custom') {
      // Gói emoji tùy chỉnh
      const images = emoji.custom.images || {}
      const size = emoji.custom.size || { width: 64, height: 64 }
      
      Object.entries(images).forEach(([name, file]) => {
        if (file) {
              // Tạo tên file dựa trên phần mở rộng thực tế
          const fileExtension = file.name ? file.name.split('.').pop().toLowerCase() : 'png'
          collection.push({
            name,
            file: `${name}.${fileExtension}`,
            source: file,
            size: { ...size }
          })
        }
      })
      
      // Đảm bảo có ít nhất emoji 'neutral'
      if (!collection.find(item => item.name === 'neutral')) {
        console.warn('Cảnh báo: chưa cung cấp emoji neutral, sẽ dùng ảnh mặc định')
      }
    }
    
    return collection
  }

  /**
   * Lấy cấu hình skin
   * @returns {Object} Thông tin skin
   */
  getSkinInfo() {
    if (!this.config || !this.config.theme || !this.config.theme.skin) {
      return {}
    }
    
    const skin = this.config.theme.skin
    const result = {}
    
  // Xử lý chế độ sáng
    if (skin.light) {
      result.light = {
        text_color: skin.light.textColor || '#000000',
        background_color: skin.light.backgroundColor || '#ffffff'
      }
      
      if (skin.light.backgroundType === 'image' && skin.light.backgroundImage) {
        result.light.background_image = 'background_light.raw'
      }
    }
    
  // Xử lý chế độ tối
    if (skin.dark) {
      result.dark = {
        text_color: skin.dark.textColor || '#ffffff',
        background_color: skin.dark.backgroundColor || '#121212'
      }
      
      if (skin.dark.backgroundType === 'image' && skin.dark.backgroundImage) {
        result.dark.background_image = 'background_dark.raw'
      }
    }
    
    return result
  }

  /**
   * Sinh nội dung index.json
   * @returns {Object} Đối tượng index.json
   */
  generateIndexJson() {
    if (!this.config) {
  throw new Error('Đối tượng cấu hình chưa được thiết lập')
    }

    const indexData = {
      version: 1,
      chip_model: this.config.chip.model,
      display_config: {
        width: this.config.chip.display.width,
        height: this.config.chip.display.height,
        monochrome: false,
        color: this.config.chip.display.color || 'RGB565'
      }
    }

  // Thêm mô hình wakeword
    const wakewordInfo = this.getWakewordModelInfo()
    if (wakewordInfo) {
      indexData.srmodels = wakewordInfo.filename
    }

  // Thêm thông tin font
    const fontInfo = this.getFontInfo()
    if (fontInfo) {
      indexData.text_font = fontInfo.filename
    }

  // Thêm cấu hình skin
    const skinInfo = this.getSkinInfo()
    if (Object.keys(skinInfo).length > 0) {
      indexData.skin = skinInfo
    }

  // Thêm bộ emoji
    const emojiCollection = this.getEmojiCollectionInfo()
    if (emojiCollection.length > 0) {
      indexData.emoji_collection = emojiCollection.map(emoji => ({
        name: emoji.name,
        file: emoji.file
      }))
    }

    return indexData
  }

  /**
   * Chuẩn bị danh sách tài nguyên để đóng gói
   * @returns {Object} Danh sách tài nguyên
   */
  preparePackageResources() {
    const resources = {
      files: [],
      indexJson: this.generateIndexJson(),
      config: { ...this.config }
    }

  // Thêm mô hình wakeword
    const wakewordInfo = this.getWakewordModelInfo()
    if (wakewordInfo && wakewordInfo.name) {
      resources.files.push({
        type: 'wakeword',
        name: wakewordInfo.name,
        filename: wakewordInfo.filename,
        modelType: wakewordInfo.type
      })
    }

  // Thêm file font
    const fontInfo = this.getFontInfo()
    if (fontInfo) {
      resources.files.push({
        type: 'font',
        filename: fontInfo.filename,
        source: fontInfo.source,
        config: fontInfo.config || null
      })
    }

  // Thêm file emoji
    const emojiCollection = this.getEmojiCollectionInfo()
    emojiCollection.forEach(emoji => {
      resources.files.push({
        type: 'emoji',
        name: emoji.name,
        filename: emoji.file,
        source: emoji.source,
        size: emoji.size
      })
    })

  // Thêm ảnh nền
    const skin = this.config?.theme?.skin
    if (skin?.light?.backgroundType === 'image' && skin.light.backgroundImage) {
      resources.files.push({
        type: 'background',
        filename: 'background_light.raw',
        source: skin.light.backgroundImage,
        mode: 'light'
      })
    }
    if (skin?.dark?.backgroundType === 'image' && skin.dark.backgroundImage) {
      resources.files.push({
        type: 'background', 
        filename: 'background_dark.raw',
        source: skin.dark.backgroundImage,
        mode: 'dark'
      })
    }

    return resources
  }

  /**
   * Tiền xử lý font tùy chỉnh
   * @param {Function} progressCallback - callback tiến độ
   * @returns {Promise<void>}
   */
  async preprocessCustomFonts(progressCallback = null) {
    const fontInfo = this.getFontInfo()
    
    if (fontInfo && fontInfo.type === 'custom' && !this.convertedFonts.has(fontInfo.filename)) {
  if (progressCallback) progressCallback(20, 'Chuyển đổi font tùy chỉnh...')
      
      try {
        const convertOptions = {
          fontFile: fontInfo.source,
          fontName: fontInfo.filename.replace(/\.bin$/, ''),
          fontSize: fontInfo.config.size,
          bpp: fontInfo.config.bpp,
          charset: fontInfo.config.charset,
          symbols: fontInfo.config.symbols || '',
          range: fontInfo.config.range || '',
          compression: false,
          progressCallback: (progress, message) => {
            if (progressCallback) progressCallback(20 + progress * 0.2, `Chuyển đổi font: ${message}`)
          }
        }
        
        let convertedFont
        
  // Sử dụng bộ chuyển đổi font trong trình duyệt
        await this.fontConverterBrowser.initialize()
        convertedFont = await this.fontConverterBrowser.convertToCBIN(convertOptions)
        this.convertedFonts.set(fontInfo.filename, convertedFont)

    // Lưu font đã chuyển đổi vào storage tạm
        if (this.autoSaveEnabled) {
          const tempKey = `converted_font_${fontInfo.filename}`
          try {
            await this.configStorage.saveTempData(tempKey, convertedFont, 'converted_font', {
              filename: fontInfo.filename,
              size: fontInfo.config.size,
              bpp: fontInfo.config.bpp,
              charset: fontInfo.config.charset
            })
      console.log(`Font đã chuyển đổi đã được lưu vào storage: ${fontInfo.filename}`)
          } catch (error) {
      console.warn(`Lưu font đã chuyển đổi thất bại: ${fontInfo.filename}`, error)
          }
        }
      } catch (error) {
    console.error('Chuyển đổi font thất bại:', error)
    throw new Error(`Chuyển đổi font thất bại: ${error.message}`)
      }
    }
  }

  /**
  * Sinh assets.bin
  * @param {Function} progressCallback - callback tiến độ
  * @returns {Promise<Blob>} Blob của file assets.bin
   */
  async generateAssetsBin(progressCallback = null) {
    if (!this.config) {
      throw new Error('Đối tượng cấu hình chưa được thiết lập')
    }

    try {
  if (progressCallback) progressCallback(0, 'Bắt đầu tạo...')
      
  // Tiền xử lý font tùy chỉnh
      await this.preprocessCustomFonts(progressCallback)
      
      await new Promise(resolve => setTimeout(resolve, 100))
  if (progressCallback) progressCallback(40, 'Chuẩn bị file tài nguyên...')
      
      const resources = this.preparePackageResources()
      
  // Xóa trạng thái của generator
      this.wakenetPacker.clear()
      this.spiffsGenerator.clear()
      
  // Xử lý các file tài nguyên
      await this.processResourceFiles(resources, progressCallback)
      
      await new Promise(resolve => setTimeout(resolve, 100))
  if (progressCallback) progressCallback(90, 'Tạo file cuối cùng...')
      
  // Sinh file assets.bin cuối cùng
      const assetsBinData = await this.spiffsGenerator.generate((progress, message) => {
        if (progressCallback) {
          progressCallback(90 + progress * 0.1, message)
        }
      })
      
  if (progressCallback) progressCallback(100, 'Hoàn tất')
      
      return new Blob([assetsBinData], { type: 'application/octet-stream' })
      
    } catch (error) {
  console.error('Tạo assets.bin thất bại:', error)
      throw error
    }
  }

  /**
   * Tải xuống file assets.bin
   * @param {Blob} blob - dữ liệu file assets.bin
   * @param {string} filename - tên file khi tải
   */
  downloadAssetsBin(blob, filename = 'assets.bin') {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Lấy thông tin font (bao gồm chức năng chuyển đổi)
   * @param {File} fontFile - file font (tùy chọn)
   * @returns {Promise<Object>} Thông tin font
   */
  async getFontInfoWithDetails(fontFile = null) {
    try {
      const file = fontFile || this.config?.theme?.font?.custom?.file
      if (!file) return null
      
      let info
      
  // Sử dụng bộ chuyển đổi font trong trình duyệt
      await this.fontConverterBrowser.initialize()
      info = await this.fontConverterBrowser.getFontInfo(file)
      
      return {
        ...info,
        file: file,
        isCustom: true
      }
    } catch (error) {
      console.error('Lấy thông tin chi tiết font thất bại:', error)
      return null
    }
  }

  /**
   * Ước tính kích thước font
   * @param {Object} fontConfig - cấu hình font
   * @returns {Promise<Object>} Kết quả ước tính kích thước
   */
  async estimateFontSize(fontConfig = null) {
    try {
      const config = fontConfig || this.config?.theme?.font?.custom
      if (!config) return null
      
      const estimateOptions = {
        fontSize: config.size,
        bpp: config.bpp,
        charset: config.charset,
        symbols: config.symbols || '',
        range: config.range || ''
      }
      
      let sizeInfo
      
  // Sử dụng bộ chuyển đổi font trong trình duyệt
  sizeInfo = this.fontConverterBrowser.estimateSize(estimateOptions)
      
      return sizeInfo
    } catch (error) {
      console.error('Ước tính kích thước font thất bại:', error)
      return null
    }
  }

  /**
   * Xác thực cấu hình font tùy chỉnh
   * @param {Object} fontConfig - Cấu hình font
   * @returns {Object} Kết quả xác thực
   */
  validateCustomFont(fontConfig) {
    const errors = []
    const warnings = []
    
    if (!fontConfig.file) {
      errors.push('Thiếu file font')
    } else {
  // Sử dụng bộ chuyển đổi trên trình duyệt để kiểm tra
      const isValid = this.fontConverterBrowser.validateFont(fontConfig.file)
        
      if (!isValid) {
        errors.push('Định dạng file font không được hỗ trợ')
      }
    }
    
    if (fontConfig.size < 8 || fontConfig.size > 80) {
      errors.push('Kích thước font phải nằm trong khoảng 8-80')
    }
    
    if (![1, 2, 4, 8].includes(fontConfig.bpp)) {
      errors.push('BPP phải là 1, 2, 4 hoặc 8')
    }
    
    if (!fontConfig.charset && !fontConfig.symbols && !fontConfig.range) {
      warnings.push('Chưa chỉ định charset, symbols hoặc range; sẽ dùng charset mặc định')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }


  /**
   * Lấy trạng thái bộ chuyển đổi font
   * @returns {Object} Thông tin trạng thái bộ chuyển đổi
   */
  getConverterStatus() {
    return {
      initialized: this.fontConverterBrowser.initialized,
      supportedFormats: this.fontConverterBrowser.supportedFormats
    }
  }

  /**
   * Xử lý các file tài nguyên
   * @param {Object} resources - cấu hình tài nguyên
   * @param {Function} progressCallback - callback tiến độ
   */
  async processResourceFiles(resources, progressCallback = null) {
    let processedCount = 0
    const totalFiles = resources.files.length
    
  // Thêm file index.json
    const indexJsonData = new TextEncoder().encode(JSON.stringify(resources.indexJson, null, 2))
    // print json string
    console.log('index.json', resources.indexJson);
    this.spiffsGenerator.addFile('index.json', indexJsonData.buffer)
    
    for (const resource of resources.files) {
      const progressPercent = 40 + (processedCount / totalFiles) * 40
      if (progressCallback) {
        progressCallback(progressPercent, `Xử lý file: ${resource.filename}`)
      }
      
      try {
        await this.processResourceFile(resource)
        processedCount++
      } catch (error) {
        console.error(`Xử lý file tài nguyên thất bại: ${resource.filename}`, error)
        throw new Error(`Xử lý file tài nguyên thất bại: ${resource.filename} - ${error.message}`)
      }
    }
  }

  /**
   * Xử lý một file tài nguyên
   * @param {Object} resource - cấu hình tài nguyên
   */
  async processResourceFile(resource) {
    switch (resource.type) {
      case 'wakeword':
        await this.processWakewordModel(resource)
        break
      case 'font':
        await this.processFontFile(resource)
        break
      case 'emoji':
        await this.processEmojiFile(resource)
        break
      case 'background':
        await this.processBackgroundFile(resource)
        break
      default:
        console.warn(`Loại tài nguyên không xác định: ${resource.type}`)
    }
  }

  /**
   * Xử lý mô hình wakeword
   * @param {Object} resource - cấu hình tài nguyên
   */
  async processWakewordModel(resource) {
    const success = await this.wakenetPacker.loadModelFromShare(resource.name)
    if (!success) {
      throw new Error(`Tải mô hình wakeword thất bại: ${resource.name}`)
    }
    
    const srmodelsData = this.wakenetPacker.packModels()
    this.spiffsGenerator.addFile(resource.filename, srmodelsData)
  }

  /**
   * Xử lý file font
   * @param {Object} resource - cấu hình tài nguyên
   */
  async processFontFile(resource) {
    if (resource.config) {
  // Font tùy chỉnh: sử dụng dữ liệu đã chuyển đổi
      const convertedFont = this.convertedFonts.get(resource.filename)
      if (convertedFont) {
        this.spiffsGenerator.addFile(resource.filename, convertedFont)
      } else {
        throw new Error(`Không tìm thấy font đã chuyển đổi: ${resource.filename}`)
      }
    } else {
  // Font preset: tải từ static/fonts
      const fontData = await this.loadPresetFont(resource.source)
      this.spiffsGenerator.addFile(resource.filename, fontData)
    }
  }

  /**
   * Xử lý file emoji
   * @param {Object} resource - Cấu hình tài nguyên
   */
  async processEmojiFile(resource) {
  let imageData
  let needsScaling = false
  let imageFormat = 'png' // định dạng mặc định
    let isGif = false
    
    if (typeof resource.source === 'string' && resource.source.startsWith('preset:')) {
      // Emoji preset
      const presetName = resource.source.replace('preset:', '')
      imageData = await this.loadPresetEmoji(presetName, resource.name)
    } else {
      // Emoji tùy chỉnh
      const file = resource.source
      
  // Kiểm tra có phải GIF không
      isGif = this.isGifFile(file)
      
  // Lấy định dạng file
      const fileExtension = file.name.split('.').pop().toLowerCase()
      imageFormat = fileExtension
      
  // Kiểm tra kích thước thực tế của ảnh
      try {
        const actualDimensions = await this.getImageDimensions(file)
        const targetSize = resource.size || { width: 32, height: 32 }
        
  // Nếu kích thước thực tế vượt quá kích thước mục tiêu, cần scale
        if (actualDimensions.width > targetSize.width || 
            actualDimensions.height > targetSize.height) {
          needsScaling = true
          console.log(`Emoji ${resource.name} cần scale: ${actualDimensions.width}x${actualDimensions.height} -> ${targetSize.width}x${targetSize.height}`)
        }
      } catch (error) {
        console.warn(`Không thể lấy kích thước ảnh emoji: ${resource.name}`, error)
      }
      
      // Nếu không cần scale, đọc file trực tiếp
      if (!needsScaling) {
        imageData = await this.fileToArrayBuffer(file)
      }
    }
    
    // Nếu cần scale, chọn phương pháp theo loại file
    if (needsScaling) {
      try {
        const targetSize = resource.size || { width: 32, height: 32 }
        
        if (isGif) {
          // Dùng GifScaler để xử lý GIF
          console.log(`Dùng GifScaler xử lý GIF: ${resource.name}`)
          const scaledGifBlob = await this.gifScaler.scaleGif(resource.source, {
            maxWidth: targetSize.width,
            maxHeight: targetSize.height,
            keepAspectRatio: true
          })
          imageData = await this.fileToArrayBuffer(scaledGifBlob)
        } else {
          // Dùng phương pháp thông thường cho các định dạng ảnh khác
          imageData = await this.scaleImageToFit(resource.source, targetSize, imageFormat)
        }
      } catch (error) {
        console.error(`Scale ảnh emoji thất bại: ${resource.name}`, error)
        // Nếu scale thất bại thì dùng ảnh gốc
        imageData = await this.fileToArrayBuffer(resource.source)
      }
    }
    
    this.spiffsGenerator.addFile(resource.filename, imageData, {
      width: resource.size?.width || 0,
      height: resource.size?.height || 0
    })
  }

  /**
   * Xử lý file nền
   * @param {Object} resource - cấu hình tài nguyên
   */
  async processBackgroundFile(resource) {
    const imageData = await this.fileToArrayBuffer(resource.source)
    
    // 将图片转换为RGB565格式的原始数据
    const rawData = await this.convertImageToRgb565(imageData)
    this.spiffsGenerator.addFile(resource.filename, rawData)
  }

  /**
   * Tải font preset
   * @param {string} fontName - tên font
   * @returns {Promise<ArrayBuffer>} dữ liệu font
   */
  async loadPresetFont(fontName) {
    try {
      const response = await fetch(`./static/fonts/${fontName}.bin`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.arrayBuffer()
    } catch (error) {
      throw new Error(`Tải font preset thất bại: ${fontName} - ${error.message}`)
    }
  }

  /**
   * Tải emoji preset
   * @param {string} presetName - tên preset (twemoji32/twemoji64)
   * @param {string} emojiName - tên emoji
   * @returns {Promise<ArrayBuffer>} dữ liệu emoji
   */
  async loadPresetEmoji(presetName, emojiName) {
    try {
      const response = await fetch(`./static/${presetName}/${emojiName}.png`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.arrayBuffer()
    } catch (error) {
      throw new Error(`Tải emoji preset thất bại: ${presetName}/${emojiName} - ${error.message}`)
    }
  }

  /**
   * Chuyển file thành ArrayBuffer
   * @param {File|Blob} file - đối tượng file
   * @returns {Promise<ArrayBuffer>} dữ liệu file
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('Đọc file thất bại'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Scale ảnh để phù hợp kích thước (scale tỉ lệ giữ nguyên, hiệu ứng contain)
   * @param {ArrayBuffer|File} imageData - dữ liệu ảnh
   * @param {Object} targetSize - kích thước mục tiêu {width, height}
   * @param {string} format - định dạng ảnh (xử lý nền trong suốt)
   * @returns {Promise<ArrayBuffer>} dữ liệu ảnh sau khi scale
   */
  async scaleImageToFit(imageData, targetSize, format = 'png') {
    return new Promise((resolve, reject) => {
      const blob = imageData instanceof File ? imageData : new Blob([imageData])
      const url = URL.createObjectURL(blob)
      const img = new Image()
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Thiết lập kích thước canvas mục tiêu
          canvas.width = targetSize.width
          canvas.height = targetSize.height
          
          // Tính kích thước scale tỉ lệ (hiệu ứng contain)
          const imgAspectRatio = img.width / img.height
          const targetAspectRatio = targetSize.width / targetSize.height
          
          let drawWidth, drawHeight, offsetX, offsetY
          
          if (imgAspectRatio > targetAspectRatio) {
            // Ảnh rộng hơn, scale theo chiều rộng
            drawWidth = targetSize.width
            drawHeight = targetSize.width / imgAspectRatio
            offsetX = 0
            offsetY = (targetSize.height - drawHeight) / 2
          } else {
            // Ảnh cao hơn, scale theo chiều cao
            drawHeight = targetSize.height
            drawWidth = targetSize.height * imgAspectRatio
            offsetX = (targetSize.width - drawWidth) / 2
            offsetY = 0
          }
          
          // Giữ nền trong suốt cho PNG
          if (format === 'png') {
            // Xóa canvas để giữ trong suốt
            ctx.clearRect(0, 0, canvas.width, canvas.height)
          } else {
            // Các định dạng khác dùng nền trắng
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
          
          // Vẽ ảnh đã scale lên canvas
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
          
          // Chuyển đổi thành ArrayBuffer
          canvas.toBlob((blob) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Chuyển đổi dữ liệu ảnh thất bại'))
            reader.readAsArrayBuffer(blob)
          }, `image/${format}`)
          
          URL.revokeObjectURL(url)
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Không thể tải ảnh'))
      }
      
      img.src = url
    })
  }

  /**
   * Kiểm tra file có phải GIF không
   * @param {File} file - đối tượng file
   * @returns {boolean} có phải GIF hay không
   */
  isGifFile(file) {
    // 检查 MIME 类型
    if (file.type === 'image/gif') {
      return true
    }
    
    // 检查文件扩展名
    const extension = file.name.split('.').pop().toLowerCase()
    return extension === 'gif'
  }

  /**
   * Lấy thông tin kích thước ảnh
   * @param {ArrayBuffer|File} imageData - dữ liệu ảnh
   * @returns {Promise<Object>} thông tin kích thước {width, height}
   */
  async getImageDimensions(imageData) {
    return new Promise((resolve, reject) => {
      const blob = imageData instanceof File ? imageData : new Blob([imageData])
      const url = URL.createObjectURL(blob)
      const img = new Image()
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: img.width,
          height: img.height
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Không thể lấy kích thước ảnh'))
      }
      
      img.src = url
    })
  }

  /**
   * Chuyển ảnh sang dữ liệu thô RGB565
   * @param {ArrayBuffer} imageData - dữ liệu ảnh
   * @returns {Promise<ArrayBuffer>} dữ liệu RGB565
   */
  async convertImageToRgb565(imageData) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([imageData])
      const url = URL.createObjectURL(blob)
      const img = new Image()
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          
          canvas.width = this.config?.chip?.display?.width || 320
          canvas.height = this.config?.chip?.display?.height || 240
          
          // Vẽ ảnh theo chế độ cover, giữ tỉ lệ và căn giữa
          const imgAspectRatio = img.width / img.height
          const canvasAspectRatio = canvas.width / canvas.height
          
          let drawWidth, drawHeight, offsetX, offsetY
          
          if (imgAspectRatio > canvasAspectRatio) {
            // Ảnh rộng hơn, scale theo chiều cao (hiệu ứng cover)
            drawHeight = canvas.height
            drawWidth = canvas.height * imgAspectRatio
            offsetX = (canvas.width - drawWidth) / 2
            offsetY = 0
          } else {
            // Ảnh cao hơn, scale theo chiều rộng (hiệu ứng cover)
            drawWidth = canvas.width
            drawHeight = canvas.width / imgAspectRatio
            offsetX = 0
            offsetY = (canvas.height - drawHeight) / 2
          }
          
          // Vẽ ảnh lên canvas theo chế độ cover để giữ tỉ lệ và căn giữa
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const pixels = imageData.data
          
          // Chuyển đổi sang định dạng RGB565
          const rgb565Data = new ArrayBuffer(canvas.width * canvas.height * 2)
          const rgb565View = new Uint16Array(rgb565Data)
          
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i] >> 3      // 5位红色
            const g = pixels[i + 1] >> 2  // 6位绿色 
            const b = pixels[i + 2] >> 3  // 5位蓝色
            
            rgb565View[i / 4] = (r << 11) | (g << 5) | b
          }
          
          // Định nghĩa hằng LVGL
          const LV_IMAGE_HEADER_MAGIC = 0x19  // magic header LVGL
          const LV_COLOR_FORMAT_RGB565 = 0x12 // định dạng màu RGB565
          
          // Tính stride (số byte mỗi hàng)
          const stride = canvas.width * 2  // RGB565 mỗi pixel 2 byte
          
          // Tạo header tương thích lv_image_dsc_t
          const headerSize = 28  // kích thước cấu trúc lv_image_dsc_t
          const totalSize = headerSize + rgb565Data.byteLength
          const finalData = new ArrayBuffer(totalSize)
          const finalView = new Uint8Array(finalData)
          const headerView = new DataView(finalData)
          
          let offset = 0
          
          // Cấu trúc lv_image_header_t (16 byte)
          // magic: 8 bit, cf: 8 bit, flags: 16 bit (tổng 4 byte)
          const headerWord1 = (0 << 24) | (0 << 16) | (LV_COLOR_FORMAT_RGB565 << 8) | LV_IMAGE_HEADER_MAGIC
          headerView.setUint32(offset, headerWord1, true)
          offset += 4
          
          // w: 16 bit, h: 16 bit (tổng 4 byte)
          const sizeWord = (canvas.height << 16) | canvas.width

          headerView.setUint32(offset, sizeWord, true)  
          offset += 4
          
          // stride: 16 bit, reserved_2: 16 bit (tổng 4 byte)
          const strideWord = (0 << 16) | stride
          headerView.setUint32(offset, strideWord, true)
          offset += 4
          
          // Các trường còn lại của lv_image_dsc_t
          // data_size: 32 bit (4 byte)
          headerView.setUint32(offset, rgb565Data.byteLength, true)
          offset += 4
          
          // Con trỏ data (4 byte) - trong thực tế sẽ trỏ tới phần dữ liệu
          headerView.setUint32(offset, headerSize, true)  // 相对偏移
          offset += 4
          
          // reserved (4字节)
          headerView.setUint32(offset, 0, true)
          offset += 4
          
          // reserved_2 (4字节)  
          headerView.setUint32(offset, 0, true)
          offset += 4
          
          // Sao chép dữ liệu RGB565 vào sau header
          finalView.set(new Uint8Array(rgb565Data), headerSize)
          
          URL.revokeObjectURL(url)
          resolve(finalData)
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Không thể tải ảnh'))
      }
      
      img.src = url
    })
  }

  /**
   * Dọn dẹp tài nguyên tạm
   */
  cleanup() {
  this.resources.clear()
  this.tempFiles = []
  this.convertedFonts.clear()
  this.wakenetPacker.clear()
  this.spiffsGenerator.clear()
  this.gifScaler.dispose() // Dọn dẹp tài nguyên GifScaler
  }

  /**
   * Xóa tất cả dữ liệu lưu trữ (chức năng bắt đầu lại)
   * @returns {Promise<void>}
   */
  async clearAllStoredData() {
    try {
      await this.configStorage.clearAll()
      this.cleanup()
      console.log('Đã xóa toàn bộ dữ liệu lưu trữ')
    } catch (error) {
      console.error('Xóa dữ liệu lưu trữ thất bại:', error)
      throw error
    }
  }

  /**
   * Lấy trạng thái lưu trữ
   * @returns {Promise<Object>} Thông tin trạng thái storage
   */
  async getStorageStatus() {
    try {
      const storageInfo = await this.configStorage.getStorageInfo()
      const hasConfig = await this.configStorage.hasStoredConfig()
      
      return {
        hasStoredData: hasConfig,
        storageInfo,
        autoSaveEnabled: this.autoSaveEnabled
      }
    } catch (error) {
      console.error('Lấy trạng thái storage thất bại:', error)
      return {
        hasStoredData: false,
        storageInfo: null,
        autoSaveEnabled: this.autoSaveEnabled
      }
    }
  }

  /**
   * Bật/Tắt tự động lưu
   * @param {boolean} enabled - có bật không
   */
  setAutoSave(enabled) {
    this.autoSaveEnabled = enabled
    console.log(`Tự động lưu đã ${enabled ? 'bật' : 'tắt'}`)
  }

  /**
   * Lấy danh sách tài nguyên để hiển thị
   * @returns {Array} Danh sách tài nguyên
   */
  getResourceSummary() {
    const summary = []
    const resources = this.preparePackageResources()
    
    // 统计各类资源
    const counts = {
      wakeword: 0,
      font: 0, 
      emoji: 0,
      background: 0
    }
    
    resources.files.forEach(file => {
      counts[file.type] = (counts[file.type] || 0) + 1
      
      let description = ''
      switch (file.type) {
        case 'wakeword':
          description = `Mô hình wakeword: ${file.name} (${file.modelType})`
          break
        case 'font':
          if (file.config) {
            description = `Font tùy chỉnh: ${file.config.size}px, BPP ${file.config.bpp}`
          } else {
            description = `Font preset: ${file.source}`
          }
          break
        case 'emoji':
          description = `Emoji: ${file.name} (${file.size.width}x${file.size.height})`
          break
        case 'background':
          description = `${file.mode === 'light' ? 'Nền sáng' : 'Nền tối'} - ảnh nền`
          break
      }
      
      summary.push({
        type: file.type,
        filename: file.filename,
        description
      })
    })
    
    return {
      files: summary,
      counts,
      totalFiles: summary.length,
      indexJson: resources.indexJson
    }
  }
}

export default AssetsBuilder
