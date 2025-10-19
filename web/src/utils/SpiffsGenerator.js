/**
 * Lớp SpiffsGenerator
 * Mô phỏng chức năng của spiffs_assets_gen.py, dùng để tạo file assets.bin phía trình duyệt
 *
 * Định dạng file:
 * {
 *     total_files: int (4 byte)          // Tổng số file
 *     checksum: int (4 byte)             // Giá trị kiểm tra (checksum)
 *     combined_data_length: int (4 byte) // Tổng độ dài dữ liệu
 *     mmap_table: [                      // Bảng ánh xạ file
 *         {
 *             name: char[32]            // Tên file (32 byte)
 *             size: int (4 byte)       // Kích thước file
 *             offset: int (4 byte)     // Offset của file
 *             width: short (2 byte)    // Chiều rộng ảnh
 *             height: short (2 byte)   // Chiều cao ảnh
 *         }
 *         ...
 *     ]
 *     file_data: [                       // Dữ liệu file
 *         0x5A 0x5A + file1_data         // Mỗi file được tiền tố bằng 0x5A5A
 *         0x5A 0x5A + file2_data
 *         ...
 *     ]
 * }
 */

class SpiffsGenerator {
  constructor() {
    this.files = []
    this.textEncoder = new TextEncoder()
  }

  /**
   * 添加文件
  * Thêm file
  * @param {string} filename - Tên file
  * @param {ArrayBuffer} data - Dữ liệu file
  * @param {Object} options - Tham số tùy chọn {width?, height?}
   */
  addFile(filename, data, options = {}) {
    if (filename.length > 32) {
    console.warn(`Tên file "${filename}" vượt quá 32 byte, sẽ bị cắt bớt`)
    }

    this.files.push({
      filename,
      data,
      size: data.byteLength,
      width: options.width || 0,
      height: options.height || 0
    })
  }

  /**
   * 从图片文件获取尺寸信息
  * Lấy thông tin kích thước từ file ảnh
  * @param {ArrayBuffer} imageData - Dữ liệu ảnh
  * @returns {Promise<Object>} {width, height}
   */
  async getImageDimensions(imageData) {
    return new Promise((resolve) => {
      try {
        const blob = new Blob([imageData])
        const url = URL.createObjectURL(blob)
        const img = new Image()
        
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve({ width: img.width, height: img.height })
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(url)
          resolve({ width: 0, height: 0 })
        }
        
        img.src = url
      } catch (error) {
        resolve({ width: 0, height: 0 })
      }
    })
  }

  /**
   * 检查是否为特殊图片格式 (.sjpg, .spng, .sqoi)
  * Kiểm tra và phân tích các định dạng ảnh đặc biệt (.sjpg, .spng, .sqoi)
  * @param {string} filename - Tên file
  * @param {ArrayBuffer} data - Dữ liệu file
  * @returns {Object} {width, height}
   */
  parseSpecialImageFormat(filename, data) {
    const ext = filename.toLowerCase().split('.').pop()
    
    if (['.sjpg', '.spng', '.sqoi'].includes('.' + ext)) {
      try {
        // Cấu trúc header của định dạng đặc biệt: tại offset 14 là width và height (mỗi cái 2 byte, little-endian)
        const view = new DataView(data)
        const width = view.getUint16(14, true)  // little-endian
        const height = view.getUint16(16, true) // little-endian
        return { width, height }
      } catch (error) {
        console.warn(`Phân tích định dạng ảnh đặc biệt thất bại: ${filename}`, error)
      }
    }
    
    return { width: 0, height: 0 }
  }

  /**
   * 将32位整数转换为小端序字节数组
  * Chuyển số nguyên 32-bit thành mảng byte theo little-endian
  * @param {number} value - Giá trị số nguyên
  * @returns {Uint8Array} Mảng 4 byte theo little-endian
   */
  packUint32(value) {
    const bytes = new Uint8Array(4)
    bytes[0] = value & 0xFF
    bytes[1] = (value >> 8) & 0xFF
    bytes[2] = (value >> 16) & 0xFF
    bytes[3] = (value >> 24) & 0xFF
    return bytes
  }

  /**
   * 将16位整数转换为小端序字节数组
  * Chuyển số nguyên 16-bit thành mảng byte theo little-endian
  * @param {number} value - Giá trị số nguyên
  * @returns {Uint8Array} Mảng 2 byte theo little-endian
   */
  packUint16(value) {
    const bytes = new Uint8Array(2)
    bytes[0] = value & 0xFF
    bytes[1] = (value >> 8) & 0xFF
    return bytes
  }

  /**
   * 将字符串打包为固定长度的二进制数据
  * Đóng gói chuỗi thành dữ liệu nhị phân có độ dài cố định
  * @param {string} string - Chuỗi đầu vào
  * @param {number} maxLen - Độ dài tối đa
  * @returns {Uint8Array} Dữ liệu nhị phân sau khi đóng gói
   */
  packString(string, maxLen) {
    const bytes = new Uint8Array(maxLen)
    const encoded = this.textEncoder.encode(string)
    
    // 复制字符串数据，确保不超过最大长度
    const copyLen = Math.min(encoded.length, maxLen)
    bytes.set(encoded.slice(0, copyLen), 0)
    
    // 剩余字节为0填充
    return bytes
  }

  /**
   * 计算校验和
  * Tính checksum
  * @param {Uint8Array} data - Dữ liệu
  * @returns {number} Giá trị checksum 16-bit
   */
  computeChecksum(data) {
    let checksum = 0
    for (let i = 0; i < data.length; i++) {
      checksum += data[i]
    }
    return checksum & 0xFFFF
  }

  /**
   * 对文件进行排序
  * Sắp xếp danh sách file
  * @param {Array} files - Danh sách file
  * @returns {Array} Danh sách file đã sắp xếp
   */
  sortFiles(files) {
    return files.slice().sort((a, b) => {
      const extA = a.filename.split('.').pop() || ''
      const extB = b.filename.split('.').pop() || ''
      
      if (extA !== extB) {
        return extA.localeCompare(extB)
      }
      
      const nameA = a.filename.replace(/\.[^/.]+$/, '')
      const nameB = b.filename.replace(/\.[^/.]+$/, '')
      return nameA.localeCompare(nameB)
    })
  }

  /**
   * 生成 assets.bin 文件
  * Tạo file assets.bin
  * @param {Function} progressCallback - Hàm callback cập nhật tiến trình
  * @returns {Promise<ArrayBuffer>} Dữ liệu assets.bin đã tạo
   */
  async generate(progressCallback = null) {
    if (this.files.length === 0) {
    throw new Error('Không có file để đóng gói')
    }

    if (progressCallback) progressCallback(0, '开始打包文件...')

    // 排序文件
    const sortedFiles = this.sortFiles(this.files)
    const totalFiles = sortedFiles.length

    // 处理文件信息并获取图片尺寸
    const fileInfoList = []
    let mergedDataSize = 0

  for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i]
      let width = file.width
      let height = file.height

      if (progressCallback) {
    progressCallback(10 + (i / totalFiles) * 30, `Xử lý file: ${file.filename}`)
      }

      // 如果没有提供尺寸信息，尝试自动获取
      if (width === 0 && height === 0) {
        // 先检查特殊图片格式
          const specialDimensions = this.parseSpecialImageFormat(file.filename, file.data)
        if (specialDimensions.width > 0 || specialDimensions.height > 0) {
          width = specialDimensions.width
          height = specialDimensions.height
        } else {
          // 尝试作为普通图片解析
          const ext = file.filename.toLowerCase().split('.').pop()
          if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
            const dimensions = await this.getImageDimensions(file.data)
            width = dimensions.width
            height = dimensions.height
          }
        }
      }

      fileInfoList.push({
        filename: file.filename,
        data: file.data,
        size: file.size,
        offset: mergedDataSize,
        width,
        height
      })

      mergedDataSize += 2 + file.size // 2字节前缀 + 文件数据
    }

  if (progressCallback) progressCallback(40, 'Xây dựng bảng ánh xạ file...')

    // 构建映射表
    const mmapTableSize = totalFiles * (32 + 4 + 4 + 2 + 2) // name + size + offset + width + height
    const mmapTable = new Uint8Array(mmapTableSize)
    let mmapOffset = 0

    for (const fileInfo of fileInfoList) {
      // 文件名 (32字节)
      mmapTable.set(this.packString(fileInfo.filename, 32), mmapOffset)
      mmapOffset += 32

      // 文件大小 (4字节)
      mmapTable.set(this.packUint32(fileInfo.size), mmapOffset)
      mmapOffset += 4

      // 文件偏移 (4字节)
      mmapTable.set(this.packUint32(fileInfo.offset), mmapOffset)
      mmapOffset += 4

      // 图片宽度 (2字节)
      mmapTable.set(this.packUint16(fileInfo.width), mmapOffset)
      mmapOffset += 2

      // 图片高度 (2字节)  
      mmapTable.set(this.packUint16(fileInfo.height), mmapOffset)
      mmapOffset += 2
    }

  if (progressCallback) progressCallback(60, 'Hợp nhất dữ liệu file...')

    // 合并文件数据
    const mergedData = new Uint8Array(mergedDataSize)
    let mergedOffset = 0

    for (let i = 0; i < fileInfoList.length; i++) {
      const fileInfo = fileInfoList[i]
      
      if (progressCallback) {
        progressCallback(60 + (i / totalFiles) * 20, `Hợp nhất file: ${fileInfo.filename}`)
      }

      // 添加0x5A5A前缀
      mergedData[mergedOffset] = 0x5A
      mergedData[mergedOffset + 1] = 0x5A
      mergedOffset += 2

      // 添加文件数据
      mergedData.set(new Uint8Array(fileInfo.data), mergedOffset)
      mergedOffset += fileInfo.size
    }

  if (progressCallback) progressCallback(80, 'Tính checksum...')

    // 计算组合数据的校验和
    const combinedData = new Uint8Array(mmapTableSize + mergedDataSize)
    combinedData.set(mmapTable, 0)
    combinedData.set(mergedData, mmapTableSize)
    
    const checksum = this.computeChecksum(combinedData)
    const combinedDataLength = combinedData.length

  if (progressCallback) progressCallback(90, 'Xây dựng file cuối cùng...')

    // 构建最终输出
    const headerSize = 4 + 4 + 4 // total_files + checksum + combined_data_length
    const totalSize = headerSize + combinedDataLength
    const finalData = new Uint8Array(totalSize)
    
    let offset = 0

    // 写入文件总数
    finalData.set(this.packUint32(totalFiles), offset)
    offset += 4

    // 写入校验和
    finalData.set(this.packUint32(checksum), offset)
    offset += 4

    // 写入组合数据长度
    finalData.set(this.packUint32(combinedDataLength), offset)
    offset += 4

    // 写入组合数据
    finalData.set(combinedData, offset)

  if (progressCallback) progressCallback(100, 'Đóng gói hoàn tất')

    return finalData.buffer
  }

  /**
   * 获取文件统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let totalSize = 0
    const fileTypes = new Map()

    for (const file of this.files) {
      totalSize += file.size
      
      const ext = file.filename.split('.').pop()?.toLowerCase() || 'unknown'
      fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1)
    }

    return {
      fileCount: this.files.length,
      totalSize,
      fileTypes: Object.fromEntries(fileTypes),
      averageFileSize: this.files.length > 0 ? Math.round(totalSize / this.files.length) : 0
    }
  }

  /**
   * 清理文件列表
   */
  clear() {
    this.files = []
  }
}

export default SpiffsGenerator
