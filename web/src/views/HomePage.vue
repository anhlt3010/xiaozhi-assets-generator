<template>
  <div>
    <!-- Thông báo trạng thái cấu hình (Thông báo nổi góc phải dưới) -->
    <div
      v-if="hasStoredConfig"
      class="fixed bottom-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg transition-opacity duration-300 min-w-[300px]"
      @mouseenter="resetAutoHideTimer"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-blue-800 font-medium">Phát hiện cấu hình đã lưu</span>
        </div>
        <button 
          @click="closeConfigNotice"
          class="text-gray-500 hover:text-gray-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <p class="text-blue-600 text-sm mb-3">
        Cấu hình đã được khôi phục tự động, bạn có thể tiếp tục tiến độ trước đó hoặc bắt đầu lại
      </p>
      <div class="flex justify-end space-x-2">
        <button 
          @click="confirmReset"
          class="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Bắt đầu lại
        </button>
      </div>
    </div>

    <!-- Chỉ báo bước -->
    <div class="flex items-center justify-center mb-8">
      <div v-for="(step, index) in steps" :key="index" class="flex items-center">
        <div class="flex flex-col items-center">
          <div :class="getStepClass(index)">
            {{ index + 1 }}
          </div>
          <span class="text-sm mt-2 text-gray-600">{{ step.title }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="w-16 h-0.5 bg-gray-300 mx-4"></div>
      </div>
    </div>

    <!-- Nội dung bước -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <ChipConfig 
        v-if="currentStep === 0"
        v-model="config.chip"
        @next="nextStep"
      />
      
      <ThemeDesign 
        v-if="currentStep === 1"
        v-model="config.theme"
        :chipModel="config.chip.model"
        :activeTab="activeThemeTab"
        @next="nextStep"
        @prev="prevStep"
        @tabChange="handleThemeTabChange"
      />
      
      <GenerateSummary 
        v-if="currentStep === 2"
        :config="config"
        @generate="handleGenerate"
        @prev="prevStep"
      />
    </div>

    <!-- Modal tạo -->
    <GenerateModal
      v-if="showGenerateModal"
      :config="config"
      @close="showGenerateModal = false"
      @generate="handleModalGenerate"
      @startFlash="handleStartFlash"
      @cancelFlash="handleCancelFlash"
    />

    <!-- Modal xác nhận đặt lại -->
    <!-- Đã xóa hộp thoại xác nhận đặt lại -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import ChipConfig from '@/components/ChipConfig.vue'
import ThemeDesign from '@/components/ThemeDesign.vue'
import GenerateSummary from '@/components/GenerateSummary.vue'
import GenerateModal from '@/components/GenerateModal.vue'
import configStorage from '@/utils/ConfigStorage.js'
import AssetsBuilder from '@/utils/AssetsBuilder.js'
import WebSocketTransfer from '@/utils/WebSocketTransfer.js'

const currentStep = ref(0)
const showGenerateModal = ref(false)
const activeThemeTab = ref('wakeword') // Giữ trạng thái tab của trang thiết kế giao diện

// Trạng thái liên quan đến lưu trữ
const hasStoredConfig = ref(false) // Đã khôi phục cấu hình từ bộ nhớ hay chưa
const isAutoSaveEnabled = ref(false) // Đã bật tự động lưu hay chưa
const isResetting = ref(false)
const isLoading = ref(true)
const assetsBuilder = new AssetsBuilder()
const autoHideTimer = ref(null) // Mới thêm: Bộ đếm thời gian tự động ẩn
const webSocketTransfer = ref(null) // Instance truyền WebSocket

const steps = [
  { title: 'Cấu hình chip', key: 'chip' },
  { title: 'Thiết kế giao diện', key: 'theme' },
  { title: 'Xem trước hiệu ứng', key: 'generate' }
]

const config = ref({
  chip: {
    model: '',
    display: {
      width: 320,
      height: 240,
      color: 'RGB565'
    },
    preset: ''
  },
  theme: {
    wakeword: '',
    font: {
      type: 'preset',
      preset: 'font_puhui_deepseek_20_4',
      custom: {
        file: null,
        size: 20,
        bpp: 4,
        charset: 'deepseek'
      }
    },
    emoji: {
      type: '',
      preset: '',
      custom: {
        size: { width: 160, height: 120 },
        format: 'png',
        images: {}
      }
    },
    skin: {
      light: {
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        backgroundImage: null
      },
      dark: {
        backgroundType: 'color', 
        backgroundColor: '#121212',
        textColor: '#ffffff',
        backgroundImage: null
      }
    }
  }
})

const canGenerate = computed(() => {
  return config.value.chip.model && 
         (config.value.theme.font.preset || config.value.theme.font.custom.file)
})

const getStepClass = (index) => {
  if (index < currentStep.value) return 'step-indicator completed'
  if (index === currentStep.value) return 'step-indicator active'
  return 'step-indicator inactive'
}

const nextStep = async () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    
    // Bật tự động lưu (nếu chưa bật)
    if (!isAutoSaveEnabled.value) {
      isAutoSaveEnabled.value = true
      await saveConfigToStorage()
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const handleGenerate = () => {
  showGenerateModal.value = true
}

const handleModalGenerate = async (selectedItems) => {
  // TODO: Triển khai logic tạo thực tế
}

// Lấy token từ tham số URL
const getToken = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('token')
}

// Gọi công cụ MCP
const callMcpTool = async (toolName, params = {}) => {
  try {
    const token = getToken()
    if (!token) {
      throw new Error('Không tìm thấy token xác thực')
    }

    const response = await fetch('/api/messaging/device/tools/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: toolName,
        arguments: params
      })
    })

    if (response.ok) {
      const result = await response.json()
      return result
    } else {
      const errorText = await response.text()
      throw new Error(`Gọi ${toolName} thất bại: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error(`Gọi công cụ MCP ${toolName} thất bại:`, error.message)
    throw error
  }
}

// Xử lý bắt đầu nạp trực tuyến
const handleStartFlash = async (flashData) => {
  const { blob, onProgress, onComplete, onError } = flashData

  try {
    const token = getToken()
    if (!token) {
      throw new Error('Không tìm thấy token xác thực')
    }

    // Bước 1: Kiểm tra trạng thái thiết bị
    onProgress(5, 'Đang kiểm tra trạng thái thiết bị...')
    const deviceStatus = await callMcpTool('self.get_device_status')
    // Kiểm tra thiết bị có trực tuyến không (thông qua cuộc gọi API thành công)

    // Bước 2: Khởi tạo truyền WebSocket và lấy URL tải xuống
    onProgress(15, 'Đang khởi tạo dịch vụ truyền...')
    webSocketTransfer.value = new WebSocketTransfer(token)

    // Tạo một Promise để đợi URL tải xuống sẵn sàng
    let downloadUrlReady = null
    const downloadUrlPromise = new Promise((resolve, reject) => {
      downloadUrlReady = resolve
    })

    // Tạo một Promise để đợi sự kiện transfer_started
    let transferStartedResolver = null
    const transferStartedPromise = new Promise((resolve, reject) => {
      transferStartedResolver = resolve
    })

    // Khởi tạo phiên WebSocket (chỉ thiết lập kết nối và lấy URL)
    webSocketTransfer.value.onTransferStarted = () => {
      // Khi nhận được sự kiện transfer_started, giải quyết Promise đang đợi
      if (transferStartedResolver) {
        transferStartedResolver()
        transferStartedResolver = null
      }
    }

    await webSocketTransfer.value.initializeSession(
      blob,
      (progress, step) => {
        // Tiến độ khởi tạo: 15-30
        onProgress(15 + progress * 0.75, step)
      },
      (error) => {
        console.error('Khởi tạo WebSocket thất bại:', error)
        onError('Khởi tạo dịch vụ truyền thất bại: ' + error.message)
      },
      (downloadUrl) => {
        downloadUrlReady(downloadUrl)
      }
    )

    // Đợi URL tải xuống sẵn sàng
    const downloadUrl = await downloadUrlPromise

    // Bước 3: Đặt URL tải xuống cho thiết bị
    onProgress(30, 'Đang đặt URL tải xuống thiết bị...')
    await callMcpTool('self.assets.set_download_url', {
      url: downloadUrl
    })

    // Bước 4: Khởi động lại thiết bị
    onProgress(40, 'Đang khởi động lại thiết bị...')
    // Lệnh reboot không có giá trị trả về, không cần đợi, gọi trực tiếp
    callMcpTool('self.reboot').catch(error => {
      console.warn('Cảnh báo gọi lệnh reboot (thiết bị có thể đã khởi động lại):', error)
      // Ngay cả khi reboot thất bại, tiếp tục quy trình vì thiết bị có thể đã khởi động lại
    })

    // Bước 5: Đợi thiết bị khởi động lại và thiết lập kết nối HTTP (thông qua sự kiện transfer_started)
    onProgress(50, 'Đang đợi thiết bị khởi động lại...')

    // Đợi sự kiện transfer_started, đặt thời gian chờ 60 giây
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Thời gian chờ thiết bị khởi động lại (60 giây)')), 60000)
    })

    await Promise.race([transferStartedPromise, timeoutPromise])

    // Bước 6: Bắt đầu truyền tệp thực tế
    onProgress(60, 'Đang bắt đầu truyền tệp...')

    // Thiết bị đã sẵn sàng, bắt đầu truyền trực tiếp (transfer_started đã nhận, sendFileData sẽ thực thi ngay)
    await webSocketTransfer.value.startTransfer(
      (progress, step) => {
        // Tiến độ truyền tệp: 60-100
        const adjustedProgress = 60 + (progress * 0.4)
        onProgress(Math.round(adjustedProgress), step)
      },
      (error) => {
        onError(error.message)
      },
      () => {
        onComplete()
      }
    )

    // Dọn dẹp tham chiếu callback
    webSocketTransfer.value.onTransferStarted = null

  } catch (error) {
    console.error('Nạp trực tuyến thất bại:', error)
    onError(error.message)
  }
}

// Xử lý hủy nạp
const handleCancelFlash = () => {
  if (webSocketTransfer.value) {
    webSocketTransfer.value.cancel()
    webSocketTransfer.value.destroy()
    webSocketTransfer.value = null
  }
}

const handleThemeTabChange = (tabId) => {
  activeThemeTab.value = tabId
}

// Tải cấu hình từ bộ nhớ
const loadConfigFromStorage = async () => {
  try {
    isLoading.value = true
    const storedData = await configStorage.loadConfig()
    
    if (storedData) {
      // Khôi phục cấu hình
      config.value = storedData.config
      currentStep.value = storedData.currentStep
      activeThemeTab.value = storedData.activeThemeTab
      hasStoredConfig.value = true // Hiển thị thông báo "Phát hiện cấu hình đã lưu"
      isAutoSaveEnabled.value = true // Bật tự động lưu
      
      // Xóa bộ đếm thời gian trước đó
      if (autoHideTimer.value) {
        clearTimeout(autoHideTimer.value)
      }
      
      // Đặt tự động ẩn thông báo sau 5 giây
      autoHideTimer.value = setTimeout(() => {
        hasStoredConfig.value = false
      }, 5000)
      
      // Đặt cấu hình cho AssetsBuilder (chế độ không nghiêm ngặt, cho phép khôi phục tệp trước khi kiểm tra)
      assetsBuilder.setConfig(config.value, { strict: false })
      await assetsBuilder.restoreAllResourcesFromStorage(config.value)
      
      // Kích hoạt một lần sao chép nông để làm mới tham chiếu, tránh thực thi createObjectURL trên giá trị giữ chỗ khi render
      try {
        const images = config.value?.theme?.emoji?.custom?.images || {}
        config.value = {
          ...config.value,
          theme: {
            ...config.value.theme,
            emoji: {
              ...config.value.theme.emoji,
              custom: {
                ...config.value.theme.emoji.custom,
                images: { ...images }
              }
            }
          }
        }
      } catch (e) {}
      
    } else {
      hasStoredConfig.value = false
      isAutoSaveEnabled.value = false
    }
  } catch (error) {
    console.error('Tải cấu hình thất bại:', error)
    hasStoredConfig.value = false
    isAutoSaveEnabled.value = false
  } finally {
    isLoading.value = false
  }
}

// Lưu cấu hình vào bộ nhớ
const saveConfigToStorage = async () => {
  try {
    await configStorage.saveConfig(config.value, currentStep.value, activeThemeTab.value)
  } catch (error) {
    console.error('Lưu cấu hình thất bại:', error)
  }
}

// Xác nhận bắt đầu lại
const confirmReset = async () => {
  try {
    isResetting.value = true
    
    // Dọn dẹp dữ liệu lưu trữ của AssetsBuilder
    await assetsBuilder.clearAllStoredData()
    
    // Đặt lại cấu hình về giá trị mặc định
    config.value = {
      chip: {
        model: '',
        display: {
          width: 320,
          height: 240,
          color: 'RGB565'
        },
        preset: ''
      },
      theme: {
        wakeword: '',
        font: {
          type: 'preset',
          preset: 'font_puhui_deepseek_20_4',
          custom: {
            file: null,
            size: 20,
            bpp: 4,
            charset: 'deepseek'
          }
        },
        emoji: {
          type: '',
          preset: '',
          custom: {
            size: { width: 64, height: 64 },
            format: 'png',
            images: {}
          }
        },
        skin: {
          light: {
            backgroundType: 'color',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            backgroundImage: null
          },
          dark: {
            backgroundType: 'color', 
            backgroundColor: '#121212',
            textColor: '#ffffff',
            backgroundImage: null
          }
        }
      }
    }
    
    // Đặt lại bước và trạng thái
    currentStep.value = 0
    activeThemeTab.value = 'wakeword'
    hasStoredConfig.value = false
    isAutoSaveEnabled.value = false
    
  } catch (error) {
    console.error('Đặt lại cấu hình thất bại:', error)
    alert('Đặt lại thất bại, vui lòng làm mới trang và thử lại')
  } finally {
    isResetting.value = false
  }
}

// Theo dõi thay đổi cấu hình, tự động lưu
watch(config, async (newConfig) => {
  if (!isLoading.value && isAutoSaveEnabled.value) {
    await saveConfigToStorage()
  }
}, { deep: true })

// Theo dõi thay đổi bước, tự động lưu
watch(currentStep, async () => {
  if (!isLoading.value && isAutoSaveEnabled.value) {
    await saveConfigToStorage()
  }
})

// Theo dõi thay đổi tab giao diện, tự động lưu
watch(activeThemeTab, async () => {
  if (!isLoading.value && isAutoSaveEnabled.value) {
    await saveConfigToStorage()
  }
})

// Khởi tạo khi tải trang
onMounted(async () => {
  await configStorage.initialize()
  await loadConfigFromStorage()
})

// Xóa bộ đếm thời gian khi hủy component
onUnmounted(() => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }
})

// Sửa logic nút đóng
const closeConfigNotice = () => {
  hasStoredConfig.value = false
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }
}

// Đặt lại bộ đếm thời gian tự động ẩn (gọi khi di chuột vào)
const resetAutoHideTimer = () => {
  // Xóa bộ đếm thời gian trước đó
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }

  // Đặt bộ đếm thời gian 5 giây mới
  autoHideTimer.value = setTimeout(() => {
    hasStoredConfig.value = false
  }, 5000)
}
</script>