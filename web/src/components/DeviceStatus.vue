<template>
  <!-- Bố cục máy tính -->
  <div v-if="showComponent" class="hidden lg:flex items-center space-x-4" :class="deviceStatus.isOnline ? '' : 'opacity-60'">
    <!-- Chỉ báo trạng thái thiết bị -->
    <div class="flex items-center space-x-2">
      <!-- Biểu tượng trạng thái trực tuyến -->
      <div class="flex items-center space-x-1">
        <div
          :class="[
            'w-2 h-2 rounded-full',
            deviceStatus.isOnline ? 'bg-green-500' : 'bg-gray-400'
          ]"
        ></div>
        <span :class="[
          'text-sm font-medium',
          deviceStatus.isOnline ? 'text-gray-700' : 'text-gray-500'
        ]">
          {{ deviceStatus.isOnline ? 'Thiết bị trực tuyến' : 'Thiết bị ngoại tuyến' }}
        </span>
      </div>

      <!-- Trạng thái mạng -->
      <div v-if="deviceStatus.isOnline && deviceInfo.network" class="flex items-center space-x-1">
        <!-- Biểu tượng Wi-Fi -->
        <svg v-if="deviceInfo.network.type === 'wifi'" class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 9.636c5.076 5.076 13.308 5.076 18.384 0a1 1 0 01-1.414-1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.879a3 3 0 00-4.243 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.414 1.414zM10 16a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
        </svg>
        <!-- Biểu tượng 4G -->
        <svg v-else-if="deviceInfo.network.type === '4g'" class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
        </svg>
        <span class="text-xs text-gray-500">{{ getSignalDisplayText(deviceInfo.network.signal) }}</span>
      </div>
    </div>

    <!-- Thông tin chi tiết thiết bị -->
    <div v-if="deviceStatus.isOnline" class="flex items-center space-x-4 text-sm text-gray-600">
      <!-- Thông tin chip -->
      <div v-if="deviceInfo.chip" class="flex items-center space-x-1">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
        </svg>
        <span>{{ deviceInfo.chip.model }}</span>
      </div>

      <!-- Thông tin bo mạch phát triển -->
      <div v-if="deviceInfo.board" class="flex items-center space-x-1">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <span>{{ deviceInfo.board.model }}</span>
      </div>


      <!-- Kích thước phân vùng Assets -->
      <div v-if="deviceInfo.assets" class="flex items-center space-x-1">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
        </svg>
        <span>{{ deviceInfo.assets.size }}</span>
      </div>

      <!-- Độ phân giải màn hình -->
      <div v-if="deviceInfo.screen" class="flex items-center space-x-1">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        <span>{{ deviceInfo.screen.resolution }}</span>
      </div>
    </div>

  </div>

  <!-- Bố cục di động -->
  <div v-if="showComponent" class="lg:hidden flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
    <!-- Thanh trạng thái đầu trang -->
    <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div class="flex items-center space-x-2">
        <div
          :class="[
            'w-2.5 h-2.5 rounded-full',
            deviceStatus.isOnline ? 'bg-green-500' : 'bg-red-400'
          ]"
        ></div>
        <span :class="[
          'text-sm font-medium',
          deviceStatus.isOnline ? 'text-gray-800' : 'text-gray-600'
        ]">
          {{ deviceStatus.isOnline ? 'Thiết bị trực tuyến' : 'Thiết bị ngoại tuyến' }}
        </span>
      </div>

      <!-- Trạng thái mạng -->
      <div v-if="deviceStatus.isOnline && deviceInfo.network" class="flex items-center space-x-1">
        <svg v-if="deviceInfo.network.type === 'wifi'" class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 9.636c5.076 5.076 13.308 5.076 18.384 0a1 1 0 01-1.414-1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.879a3 3 0 00-4.243 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.414 1.414zM10 16a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
        </svg>
        <svg v-else-if="deviceInfo.network.type === '4g'" class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
        </svg>
        <span class="text-xs font-medium text-gray-600">{{ getSignalDisplayText(deviceInfo.network.signal) }}</span>
      </div>
    </div>

    <!-- Vùng thông tin thiết bị -->
    <div v-if="deviceStatus.isOnline" class="px-4 py-3">
      <div class="grid grid-cols-1 gap-2.5">
        <!-- Hàng 1: Chip và bo mạch phát triển -->
        <div class="flex justify-between items-center py-1.5 border-b border-gray-100">
          <div v-if="deviceInfo.chip" class="flex items-center space-x-2 flex-1">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-500 leading-tight">Chip</div>
              <div class="text-sm text-gray-800 font-medium truncate">{{ deviceInfo.chip.model }}</div>
            </div>
          </div>

          <div v-if="deviceInfo.board" class="flex items-center space-x-2 flex-1 ml-3">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-500 leading-tight">Bo mạch</div>
              <div class="text-sm text-gray-800 font-medium truncate">{{ deviceInfo.board.model }}</div>
            </div>
          </div>
        </div>

        <!-- Hàng 2: Assets và Màn hình -->
        <div class="flex justify-between items-center py-1.5">
          <div v-if="deviceInfo.assets" class="flex items-center space-x-2 flex-1">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-500 leading-tight">Assets</div>
              <div class="text-sm text-gray-800 font-medium">{{ deviceInfo.assets.size }}</div>
            </div>
          </div>

          <div v-if="deviceInfo.screen" class="flex items-center space-x-2 flex-1 ml-3">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-500 leading-tight">Màn hình</div>
              <div class="text-sm text-gray-800 font-medium">{{ deviceInfo.screen.resolution }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const token = ref('')
const showComponent = ref(false)
const deviceStatus = ref({
  isOnline: false,
  error: '',
  lastCheck: null
})

const deviceInfo = ref({
  chip: null,
  board: null,
  firmware: null,
  assets: null,
  network: null,
  screen: null
})

const retryTimer = ref(null)
const isChecking = ref(false)

// Lấy tham số URL
const getUrlParameter = (name) => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}

// Kiểm tra thiết bị có trực tuyến không
const checkDeviceStatus = async () => {
  if (isChecking.value || !token.value) return

  isChecking.value = true
  try {
    const response = await fetch('/api/messaging/device/tools/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      }
    })

    if (response.ok) {
      deviceStatus.value.isOnline = true
      deviceStatus.value.error = ''
      deviceStatus.value.lastCheck = new Date()

      // Lấy thông tin chi tiết thiết bị
      await fetchDeviceInfo()
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    deviceStatus.value.isOnline = false
    deviceStatus.value.error = ''
    deviceStatus.value.lastCheck = new Date()

    // Thử lại sau 60 giây
    if (retryTimer.value) {
      clearTimeout(retryTimer.value)
    }
    retryTimer.value = setTimeout(checkDeviceStatus, 30000)
  } finally {
    isChecking.value = false
  }
}

// Lấy thông tin chi tiết thiết bị
const fetchDeviceInfo = async () => {
  try {
    // Lấy tất cả thông tin thiết bị đồng thời
    const [systemInfoResponse, deviceStateResponse, screenInfoResponse] = await Promise.allSettled([
      callMcpTool('self.get_system_info'),
      callMcpTool('self.get_device_status'),
      callMcpTool('self.screen.get_info')
    ])

    // Xử lý thông tin hệ thống
    if (systemInfoResponse.status === 'fulfilled' && systemInfoResponse.value) {
      const data = systemInfoResponse.value.data || systemInfoResponse.value

      deviceInfo.value.chip = { model: data.chip_model_name || 'Không rõ' }
      deviceInfo.value.board = { model: data.board?.name || 'Không rõ' }
      deviceInfo.value.firmware = { version: data.application?.version || 'Không rõ' }

      // Tìm kích thước phân vùng assets từ bảng phân vùng
      const assetsPartition = data.partition_table?.find(partition => partition.label === 'assets')
      if (assetsPartition) {
        const sizeInMB = Math.round(assetsPartition.size / 1024 / 1024)
        deviceInfo.value.assets = { size: `${sizeInMB}MB` }
      } else {
        deviceInfo.value.assets = { size: 'Không rõ' }
      }
    } else {
      console.warn('Lấy thông tin hệ thống thất bại:', systemInfoResponse.reason || systemInfoResponse.value)
      deviceInfo.value.chip = { model: 'Không rõ' }
      deviceInfo.value.board = { model: 'Không rõ' }
      deviceInfo.value.firmware = { version: 'Không rõ' }
      deviceInfo.value.assets = { size: 'Không rõ' }
    }

    // Xử lý thông tin trạng thái thiết bị
    if (deviceStateResponse.status === 'fulfilled' && deviceStateResponse.value) {
      const data = deviceStateResponse.value.data || deviceStateResponse.value

      deviceInfo.value.network = {
        type: data.network?.type || 'unknown',
        signal: data.network?.signal || 'Không rõ'
      }
    } else {
      console.warn('Lấy trạng thái thiết bị thất bại:', deviceStateResponse.reason || deviceStateResponse.value)
      deviceInfo.value.network = { type: 'unknown', signal: 'Không rõ' }
    }

    // Xử lý thông tin màn hình
    if (screenInfoResponse.status === 'fulfilled' && screenInfoResponse.value) {
      const data = screenInfoResponse.value.data || screenInfoResponse.value

      deviceInfo.value.screen = {
        resolution: `${data.width || 0}x${data.height || 0}`
      }
    } else {
      console.warn('Lấy thông tin màn hình thất bại:', screenInfoResponse.reason || screenInfoResponse.value)
      deviceInfo.value.screen = { resolution: 'Không rõ' }
    }
  } catch (error) {
    console.error('Lỗi khi lấy thông tin thiết bị:', error)
  }
}

// Định dạng văn bản hiển thị cường độ tín hiệu
const getSignalDisplayText = (signal) => {
  if (!signal) return 'Không rõ'

  switch (signal.toLowerCase()) {
    case 'strong':
      return 'Mạnh'
    case 'medium':
      return 'Trung bình'
    case 'weak':
      return 'Yếu'
    case 'none':
      return 'Không có tín hiệu'
    default:
      return signal
  }
}

// Gọi công cụ MCP
const callMcpTool = async (toolName) => {
  try {
    const response = await fetch('/api/messaging/device/tools/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        name: toolName
      })
    })

    if (response.ok) {
      const result = await response.json()
      // Ưu tiên trả về trường data, nếu không có thì trả về toàn bộ kết quả
      return result
    } else {
      const errorText = await response.text()
      console.error(`Công cụ MCP ${toolName} thất bại:`, response.status, errorText)
      throw new Error(`Gọi ${toolName} thất bại: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error(`Gọi công cụ MCP ${toolName} thất bại:`, error)
    return null
  }
}

// Khởi tạo component
onMounted(() => {
  token.value = getUrlParameter('token')
  if (token.value) {
    showComponent.value = true
    checkDeviceStatus()
  }
})

// Dọn dẹp bộ đếm thời gian
onUnmounted(() => {
  if (retryTimer.value) {
    clearTimeout(retryTimer.value)
  }
})
</script>