/**
 * Lớp ConfigStorage
 * Dùng để quản lý lưu trữ cấu hình và tệp trong IndexedDB
 * 
 * Chức năng chính:
 * - Lưu trữ và khôi phục cấu hình người dùng
 * - Lưu trữ và khôi phục tệp người dùng đã tải lên
 * - Cung cấp chức năng xóa cấu hình
 */

class ConfigStorage {
  constructor() {
    this.dbName = 'XiaozhiConfigDB'
    this.version = 1
    this.db = null
    this.initialized = false
  }

  /**
   * Khởi tạo IndexedDB
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized && this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('Khởi tạo IndexedDB thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.initialized = true
        console.log('Khởi tạo IndexedDB thành công')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Tạo bảng lưu trữ cấu hình
        if (!db.objectStoreNames.contains('configs')) {
          const configStore = db.createObjectStore('configs', { keyPath: 'key' })
          configStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Tạo bảng lưu trữ tệp
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' })
          fileStore.createIndex('type', 'type', { unique: false })
          fileStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Tạo bảng lưu trữ tạm thời (dùng cho font đã chuyển đổi, v.v.)
        if (!db.objectStoreNames.contains('temp_data')) {
          const tempStore = db.createObjectStore('temp_data', { keyPath: 'key' })
          tempStore.createIndex('type', 'type', { unique: false })
          tempStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        console.log('Hoàn thành tạo cấu trúc bảng IndexedDB')
      }
    })
  }

  /**
   * Lưu cấu hình vào IndexedDB
   * @param {Object} config - Đối tượng cấu hình đầy đủ
   * @param {number} currentStep - Bước hiện tại
   * @param {string} activeThemeTab - Tab chủ đề đang hoạt động
   * @returns {Promise<void>}
   */
  async saveConfig(config, currentStep = 0, activeThemeTab = 'wakeword') {
    if (!this.initialized) {
      await this.initialize()
    }

    const sanitizedConfig = this.sanitizeConfigForStorage(config)

    const configData = {
      key: 'current_config',
      config: sanitizedConfig, // Sao chép sâu và loại bỏ các trường không thể tuần tự hóa
      currentStep,
      activeThemeTab,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['configs'], 'readwrite')
      const store = transaction.objectStore('configs')
      const request = store.put(configData)

      request.onerror = () => {
        console.error('Lưu cấu hình thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log('Đã lưu cấu hình vào IndexedDB')
        resolve()
      }
    })
  }

  /**
   * Tạo đối tượng cấu hình có thể lưu trữ an toàn
   * - Các trường không thể tuần tự hóa như File/Blob đều được đặt thành null
   * - Giữ lại khóa của images để sau này khôi phục từ lưu trữ theo tên khóa
   */
  sanitizeConfigForStorage(config) {
    const cloned = JSON.parse(JSON.stringify(config || {}))

    try {
      // Tệp font
      if (cloned?.theme?.font?.type === 'custom') {
        if (!cloned.theme.font.custom) cloned.theme.font.custom = {}
        cloned.theme.font.custom.file = null
      }

      // Hình ảnh biểu tượng cảm xúc
      if (cloned?.theme?.emoji?.type === 'custom') {
        const images = cloned.theme.emoji?.custom?.images || {}
        const sanitizedImages = {}
        Object.keys(images).forEach((k) => {
          // Bất kể giải tuần tự hóa thành dạng nào, đều đặt thành null, biểu thị chờ khôi phục
          sanitizedImages[k] = null
        })
        if (!cloned.theme.emoji.custom) cloned.theme.emoji.custom = {}
        cloned.theme.emoji.custom.images = sanitizedImages
      }

      // Hình nền
      if (cloned?.theme?.skin?.light) {
        cloned.theme.skin.light.backgroundImage = null
      }
      if (cloned?.theme?.skin?.dark) {
        cloned.theme.skin.dark.backgroundImage = null
      }
    } catch (e) {
      // Bỏ qua lỗi làm sạch, trả về đối tượng đã sao chép
    }

    return cloned
  }

  /**
   * Khôi phục cấu hình từ IndexedDB
   * @returns {Promise<Object|null>} Dữ liệu cấu hình hoặc null
   */
  async loadConfig() {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['configs'], 'readonly')
      const store = transaction.objectStore('configs')
      const request = store.get('current_config')

      request.onerror = () => {
        console.error('Tải cấu hình thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          console.log('Khôi phục cấu hình từ IndexedDB thành công')
          resolve({
            config: result.config,
            currentStep: result.currentStep || 0,
            activeThemeTab: result.activeThemeTab || 'wakeword',
            timestamp: result.timestamp
          })
        } else {
          resolve(null)
        }
      }
    })
  }

  /**
   * Lưu tệp vào IndexedDB
   * @param {string} id - ID tệp
   * @param {File} file - Đối tượng tệp
   * @param {string} type - Loại tệp (font, emoji, background)
   * @param {Object} metadata - Metadata bổ sung
   * @returns {Promise<void>}
   */
  async saveFile(id, file, type, metadata = {}) {
    if (!this.initialized) {
      await this.initialize()
    }

    // Chuyển đổi tệp thành ArrayBuffer để lưu trữ
    const arrayBuffer = await this.fileToArrayBuffer(file)

    // Đảm bảo metadata có thể được sao chép có cấu trúc (loại bỏ Proxy/Ref/vòng lặp, v.v.)
    let safeMetadata = {}
    try {
      safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {}
    } catch (e) {
      // Dự phòng là sao chép nông đối tượng thuần
      safeMetadata = { ...metadata }
    }

    const fileData = {
      id,
      type,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      lastModified: file.lastModified,
      data: arrayBuffer,
      metadata: safeMetadata,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')
      const request = store.put(fileData)

      request.onerror = () => {
        console.error('Lưu tệp thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log(`Tệp ${file.name} đã được lưu vào IndexedDB`)
        resolve()
      }
    })
  }

  /**
   * Tải tệp từ IndexedDB
   * @param {string} id - ID tệp
   * @returns {Promise<File|null>} Đối tượng tệp hoặc null
   */
  async loadFile(id) {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const request = store.get(id)

      request.onerror = () => {
        console.error('Tải tệp thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // Chuyển đổi ArrayBuffer trở lại thành đối tượng File
          const blob = new Blob([result.data], { type: result.mimeType })
          const file = new File([blob], result.name, {
            type: result.mimeType,
            lastModified: result.lastModified
          })

          // Thêm metadata bổ sung
          file.storedId = result.id
          file.storedType = result.type
          file.storedMetadata = result.metadata
          file.storedTimestamp = result.timestamp

          console.log(`Tệp ${result.name} đã khôi phục từ IndexedDB thành công`)
          resolve(file)
        } else {
          resolve(null)
        }
      }
    })
  }

  /**
   * Lấy tất cả các tệp thuộc loại được chỉ định
   * @param {string} type - Loại tệp
   * @returns {Promise<Array>} Danh sách tệp
   */
  async getFilesByType(type) {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const index = store.index('type')
      const request = index.getAll(type)

      request.onerror = () => {
        console.error('Lấy danh sách tệp thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const results = request.result || []
        const files = results.map(result => {
          const blob = new Blob([result.data], { type: result.mimeType })
          const file = new File([blob], result.name, {
            type: result.mimeType,
            lastModified: result.lastModified
          })

          file.storedId = result.id
          file.storedType = result.type
          file.storedMetadata = result.metadata
          file.storedTimestamp = result.timestamp

          return file
        })

        resolve(files)
      }
    })
  }

  /**
   * Lưu dữ liệu tạm thời (như font đã chuyển đổi, v.v.)
   * @param {string} key - Khóa dữ liệu
   * @param {ArrayBuffer} data - Dữ liệu
   * @param {string} type - Loại dữ liệu
   * @param {Object} metadata - Metadata
   * @returns {Promise<void>}
   */
  async saveTempData(key, data, type, metadata = {}) {
    if (!this.initialized) {
      await this.initialize()
    }

    const tempData = {
      key,
      type,
      data,
      metadata,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['temp_data'], 'readwrite')
      const store = transaction.objectStore('temp_data')
      const request = store.put(tempData)

      request.onerror = () => {
        console.error('Lưu dữ liệu tạm thời thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log(`Dữ liệu tạm thời ${key} đã được lưu`)
        resolve()
      }
    })
  }

  /**
   * Tải dữ liệu tạm thời
   * @param {string} key - Khóa dữ liệu
   * @returns {Promise<Object|null>} Dữ liệu tạm thời hoặc null
   */
  async loadTempData(key) {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['temp_data'], 'readonly')
      const store = transaction.objectStore('temp_data')
      const request = store.get(key)

      request.onerror = () => {
        console.error('Tải dữ liệu tạm thời thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const result = request.result
        resolve(result || null)
      }
    })
  }

  /**
   * Xóa tất cả dữ liệu đã lưu trữ
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.initialized) {
      await this.initialize()
    }

    const storeNames = ['configs', 'files', 'temp_data']
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeNames, 'readwrite')
      let completedStores = 0
      let hasError = false

      const checkComplete = () => {
        completedStores++
        if (completedStores === storeNames.length) {
          if (hasError) {
            reject(new Error('Có lỗi xảy ra khi xóa một phần dữ liệu'))
          } else {
            console.log('Đã xóa tất cả dữ liệu lưu trữ')
            resolve()
          }
        }
      }

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onerror = () => {
          console.error(`Xóa ${storeName} thất bại:`, request.error)
          hasError = true
          checkComplete()
        }

        request.onsuccess = () => {
          console.log(`Đã xóa ${storeName}`)
          checkComplete()
        }
      })
    })
  }

  /**
   * Xóa tệp được chỉ định
   * @param {string} id - ID tệp
   * @returns {Promise<void>}
   */
  async deleteFile(id) {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')
      const request = store.delete(id)

      request.onerror = () => {
        console.error('Xóa tệp thất bại:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log(`Đã xóa tệp ${id}`)
        resolve()
      }
    })
  }

  /**
   * Lấy thông tin sử dụng bộ nhớ
   * @returns {Promise<Object>} Thông tin thống kê bộ nhớ
   */
  async getStorageInfo() {
    if (!this.initialized) {
      await this.initialize()
    }

    const storeNames = ['configs', 'files', 'temp_data']
    const info = {}

    for (const storeName of storeNames) {
      const count = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.count()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })

      info[storeName] = { count }
    }

    // Lấy thời gian lưu cấu hình lần cuối
    const configData = await this.loadConfig()
    info.lastSaved = configData ? new Date(configData.timestamp) : null

    return info
  }

  /**
   * Kiểm tra xem có cấu hình đã lưu hay không
   * @returns {Promise<boolean>}
   */
  async hasStoredConfig() {
    try {
      const config = await this.loadConfig()
      return config !== null
    } catch (error) {
      console.error('Lỗi khi kiểm tra cấu hình đã lưu:', error)
      return false
    }
  }

  /**
   * Chuyển đổi tệp thành ArrayBuffer
   * @param {File} file - Đối tượng tệp
   * @returns {Promise<ArrayBuffer>}
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Đọc tệp thất bại'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Đóng kết nối cơ sở dữ liệu
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initialized = false
      console.log('Đã đóng kết nối IndexedDB')
    }
  }
}

// Tạo instance singleton
const configStorage = new ConfigStorage()

export default configStorage