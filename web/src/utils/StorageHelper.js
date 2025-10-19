/**
 * StorageHelper - lớp tiện ích
 * Cung cấp chức năng lưu trữ tệp thuận tiện cho các component
 */

import configStorage from './ConfigStorage.js'

class StorageHelper {
  /**
   * Tự động lưu tệp font
   * @param {File} file - tệp font
   * @param {Object} config - cấu hình font
   * @returns {Promise<void>}
   */
  static async saveFontFile(file, config = {}) {
    if (file) {
      const key = 'custom_font'
      try {
        await configStorage.saveFile(key, file, 'font', {
          size: config.size || 20,
          bpp: config.bpp || 4,
          charset: config.charset || 'deepseek'
        })
  console.log(`Đã lưu tệp font: ${file.name}`)
      } catch (error) {
  console.warn(`Không lưu được tệp font: ${file.name}`, error)
      }
    }
  }

  /**
   * Tự động lưu tệp emoji
   * @param {string} emojiName - tên emoji
   * @param {File} file - tệp emoji
   * @param {Object} config - cấu hình emoji
   * @returns {Promise<void>}
   */
  static async saveEmojiFile(emojiName, file, config = {}) {
    if (file && emojiName) {
      const key = `emoji_${emojiName}`
      try {
        const width = config?.size?.width ?? 64
        const height = config?.size?.height ?? 64
        const format = config?.format ?? 'png'

  // Truyền đối tượng thường có thể clone được để tránh Vue Proxy
        await configStorage.saveFile(key, file, 'emoji', {
          name: emojiName,
          size: { width, height },
          format
        })
  console.log(`Đã lưu tệp emoji: ${emojiName} - ${file.name}`)
      } catch (error) {
  console.warn(`Không lưu được tệp emoji: ${emojiName}`, error)
      }
    }
  }

  /**
   * Tự động lưu tệp nền
   * @param {string} mode - chế độ ('light' hoặc 'dark')
   * @param {File} file - tệp nền
   * @param {Object} config - cấu hình nền
   * @returns {Promise<void>}
   */
  static async saveBackgroundFile(mode, file, config = {}) {
    if (file && mode) {
      const key = `background_${mode}`
      try {
        let safeConfig = {}
        try {
          safeConfig = config ? JSON.parse(JSON.stringify(config)) : {}
        } catch (e) {
          safeConfig = { ...config }
        }

        await configStorage.saveFile(key, file, 'background', {
          mode,
          ...safeConfig
        })
        console.log(`Đã lưu tệp nền: ${mode} - ${file.name}`)
      } catch (error) {
        console.warn(`Không lưu được tệp nền: ${mode}`, error)
      }
    }
  }

  /**
   * Khôi phục tệp font
   * @returns {Promise<File|null>}
   */
  static async restoreFontFile() {
    try {
      return await configStorage.loadFile('custom_font')
    } catch (error) {
      console.warn('Khôi phục tệp font thất bại:', error)
      return null
    }
  }

  /**
   * Khôi phục tệp emoji
   * @param {string} emojiName - tên emoji
   * @returns {Promise<File|null>}
   */
  static async restoreEmojiFile(emojiName) {
    if (!emojiName) return null

    try {
      const key = `emoji_${emojiName}`
      return await configStorage.loadFile(key)
    } catch (error) {
      console.warn(`Khôi phục tệp emoji thất bại: ${emojiName}`, error)
      return null
    }
  }

  /**
   * Khôi phục tệp nền
   * @param {string} mode - chế độ ('light' hoặc 'dark')
   * @returns {Promise<File|null>}
   */
  static async restoreBackgroundFile(mode) {
    if (!mode) return null

    try {
      const key = `background_${mode}`
      return await configStorage.loadFile(key)
    } catch (error) {
      console.warn(`Khôi phục tệp nền thất bại: ${mode}`, error)
      return null
    }
  }

  /**
   * Xóa tệp font
   * @returns {Promise<void>}
   */
  static async deleteFontFile() {
    try {
      await configStorage.deleteFile('custom_font')
      console.log('Đã xóa tệp font')
    } catch (error) {
      console.warn('Xóa tệp font thất bại:', error)
    }
  }

  /**
   * Xóa tệp emoji
   * @param {string} emojiName - tên emoji
   * @returns {Promise<void>}
   */
  static async deleteEmojiFile(emojiName) {
    if (!emojiName) return

    try {
      const key = `emoji_${emojiName}`
      await configStorage.deleteFile(key)
      console.log(`Đã xóa tệp emoji: ${emojiName}`)
    } catch (error) {
      console.warn(`Xóa tệp emoji thất bại: ${emojiName}`, error)
    }
  }

  /**
   * Xóa tệp nền
   * @param {string} mode - chế độ ('light' hoặc 'dark')
   * @returns {Promise<void>}
   */
  static async deleteBackgroundFile(mode) {
    if (!mode) return

    try {
      const key = `background_${mode}`
      await configStorage.deleteFile(key)
      console.log(`Đã xóa tệp nền: ${mode}`)
    } catch (error) {
      console.warn(`Xóa tệp nền thất bại: ${mode}`, error)
    }
  }

  /**
   * Lấy thông tin lưu trữ tệp
   * @returns {Promise<Object>}
   */
  static async getStorageInfo() {
    try {
      return await configStorage.getStorageInfo()
    } catch (error) {
      console.warn('Lấy thông tin lưu trữ thất bại:', error)
      return {
        configs: { count: 0 },
        files: { count: 0 },
        temp_data: { count: 0 },
        lastSaved: null
      }
    }
  }

  /**
   * Xóa tất cả tệp lưu trữ
   * @returns {Promise<void>}
   */
  static async clearAllFiles() {
    try {
      await configStorage.clearAll()
      console.log('Đã xóa tất cả tệp lưu trữ')
    } catch (error) {
      console.warn('Xóa tệp lưu trữ thất bại:', error)
      throw error
    }
  }
}

export default StorageHelper
