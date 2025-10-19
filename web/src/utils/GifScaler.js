/**
 * Lớp GifScaler
 * Dùng để xử lý thay đổi kích thước GIF (ví dụ: emoji GIF)
 *
 * Chức năng chính:
 * - Phân tích từng khung của file GIF
 * - Thay đổi kích thước mỗi khung
 * - Tạo lại file GIF sau khi thay đổi kích thước
 * - Hỗ trợ giữ nguyên thời gian hoạt ảnh gốc
 *
 * Gợi ý phụ thuộc:
 * Để hỗ trợ xử lý GIF nhiều khung đầy đủ, khuyến nghị cài đặt các gói sau:
 * ```bash
 * npm install gif.js gifuct-js
 * ```
 *
 * Ví dụ sử dụng:
 * ```javascript
 * const scaler = new GifScaler({ 
 *   quality: 10, 
 *   debug: true,
 *   scalingMode: 'auto',  // 'auto', 'smooth', 'sharp', 'pixelated'
 *   workers: 2,  // sử dụng 2 worker để xử lý song song
 *   workerScript: '/share/gif.worker.js'  // đường dẫn script worker
 * })
 * const scaledGif = await scaler.scaleGif(gifFile, {
 *   maxWidth: 64,
 *   maxHeight: 64,
 *   keepAspectRatio: true
 * })
 * ```
 */
import { parseGIF, decompressFrames } from 'gifuct-js'
import GIF from 'gif.js'


class GifScaler {
  constructor(options = {}) {
    this.options = {
      quality: options.quality || 10,  // Chất lượng GIF (1-20, số nhỏ hơn = chất lượng cao hơn)
      repeat: options.repeat !== undefined ? options.repeat : -1,  // Số lần lặp (-1 là lặp vô hạn)
      debug: options.debug || false,  // Chế độ gỡ lỗi
      scalingMode: options.scalingMode || 'auto',  // Chế độ thu phóng: 'auto', 'smooth', 'sharp', 'pixelated'
      workers: options.workers || 2,  // Số luồng worker (1-4, nhiều luồng hơn giúp xử lý GIF lớn nhanh hơn)
      workerScript: options.workerScript || `${import.meta.env.BASE_URL}/workers/gif.worker.js`,  // Đường dẫn script worker
      ...options
    }
    
    this.canvas = null
    this.ctx = null
    this.frames = []
    this.delays = []
    this.originalWidth = 0
    this.originalHeight = 0
    this.targetWidth = 0
    this.targetHeight = 0
    this.gifRepeat = 0  // 默认无限循环
  }

  /**
   * Khởi tạo Canvas và context
   * @param {number} width - Chiều rộng Canvas
   * @param {number} height - Chiều cao Canvas
   * @private
   */
  initCanvas(width, height) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')
    
    if (this.options.debug) {
      console.log(`Canvas initialized: ${width}x${height}`)
    }
  }

  /**
   * Phân tích file GIF và trích xuất tất cả khung
   * @param {File|Blob} gifFile - File GIF
   * @returns {Promise<Array>} Trả về mảng dữ liệu khung
   */
  async parseGifFrames(gifFile) {
    try {
      // 只使用 gifuct-js 进行 GIF 解析
      return await this.parseGifWithGifuct(gifFile)
    } catch (error) {
      throw new Error(`GIF 解析失败: ${error.message}`)
    }
  }


  /**
   * Sử dụng gifuct-js để phân tích GIF nâng cao
   * @param {File|Blob} gifFile - File GIF
   * @returns {Promise<Array>} Trả về mảng dữ liệu khung
   */
  async parseGifWithGifuct(gifFile) {
    const arrayBuffer = await this.fileToArrayBuffer(gifFile)
    const gif = parseGIF(arrayBuffer)
    const frames = decompressFrames(gif, true)
    
    this.originalWidth = gif.lsd.width
    this.originalHeight = gif.lsd.height
    this.frames = []
    this.delays = []
    
    // Đọc thông tin vòng lặp của GIF gốc
    // Nếu người dùng không thiết lập repeat, sẽ dùng cấu hình vòng lặp của GIF gốc
    if (this.options.repeat === -1) {  // 使用默认值
      // Thông tin như gif.lsd.globalColorTableFlag, gif.applicationExtensions có thể chứa thông tin vòng lặp
      // Kiểm tra xem có ứng dụng mở rộng NETSCAPE2.0 không, phần mở rộng này định nghĩa số lần lặp
      let originalRepeat = 0  // 0 表示无限循环
      
      if (gif.applicationExtensions) {
        const netscapeExt = gif.applicationExtensions.find(ext => 
          ext.identifier === 'NETSCAPE' && ext.authenticationCode === '2.0'
        )
        if (netscapeExt && netscapeExt.data && netscapeExt.data.length >= 3) {
          // Định dạng NETSCAPE2.0: [0x01, byte thấp, byte cao]
          originalRepeat = netscapeExt.data[1] + (netscapeExt.data[2] << 8)
        }
      }
      
      this.gifRepeat = originalRepeat
      
      if (this.options.debug) {
        console.log(`Cài đặt vòng lặp GIF gốc: ${originalRepeat === 0 ? 'lặp vô hạn' : originalRepeat + ' lần'}`)
      }
    } else {
      this.gifRepeat = this.options.repeat
    }
    
    // 创建主画布来处理每一帧
    const canvas = document.createElement('canvas')
    canvas.width = this.originalWidth
    canvas.height = this.originalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
  // Lưu dữ liệu ảnh của khung trước (dùng cho disposal type 3)
    let previousFrameData = null
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      
      // Xử lý canvas theo disposal method
      if (i === 0) {
        // Khung đầu: xóa toàn bộ canvas thành trong suốt
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      } else if (frame.disposalType === 2) {
        // Xóa về màu nền (trong suốt)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      } else if (frame.disposalType === 3 && previousFrameData) {
        // Khôi phục về trạng thái khung trước
        ctx.putImageData(previousFrameData, 0, 0)
      }
      // disposalType 0 và 1: không xóa, giữ nguyên nội dung hiện tại
      
  // Lưu trạng thái hiện tại (dùng cho disposalType 3)
      if (frame.disposalType === 3) {
        previousFrameData = ctx.getImageData(0, 0, this.originalWidth, this.originalHeight)
      }
      
  // Tạo canvas cho khung và vẽ khung hiện tại
      const frameCanvas = document.createElement('canvas')
      frameCanvas.width = frame.dims.width
      frameCanvas.height = frame.dims.height
      const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true })
      
  // Đảm bảo nền canvas khung trong suốt
      frameCtx.clearRect(0, 0, frame.dims.width, frame.dims.height)
      
  // Vẽ dữ liệu pixel của khung
      const imageData = new ImageData(frame.patch, frame.dims.width, frame.dims.height)
      frameCtx.putImageData(imageData, 0, 0)
      
  // Vẽ khung lên canvas chính
      ctx.drawImage(frameCanvas, frame.dims.left || 0, frame.dims.top || 0)
      
  // Lấy dữ liệu ảnh đầy đủ của khung
      const fullFrameImageData = ctx.getImageData(0, 0, this.originalWidth, this.originalHeight)
      this.frames.push(fullFrameImageData)
      this.delays.push(frame.delay || 100)
    }
    
    if (this.options.debug) {
      console.log(`GIF parsed (gifuct-js): ${this.originalWidth}x${this.originalHeight}, frames: ${this.frames.length}`)
    }
    
    return this.frames
  }

  /**
   * Thu nhỏ một khung ảnh
   * @param {ImageData} imageData - Dữ liệu ảnh nguồn
   * @param {number} targetWidth - Chiều rộng mục tiêu
   * @param {number} targetHeight - Chiều cao mục tiêu
   * @returns {ImageData} Dữ liệu ảnh sau khi thu nhỏ
   */
  scaleFrame(imageData, targetWidth, targetHeight) {
    const sourceCanvas = document.createElement('canvas')
    const sourceCtx = sourceCanvas.getContext('2d')
    sourceCanvas.width = imageData.width
    sourceCanvas.height = imageData.height
    
  // Đảm bảo nền canvas nguồn trong suốt
    sourceCtx.clearRect(0, 0, imageData.width, imageData.height)
    sourceCtx.putImageData(imageData, 0, 0)
    
    const targetCanvas = document.createElement('canvas')
    const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true })
    targetCanvas.width = targetWidth
    targetCanvas.height = targetHeight
    
  // Đảm bảo nền canvas đích trong suốt
    targetCtx.clearRect(0, 0, targetWidth, targetHeight)
    
  // Chọn chiến lược thu phóng theo chế độ
    const scaleRatio = Math.min(targetWidth / imageData.width, targetHeight / imageData.height)
    const scalingMode = this.getOptimalScalingMode(scaleRatio)
    
  // Đối với thu phóng lớn, dùng thuật toán nhiều bước để giảm mờ cạnh
    if (scaleRatio < 0.5 && scalingMode === 'pixelated') {
      this.scaleWithEdgePreservation(sourceCtx, targetCtx, imageData.width, imageData.height, targetWidth, targetHeight)
    } else {
      this.applyScalingMode(targetCtx, scalingMode)
      targetCtx.drawImage(
        sourceCanvas, 
        0, 0, imageData.width, imageData.height,
        0, 0, targetWidth, targetHeight
      )
    }
    
    return targetCtx.getImageData(0, 0, targetWidth, targetHeight)
  }

  /**
   * Chọn chế độ thu phóng tối ưu theo tỉ lệ
   * @param {number} scaleRatio - Tỉ lệ thu phóng
   * @returns {string} Chế độ thu phóng
   */
  getOptimalScalingMode(scaleRatio) {
    if (this.options.scalingMode !== 'auto') {
      return this.options.scalingMode
    }
    
    // Tự động chọn chế độ thu phóng
    if (scaleRatio >= 0.5) {
      // Tỉ lệ lớn, dùng thu phóng mượt để giữ chất lượng
      return 'smooth'
    } else if (scaleRatio >= 0.25) {
      // Tỉ lệ trung bình, dùng chế độ sắc nét để giữ cạnh rõ
      return 'sharp'
    } else {
      // Thu rất nhiều, dùng pixelated để tránh mờ
      return 'pixelated'
    }
  }

  /**
   * Áp dụng chế độ thu phóng chỉ định
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} mode - Chế độ thu phóng
   */
  applyScalingMode(ctx, mode) {
    switch (mode) {
      case 'smooth':
        // Thu phóng mượt - phù hợp cho thay đổi kích thước nhỏ
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        break
        
      case 'sharp':
        // Thu phóng sắc nét - phù hợp tỉ lệ trung bình, giữ cạnh rõ
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        break
        
      case 'pixelated':
        // Thu phóng pixelated - phù hợp thu phóng lớn, tránh mờ
        ctx.imageSmoothingEnabled = false
        break
        
      default:
        // Mặc định dùng thu phóng mượt
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
    }
  }

  /**
   * Thuật toán giữ cạnh khi thu phóng - giảm hiện tượng đường bị dày
   * @param {CanvasRenderingContext2D} sourceCtx - Context canvas nguồn
   * @param {CanvasRenderingContext2D} targetCtx - Context canvas đích
   * @param {number} sourceWidth - Chiều rộng nguồn
   * @param {number} sourceHeight - Chiều cao nguồn
   * @param {number} targetWidth - Chiều rộng đích
   * @param {number} targetHeight - Chiều cao đích
   */
  scaleWithEdgePreservation(sourceCtx, targetCtx, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const scaleRatio = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    
    // Nếu tỉ lệ rất nhỏ, dùng nhiều bước để giữ cạnh rõ
    if (scaleRatio < 0.5) {
      // Tạo canvas trung gian, thu phóng theo từng bước
      const intermediateCanvas = document.createElement('canvas')
      const intermediateCtx = intermediateCanvas.getContext('2d')
      
  // Bước 1: thu nhỏ tới kích thước trung gian (ít nhất 50%)
      const intermediateWidth = Math.max(sourceWidth * 0.5, targetWidth)
      const intermediateHeight = Math.max(sourceHeight * 0.5, targetHeight)
      
      intermediateCanvas.width = intermediateWidth
      intermediateCanvas.height = intermediateHeight
      
  // Dùng thu phóng pixelated cho bước 1
      intermediateCtx.imageSmoothingEnabled = false
      intermediateCtx.drawImage(
        sourceCtx.canvas,
        0, 0, sourceWidth, sourceHeight,
        0, 0, intermediateWidth, intermediateHeight
      )
      
      // Bước 2: từ kích thước trung gian tới kích thước mục tiêu
      if (intermediateWidth !== targetWidth || intermediateHeight !== targetHeight) {
        // Nếu cần giảm thêm, dùng thu phóng mượt
        targetCtx.imageSmoothingEnabled = true
        targetCtx.imageSmoothingQuality = 'high'
        targetCtx.drawImage(
          intermediateCanvas,
          0, 0, intermediateWidth, intermediateHeight,
          0, 0, targetWidth, targetHeight
        )
      } else {
        // Sao chép trực tiếp
        targetCtx.drawImage(intermediateCanvas, 0, 0)
      }
    } else {
      // Tỉ lệ vừa phải hoặc lớn, dùng pixelated trực tiếp
      targetCtx.imageSmoothingEnabled = false
      targetCtx.drawImage(
        sourceCtx.canvas,
        0, 0, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      )
    }
  }

  /**
   * Tính kích thước mục tiêu giữ tỉ lệ
   * @param {number} originalWidth - Chiều rộng gốc
   * @param {number} originalHeight - Chiều cao gốc
   * @param {number} maxWidth - Chiều rộng tối đa
   * @param {number} maxHeight - Chiều cao tối đa
   * @returns {Object} Object chứa width và height
   */
  calculateTargetSize(originalWidth, originalHeight, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight)
    
    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio)
    }
  }

  /**
   * Hàm chính để thay đổi kích thước
   * @param {File|Blob} gifFile - File GIF đầu vào
   * @param {Object} scaleOptions - Tùy chọn thu phóng
   * @param {number} scaleOptions.maxWidth - Chiều rộng tối đa
   * @param {number} scaleOptions.maxHeight - Chiều cao tối đa
   * @param {boolean} scaleOptions.keepAspectRatio - Có giữ tỉ lệ hay không
   * @returns {Promise<Blob>} Trả về Blob GIF sau khi thu nhỏ
   */
  async scaleGif(gifFile, scaleOptions) {
    try {
      const { maxWidth, maxHeight, keepAspectRatio = true } = scaleOptions
      
      if (!maxWidth || !maxHeight) {
        throw new Error('Phải chỉ định chiều rộng và chiều cao tối đa')
      }
      
      // 解析原始 GIF
      await this.parseGifFrames(gifFile)
      
      // 计算目标尺寸
      let targetSize
      if (keepAspectRatio) {
        targetSize = this.calculateTargetSize(
          this.originalWidth, 
          this.originalHeight, 
          maxWidth, 
          maxHeight
        )
      } else {
        targetSize = { width: maxWidth, height: maxHeight }
      }
      
      this.targetWidth = targetSize.width
      this.targetHeight = targetSize.height
      
      // 检查是否需要缩放
      if (this.targetWidth === this.originalWidth && this.targetHeight === this.originalHeight) {
        if (this.options.debug) {
          console.log('Không cần thay đổi kích thước, trả về file gốc')
        }
        return gifFile
      }
      
      // 缩放所有帧
      const scaledFrames = this.frames.map(frame => 
        this.scaleFrame(frame, this.targetWidth, this.targetHeight)
      )
      
      // 生成新的 GIF
      const scaledGifBlob = await this.generateGif(scaledFrames, this.delays)
      
      if (this.options.debug) {
        console.log(`Thu nhỏ GIF hoàn thành: ${this.originalWidth}x${this.originalHeight} -> ${this.targetWidth}x${this.targetHeight}`)
      }
      
      return scaledGifBlob
      
    } catch (error) {
      throw new Error(`Thu nhỏ GIF thất bại: ${error.message}`)
    }
  }

  /**
   * Tạo file GIF mới
   * @param {Array<ImageData>} frames - Mảng khung ảnh
   * @param {Array<number>} delays - Mảng thời gian trễ
   * @returns {Promise<Blob>} Blob GIF tạo ra
   */
  async generateGif(frames, delays) {
    try {
      // Dùng gif.js để tạo GIF, bất kể đơn khung hay nhiều khung
      return await this.generateGifWithGifJs(frames, delays)
      
    } catch (error) {
      throw new Error(`Tạo GIF thất bại: ${error.message}`)
    }
  }

  /**
   * Sử dụng gif.js để tạo GIF động
   * @param {Array<ImageData>} frames - Mảng khung ảnh
   * @param {Array<number>} delays - Mảng thời gian trễ
   * @returns {Promise<Blob>} Blob GIF tạo ra
   */
  async generateGifWithGifJs(frames, delays) {
    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: this.options.workers,
        quality: this.options.quality,
        width: this.targetWidth,
        height: this.targetHeight,
        transparent: 'rgba(255, 0, 255, 0)',
        repeat: this.gifRepeat !== undefined ? this.gifRepeat : 0,  // 0 biểu thị lặp vô hạn
        workerScript: this.options.workerScript  // Chỉ định đường dẫn script worker
        // gif.js tự xử lý pixel trong suốt, không cần đặt tùy chọn transparent thủ công
      })
      
      // Thêm tất cả khung
      frames.forEach((frameData, index) => {
        const canvas = document.createElement('canvas')
        canvas.width = this.targetWidth
        canvas.height = this.targetHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        
        // 确保画布背景透明
        // Đảm bảo nền canvas trong suốt
        ctx.clearRect(0, 0, this.targetWidth, this.targetHeight)
        ctx.putImageData(frameData, 0, 0)
        
        gif.addFrame(canvas, { delay: delays[index] || 100 })
      })
      
      gif.on('finished', (blob) => {
        if (this.options.debug) {
          console.log(`GIF generated: ${frames.length} frames, ${blob.size} bytes, repeat: ${this.gifRepeat === 0 ? 'lặp vô hạn' : this.gifRepeat + ' lần'}`)
        }
        resolve(blob)
      })
      
      gif.on('abort', () => {
        reject(new Error('Tạo GIF bị huỷ'))
      })
      
      gif.render()
    })
  }

  /**
   * Lấy thông tin GIF
   * @param {File|Blob} gifFile - File GIF
   * @returns {Promise<Object>} Object thông tin GIF
   */
  async getGifInfo(gifFile) {
    try {
      // 使用 parseGifWithGifuct 解析获取信息
      await this.parseGifWithGifuct(gifFile)
      
      return {
        width: this.originalWidth,
        height: this.originalHeight,
        frameCount: this.frames.length,
        totalDuration: this.delays.reduce((sum, delay) => sum + delay, 0),
        repeat: this.gifRepeat,
        fileSize: gifFile.size
      }
    } catch (error) {
      throw new Error(`Lấy thông tin GIF thất bại: ${error.message}`)
    }
  }

  /**
   * Kiểm tra xem có cần thay đổi kích thước
   * @param {File|Blob} gifFile - File GIF
   * @param {number} maxWidth - Chiều rộng tối đa
   * @param {number} maxHeight - Chiều cao tối đa
   * @returns {Promise<boolean>} Có cần thu nhỏ hay không
   */
  async needsScaling(gifFile, maxWidth, maxHeight) {
    const info = await this.getGifInfo(gifFile)
    return info.width > maxWidth || info.height > maxHeight
  }

  /**
   * Chuyển file sang ArrayBuffer
   * @param {File|Blob} file - Đối tượng file
   * @returns {Promise<ArrayBuffer>} ArrayBuffer
   */
  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Thu nhỏ hàng loạt nhiều file GIF
   * @param {Array<File>} gifFiles - Mảng file GIF
   * @param {Object} scaleOptions - Tùy chọn thu phóng
   * @returns {Promise<Array<Blob>>} Mảng kết quả GIF đã thu nhỏ
   */
  async scaleBatchGifs(gifFiles, scaleOptions) {
    const results = []
    
    for (let i = 0; i < gifFiles.length; i++) {
      try {
        if (this.options.debug) {
          console.log(`Đang xử lý file thứ ${i + 1}/${gifFiles.length}`)
        }
        
        const scaledGif = await this.scaleGif(gifFiles[i], scaleOptions)
        results.push({
          index: i,
          success: true,
          result: scaledGif,
          originalFile: gifFiles[i]
        })
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          originalFile: gifFiles[i]
        })
      }
    }
    
    return results
  }

  /**
   * Lấy kích thước đề xuất để thu phóng
   * @param {number} originalWidth - Chiều rộng gốc
   * @param {number} originalHeight - Chiều cao gốc
   * @param {Array<Object>} targetSizes - Mảng kích thước mục tiêu, ví dụ [{name: '32x32', width: 32, height: 32}]
   * @returns {Object} Cấu hình đề xuất
   */
  getSuggestedScaling(originalWidth, originalHeight, targetSizes = []) {
    const suggestions = []
    
    // 默认目标尺寸
  const defaultSizes = [
      { name: 'emoji_32', width: 32, height: 32 },
      { name: 'emoji_64', width: 64, height: 64 },
      { name: 'small', width: 48, height: 48 },
      { name: 'medium', width: 96, height: 96 }
    ]
    
    const sizes = targetSizes.length > 0 ? targetSizes : defaultSizes
    
    sizes.forEach(size => {
      const targetSize = this.calculateTargetSize(
        originalWidth, 
        originalHeight, 
        size.width, 
        size.height
      )
      
      suggestions.push({
        name: size.name,
        target: size,
        actual: targetSize,
        needsScaling: targetSize.width !== originalWidth || targetSize.height !== originalHeight,
        scaleRatio: targetSize.width / originalWidth
      })
    })
    
    return {
      original: { width: originalWidth, height: originalHeight },
      suggestions
    }
  }

  /**
   * Giải phóng tài nguyên
   */
  dispose() {
    if (this.canvas) {
      this.canvas = null
      this.ctx = null
    }
    this.frames = []
    this.delays = []
    
    // Hủy các Object URLs nếu có
    if (this.tempObjectUrls) {
      this.tempObjectUrls.forEach(url => URL.revokeObjectURL(url))
      this.tempObjectUrls = []
    }
  }
}

export default GifScaler
