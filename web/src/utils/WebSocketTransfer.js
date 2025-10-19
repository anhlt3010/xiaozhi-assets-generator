class WebSocketTransfer {
  constructor(token) {
    this.token = token
    this.ws = null
    this.isConnected = false
    this.isCancelled = false
    this.chunkSize = 64 * 1024 // 64KB per chunk
    this.onProgress = null
    this.onError = null
    this.onComplete = null
    this.onDownloadUrlReady = null
  this.onTransferStarted = null // Thêm: callback cho sự kiện transfer_started
  this.currentSession = null
  this.totalBytesSent = 0 // Thêm: theo dõi tổng số byte đã gửi
  this.isSendingChunk = false // Thêm: đánh dấu xem có đang gửi chunk dữ liệu hay không
  }

  // 连接到transfer服务器
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // 使用固定的transfer服务器地址
        const wsUrl = `wss://api.tenclass.net/transfer/?token=${encodeURIComponent(this.token)}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnected = true
          console.log('WebSocket connected to transfer server')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnected = false
          reject(new Error('Kết nối WebSocket thất bại'))
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          this.isConnected = false
        }

        // 设置连接超时
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws.close()
            reject(new Error('Kết nối WebSocket quá thời gian'))
          }
        }, 10000)

      } catch (error) {
  reject(new Error(`Tạo kết nối WebSocket thất bại: ${error.message}`))
      }
    })
  }

  // 处理WebSocket消息
  handleMessage(event) {
    try {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data)

        switch (message.type) {
          case 'file_created':
            if (this.currentSession) {
              this.currentSession.url = message.url
              // Thông báo URL tải xuống đã sẵn sàng
              if (this.onDownloadUrlReady) {
                this.onDownloadUrlReady(message.url)
              }
              // Chờ tin nhắn transfer_started rồi mới bắt đầu gửi dữ liệu
            }
            break

          case 'transfer_started':
            if (this.currentSession) {
              // Đánh dấu đã nhận tin nhắn transfer_started
              this.currentSession.transferStarted = true

              // Thông báo cho listener bên ngoài
              if (this.onTransferStarted) {
                this.onTransferStarted()
              }

              // Nếu phiên truyền đã sẵn sàng, bắt đầu gửi dữ liệu tệp
              if (this.currentSession.transferReady) {
                this.sendFileData()
              }
            }
            break

          case 'ack':
            // Nhận xác nhận, kiểm tra và cập nhật bytesSent
            if (this.currentSession) {
              const { blob } = this.currentSession
              const totalSize = blob.size
              const serverBytesSent = message.bytesSent

              // Xác minh bytesSent do server báo cáo
              if (serverBytesSent < 0) {
                console.error('Invalid server bytesSent (negative):', serverBytesSent)
                this.isSendingChunk = false // 重置发送标志
                if (this.onError) {
                  this.onError(new Error('Máy chủ trả về số byte không hợp lệ'))
                }
                return
              }

              if (serverBytesSent > totalSize) {
                console.error(`Server bytesSent (${serverBytesSent}) exceeds fileSize (${totalSize})`)
                this.isSendingChunk = false // 重置发送标志
                if (this.onError) {
                  this.onError(new Error('Số byte do máy chủ báo lớn hơn kích thước tệp'))
                }
                return
              }

              // Đánh dấu chunk hiện tại đã gửi xong
              this.isSendingChunk = false

              // Sử dụng bytesSent được server xác nhận
              if (serverBytesSent > this.currentSession.bytesSent) {
                this.currentSession.bytesSent = serverBytesSent
              }

              // Gửi chunk tiếp theo
              this.sendFileData()
            }
            break

          case 'transfer_completed':
            // Xác minh tính toàn vẹn truyền
            if (this.currentSession) {
              const expectedSize = this.currentSession.blob.size
              if (this.totalBytesSent !== expectedSize) {
                console.warn(`Kích thước truyền không khớp: đã gửi ${this.totalBytesSent} byte, dự kiến ${expectedSize} byte`)
              }
            }

            if (this.onComplete) {
              this.onComplete()
            }
            break

          case 'error':
            console.error('Transfer error:', message.message)
            if (this.onError) {
              this.onError(new Error(message.message))
            }
            break
        }
      }
    } catch (error) {
      console.error('Lỗi khi xử lý tin nhắn:', error)
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  // 发送文件数据
  async sendFileData() {
    // 防止并发发送
    if (this.isSendingChunk) {
      return
    }

    if (!this.currentSession || this.isCancelled) {
      return
    }

    const { blob } = this.currentSession
    const totalSize = blob.size
    let bytesSent = this.currentSession.bytesSent

  // Kiểm tra nghiêm ngặt: đảm bảo không gửi vượt quá kích thước tệp
    if (bytesSent >= totalSize) {
      if (this.onProgress) {
    this.onProgress(100, 'Truyền xong, đang chờ thiết bị xác nhận...')
      }
      return
    }

    this.isSendingChunk = true

  // Xác minh lại bytesSent không vượt quá kích thước tệp
    if (bytesSent > totalSize) {
      console.error(`Critical error: bytesSent (${bytesSent}) exceeds fileSize (${totalSize})`)
      if (this.onError) {
    this.onError(new Error('Số byte truyền vượt quá kích thước tệp'))
      }
      return
    }

  // Tính kích thước chunk tiếp theo, đảm bảo không vượt ranh giới tệp
    const remainingBytes = Math.max(0, totalSize - bytesSent)
    const chunkSize = Math.min(this.chunkSize, remainingBytes)

    if (chunkSize <= 0) {
      return
    }

    const chunk = blob.slice(bytesSent, bytesSent + chunkSize)

    try {
    // Đọc chunk của tệp
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsArrayBuffer(chunk)
      })

      if (this.isCancelled) {
        return
      }

    // Gửi dữ liệu nhị phân
      this.ws.send(arrayBuffer)

    // Cập nhật bytesSent cục bộ (cập nhật lạc quan)
      const newBytesSent = bytesSent + chunkSize
      this.currentSession.bytesSent = newBytesSent
    this.totalBytesSent += chunkSize // Cập nhật tổng byte đã gửi

    // Xác minh bytesSent sau cập nhật không vượt quá kích thước tệp
      if (newBytesSent > totalSize) {
        console.error(`Critical error: bytesSent (${newBytesSent}) exceeds fileSize (${totalSize})`)
        if (this.onError) {
      this.onError(new Error('Số byte truyền vượt quá kích thước tệp'))
        }
        return
      }

    // Xác minh thêm: tổng số byte đã gửi cũng không nên vượt quá kích thước tệp
      if (this.totalBytesSent > totalSize) {
        console.error(`Critical error: totalBytesSent (${this.totalBytesSent}) exceeds fileSize (${totalSize})`)
        if (this.onError) {
      this.onError(new Error('Tổng số byte đã gửi vượt quá kích thước tệp'))
        }
        return
      }

    // Cập nhật tiến độ (chỉ phần tiến độ truyền)
      const transferProgress = Math.round(newBytesSent / totalSize * 60) + 40 // 40-100范围
    const step = `Đang truyền... ${Math.round(newBytesSent / 1024)}KB / ${Math.round(totalSize / 1024)}KB`

      if (this.onProgress) {
        this.onProgress(transferProgress, step)
      }

    } catch (error) {
    console.error('Lỗi khi gửi chunk tệp:', error)
    this.isSendingChunk = false // Đặt lại cờ đang gửi
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  // 初始化传输会话（只建立连接和获取URL）
  async initializeSession(blob, onProgress, onError, onDownloadUrlReady) {
    return new Promise((resolve, reject) => {
      this.onProgress = onProgress
      this.onError = (error) => {
        if (onError) onError(error)
        reject(error)
      }
      this.onDownloadUrlReady = (url) => {
        if (onDownloadUrlReady) onDownloadUrlReady(url)
        resolve(url)
      }
      this.isCancelled = false

      try {
        // Kết nối tới server WebSocket
        if (this.onProgress) {
          this.onProgress(5, 'Đang kết nối tới server truyền...')
        }

        this.connect().then(() => {
          // Gửi yêu cầu tạo phiên tệp
          if (this.onProgress) {
            this.onProgress(10, 'Đang tạo phiên tệp...')
          }

          const createMessage = {
            type: 'create_file',
            fileName: 'assets.bin',
            fileSize: blob.size
          }

          this.ws.send(JSON.stringify(createMessage))

          // Lưu tham chiếu blob, chờ tin nhắn file_created
          this.currentSession = {
            blob: blob,
            bytesSent: 0,
            fileSize: blob.size,
            transferStarted: false,
            transferReady: true // Thiết lập true ban đầu vì sau initializeSession có thể bắt đầu truyền
          }
          // Đặt lại tổng byte đã gửi
          this.totalBytesSent = 0
        }).catch(error => {
          console.error('Transfer initialization failed:', error)
          if (this.onError) {
            this.onError(error)
          }
        })

      } catch (error) {
        console.error('Transfer initialization failed:', error)
        if (this.onError) {
          this.onError(error)
        }
      }
    })
  }

  // 开始传输文件数据（假设会话已初始化）
  async startTransfer(onProgress, onError, onComplete) {
    return new Promise((resolve, reject) => {
      this.onProgress = onProgress
      this.onError = (error) => {
        this.isSendingChunk = false // 重置发送标志
        if (onError) onError(error)
        reject(error)
      }
      this.onComplete = () => {
        this.isSendingChunk = false // 重置发送标志
        if (onComplete) onComplete()
        resolve()
      }

      if (!this.currentSession || !this.currentSession.blob) {
        const error = new Error('Phiên truyền chưa được khởi tạo')
        if (this.onError) this.onError(error)
        reject(error)
        return
      }

      // Thiết lập trạng thái truyền, chờ tin nhắn transfer_started
      this.currentSession.transferReady = true

      // Nếu đã nhận được transfer_started thì bắt đầu truyền
      if (this.currentSession.transferStarted) {
        this.sendFileData()
      } else {
      }
      // Ngược lại, chờ tin nhắn transfer_started
    })
  }

  // 开始传输文件
  async transferFile(blob, onProgress, onError, onComplete, onDownloadUrlReady) {
    // Nếu cung cấp callback onDownloadUrlReady, sử dụng truyền theo giai đoạn
    if (onDownloadUrlReady) {
      await this.initializeSession(blob, onProgress, onError, onDownloadUrlReady)
      // Trả về, cho phép caller quyết định khi nào bắt đầu truyền
      return
    }

    // 否则，使用传统的一次性传输
    this.onProgress = onProgress
    this.onError = onError
    this.onComplete = onComplete
    this.isCancelled = false

    try {
      // Kết nối tới server WebSocket
      if (this.onProgress) {
        this.onProgress(5, 'Đang kết nối tới server truyền...')
      }

      await this.connect()

      // Gửi yêu cầu tạo phiên tệp
      if (this.onProgress) {
        this.onProgress(10, 'Đang tạo phiên tệp...')
      }

      const createMessage = {
        type: 'create_file',
        fileName: 'assets.bin',
        fileSize: blob.size
      }

      this.ws.send(JSON.stringify(createMessage))

      // Lưu tham chiếu blob, chờ tin nhắn file_created
      this.currentSession = {
        blob: blob,
        bytesSent: 0,
        fileSize: blob.size,
        transferStarted: false,
        transferReady: true // Ở chế độ truyền truyền thống, đặt true trực tiếp
      }

    } catch (error) {
      console.error('Transfer initialization failed:', error)
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  // 取消传输
  cancel() {
    this.isCancelled = true
    this.isSendingChunk = false // Đặt lại cờ đang gửi
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close()
    }
  }

  // 清理资源
  destroy() {
    this.cancel()
    this.onProgress = null
    this.onError = null
    this.onComplete = null
    this.onDownloadUrlReady = null
    this.onTransferStarted = null
    this.totalBytesSent = 0
    this.isSendingChunk = false
  }
}

export default WebSocketTransfer
