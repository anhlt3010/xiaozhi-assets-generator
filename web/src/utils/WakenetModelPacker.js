/**
 * Lớp WakenetModelPacker
 * Mô phỏng chức năng của pack_model.py, dùng để đóng gói mô hình wake word trên trình duyệt
 *
 * Lưu ý: đã sửa các vấn đề tương thích với phiên bản Python:
 * - Sử dụng mã ASCII thay vì UTF-8
 * - Đảm bảo định dạng số nguyên theo little-endian nhất quán
 * - Loại bỏ các thao tác thay thế chuỗi thừa
 *
 * Định dạng đóng gói:
 * {
 *     model_num: int (4 byte)
 *     model1_info: model_info_t
 *     model2_info: model_info_t
 *     ...
 *     dữ liệu_model1
 *     dữ liệu_model2
 *     ...
 * }
 *
 * model_info_t có cấu trúc:
 * {
 *     model_name: char[32] (32 byte)
 *     file_number: int (4 byte)
 *     file1_name: char[32] (32 byte)
 *     file1_start: int (4 byte)
 *     file1_len: int (4 byte)
 *     file2_name: char[32] (32 byte)
 *     file2_start: int (4 byte)
 *     file2_len: int (4 byte)
 *     ...
 * }
 */

class WakenetModelPacker {
  constructor() {
    this.models = new Map()
  }

  /**
   * 添加模型文件
   * @param {string} modelName - 模型名称
   * @param {string} fileName - 文件名
   * @param {ArrayBuffer} fileData - 文件数据
   */
  addModelFile(modelName, fileName, fileData) {
    if (!this.models.has(modelName)) {
      this.models.set(modelName, new Map())
    }
    this.models.get(modelName).set(fileName, fileData)
  }

  /**
   * 从share/wakenet_model目录加载模型
   * @param {string} modelName - 模型名称 (例如: wn9s_nihaoxiaozhi)
   * @returns {Promise<boolean>} 加载是否成功
   */
  async loadModelFromShare(modelName) {
    try {
  // Tất cả mô hình wakenet đều dùng cùng một danh sách tên tệp
      const modelFiles = [
        '_MODEL_INFO_',
        'wn9_data',
        'wn9_index'
      ]

      let loadedFiles = 0
      for (const fileName of modelFiles) {
        try {
          const response = await fetch(`./static/wakenet_model/${modelName}/${fileName}`)
          if (response.ok) {
            const fileData = await response.arrayBuffer()
            this.addModelFile(modelName, fileName, fileData)
            loadedFiles++
          } else {
    console.warn(`Không thể tải tệp: ${fileName}, mã trạng thái: ${response.status}`)
          }
        } catch (error) {
      console.warn(`Tải tệp thất bại: ${fileName}`, error)
        }
      }

      return loadedFiles === modelFiles.length
    } catch (error) {
  console.error(`Tải mô hình thất bại: ${modelName}`, error)
      return false
    }
  }

  /**
   * 将字符串打包为固定长度的二进制数据
   * 模仿Python版本的struct_pack_string行为，使用ASCII编码
   * @param {string} string - 输入字符串
   * @param {number} maxLen - 最大长度
   * @returns {Uint8Array} 打包后的二进制数据
   */
  packString(string, maxLen) {
    const bytes = new Uint8Array(maxLen)
    
  // Sử dụng mã ASCII, giữ tương thích với phiên bản Python
  // Không dành chỗ cho ký tự null kết thúc, sử dụng đầy đủ maxLen byte
    const copyLen = Math.min(string.length, maxLen)
    
    for (let i = 0; i < copyLen; i++) {
      // 使用charCodeAt获取ASCII码，只取低8位以确保兼容性
      bytes[i] = string.charCodeAt(i) & 0xFF
    }
    
    // Các byte còn lại giữ giá trị 0 (giá trị khởi tạo mặc định)
    return bytes
  }

  /**
   * 将32位整数转换为小端序字节数组
   * 与Python版本的struct.pack('<I', value)保持一致
   * @param {number} value - 整数值
   * @returns {Uint8Array} 4字节的小端序数组
   */
  packUint32(value) {
    const bytes = new Uint8Array(4)
    bytes[0] = value & 0xFF          // 最低字节 (LSB)
    bytes[1] = (value >> 8) & 0xFF   // 
    bytes[2] = (value >> 16) & 0xFF  // 
    bytes[3] = (value >> 24) & 0xFF  // 最高字节 (MSB)
    return bytes
  }

  /**
   * 打包所有模型为srmodels.bin格式
   * @returns {ArrayBuffer} 打包后的二进制数据
   */
  packModels() {
    if (this.models.size === 0) {
      throw new Error('Không có dữ liệu mô hình để đóng gói')
    }

    // 计算所有文件的总数和数据
    let totalFileNum = 0
    const modelDataList = []
    
    // Duyệt theo thứ tự tên mô hình
    for (const [modelName, files] of Array.from(this.models.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      totalFileNum += files.size
      // 按文件名排序，确保与Python版本顺序一致
      const sortedFiles = Array.from(files.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      modelDataList.push({
        name: modelName,
        files: sortedFiles
      })
    }

    // Tính độ dài header: số mô hình (4) + mỗi model info (32+4 + số_tệp*(32+4+4))
    const modelNum = this.models.size
    let headerLen = 4 // model_num
    
    for (const model of modelDataList) {
      headerLen += 32 + 4 // model_name + file_number
      headerLen += model.files.length * (32 + 4 + 4) // mỗi tệp: name + start + len
    }

  // Tạo bộ nhớ đệm đầu ra
    const totalSize = headerLen + Array.from(this.models.values())
      .reduce((total, files) => total + Array.from(files.values())
        .reduce((fileTotal, fileData) => fileTotal + fileData.byteLength, 0), 0)
    
    const output = new Uint8Array(totalSize)
    let offset = 0

  // Ghi số lượng mô hình
    output.set(this.packUint32(modelNum), offset)
    offset += 4

  // Ghi phần header thông tin mô hình
    let dataOffset = headerLen
    
    for (const model of modelDataList) {
      // Ghi tên mô hình
      output.set(this.packString(model.name, 32), offset)
      offset += 32
      
      // Ghi số lượng tệp
      output.set(this.packUint32(model.files.length), offset)
      offset += 4

      // Ghi thông tin cho mỗi tệp
      for (const [fileName, fileData] of model.files) {
        // 文件名
        output.set(this.packString(fileName, 32), offset)
        offset += 32
        
        // 文件起始位置
        output.set(this.packUint32(dataOffset), offset)
        offset += 4
        
        // 文件长度
        output.set(this.packUint32(fileData.byteLength), offset)
        offset += 4

        dataOffset += fileData.byteLength
      }
    }

    // Ghi dữ liệu các tệp
    for (const model of modelDataList) {
      for (const [fileName, fileData] of model.files) {
        output.set(new Uint8Array(fileData), offset)
        offset += fileData.byteLength
      }
    }

    return output.buffer
  }

  /**
   * 获取可用的模型列表
   * @returns {Promise<Array>} 模型列表
   */
  static async getAvailableModels() {
    try {
      // 尝试获取模型列表的几种方式
      const wn9Models = [
        'wn9_alexa', 'wn9_astrolabe_tts', 'wn9_bluechip_tts2', 'wn9_computer_tts',
        'wn9_haixiaowu_tts', 'wn9_heyily_tts2', 'wn9_heyprinter_tts', 'wn9_heywanda_tts',
        'wn9_heywillow_tts', 'wn9_hiesp', 'wn9_hifairy_tts2', 'wn9_hijason_tts2',
        'wn9_hijolly_tts2', 'wn9_hijoy_tts', 'wn9_hilexin', 'wn9_hilili_tts',
        'wn9_himfive', 'wn9_himiaomiao_tts', 'wn9_hitelly_tts', 'wn9_hiwalle_tts2',
        'wn9_hixiaoxing_tts', 'wn9_jarvis_tts', 'wn9_linaiban_tts2', 'wn9_miaomiaotongxue_tts',
        'wn9_mycroft_tts', 'wn9_nihaobaiying_tts2', 'wn9_nihaodongdong_tts2', 'wn9_nihaomiaoban_tts2',
        'wn9_nihaoxiaoan_tts2', 'wn9_nihaoxiaoxin_tts', 'wn9_nihaoxiaoyi_tts2', 'wn9_nihaoxiaozhi',
        'wn9_nihaoxiaozhi_tts', 'wn9_sophia_tts', 'wn9_xiaoaitongxue', 'wn9_xiaobinxiaobin_tts',
        'wn9_xiaojianxiaojian_tts2', 'wn9_xiaokangtongxue_tts2', 'wn9_xiaolongxiaolong_tts',
        'wn9_xiaoluxiaolu_tts2', 'wn9_xiaomeitongxue_tts', 'wn9_xiaomingtongxue_tts2',
        'wn9_xiaosurou_tts2', 'wn9_xiaotexiaote_tts2', 'wn9_xiaoyaxiaoya_tts2', 'wn9_xiaoyutongxue_tts2'
      ]

      const wn9sModels = [
        'wn9s_alexa', 'wn9s_hiesp', 'wn9s_hijason', 'wn9s_hilexin', 'wn9s_nihaoxiaozhi'
      ]

      return {
        WakeNet9: wn9Models,
        WakeNet9s: wn9sModels
      }
    } catch (error) {
      console.error('Lấy danh sách mô hình thất bại:', error)
      return { WakeNet9: [], WakeNet9s: [] }
    }
  }

  /**
   * 验证模型名称是否有效
   * @param {string} modelName - 模型名称
   * @param {string} chipModel - 芯片型号
   * @returns {boolean} 是否有效
   */
  static isValidModel(modelName, chipModel) {
    const isC3OrC6 = chipModel === 'esp32c3' || chipModel === 'esp32c6'
    
    // Nếu là chip esp32c3/esp32c6 thì dùng model wn9s_
    if (isC3OrC6) {
      return modelName.startsWith('wn9s_')
    } else {
      return modelName.startsWith('wn9_')
    }
  }

  /**
   * 清理已加载的模型数据
   */
  clear() {
    this.models.clear()
  }

  /**
   * 获取已加载的模型统计
   * @returns {Object} 统计信息
   */
  getStats() {
    let totalFiles = 0
    let totalSize = 0
    
    for (const files of this.models.values()) {
      totalFiles += files.size
      for (const fileData of files.values()) {
        totalSize += fileData.byteLength
      }
    }

    return {
      modelCount: this.models.size,
      fileCount: totalFiles,
      totalSize,
      models: Array.from(this.models.keys())
    }
  }

  /**
   * 验证打包格式的兼容性
   * 用于测试与Python版本的一致性
   * @returns {Object} 验证结果
   */
  validatePackingCompatibility() {
    // Kiểm tra đóng gói chuỗi
    const testString = "test_model"
    const packedString = this.packString(testString, 32)
    
    // Kiểm tra đóng gói số nguyên
    const testInt = 0x12345678
    const packedInt = this.packUint32(testInt)
    
    return {
      stringPacking: {
        input: testString,
        output: Array.from(packedString).map(b => `0x${b.toString(16).padStart(2, '0')}`),
        isASCII: packedString.every((b, i) => i >= testString.length || b === testString.charCodeAt(i))
      },
      intPacking: {
        input: `0x${testInt.toString(16)}`,
        output: Array.from(packedInt).map(b => `0x${b.toString(16).padStart(2, '0')}`),
        isLittleEndian: packedInt[0] === 0x78 && packedInt[3] === 0x12
      }
    }
  }
}

export default WakenetModelPacker
