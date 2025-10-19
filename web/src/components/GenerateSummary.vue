<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Bước 3: Xem trước hiệu ứng</h2>
      <p class="text-gray-600 mb-6">Xem trước cấu hình tùy chỉnh của bạn trên thiết bị thực tế.</p>
    </div>

    <!-- Khu vực xem trước thiết bị -->
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Trình mô phỏng thiết bị -->
      <div class="flex-1">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Xem trước thiết bị (Tỷ lệ pixel 1:1)</h3>
        <div class="bg-gray-100 p-4 rounded-lg">
          <div class="max-w-full overflow-auto flex justify-center">
            <!-- Khung thiết bị -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-2xl inline-block">
              <div class="bg-gray-900 p-2 rounded-xl">
                <!-- Vùng màn hình -->
                <div 
                  :style="getScreenStyle()"
                  class="relative rounded-lg overflow-hidden border-2 border-gray-700 flex flex-col items-center justify-center"
                >
                <!-- Lớp nền -->
                <div 
                  :style="getBackgroundStyle()"
                  class="absolute inset-0"
                ></div>
                
                <!-- Lớp nội dung -->
                <div class="relative z-10 flex flex-col items-center justify-center p-4 text-center">
                  <!-- Hiển thị biểu tượng cảm xúc -->
                  <div class="mb-4">
                    <div v-if="currentEmoji && availableEmotions.length > 0" class="emoji-container">
                      <img 
                        v-if="currentEmojiImage"
                        :src="currentEmojiImage" 
                        :alt="currentEmoji"
                        :style="getEmojiStyle()"
                        class="emoji-image"
                      />
                      <div 
                        v-else
                        :style="getEmojiStyle()"
                        class="emoji-fallback bg-gray-200 rounded-full flex items-center justify-center text-2xl"
                      >
                        {{ getEmojiCharacter(currentEmoji) }}
                      </div>
                    </div>
                    <div v-else class="emoji-container">
                      <div 
                        :style="getEmojiStyle()"
                        class="emoji-placeholder flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded bg-gray-50"
                      >
                        <div class="text-center">
                          <div class="text-sm">😕</div>
                          <div class="text-xs">Chưa cấu hình biểu tượng</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Hiển thị văn bản -->
                  <div 
                    :style="getTextStyle()"
                    class="text-message max-w-full break-words relative"
                  >
                    <div v-if="!fontLoaded" class="absolute inset-0 flex items-center justify-center">
                      <div class="animate-pulse text-gray-400 text-xs">Đang tải font chữ...</div>
                    </div>
                    <div :class="{ 'opacity-0': !fontLoaded }">
                      {{ previewText }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Thông tin thiết bị -->
            <div class="mt-3 text-center text-xs text-gray-400">
              {{ config.chip.display.width }} × {{ config.chip.display.height }}
              {{ config.chip.model.toUpperCase() }}
            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bảng điều khiển -->
      <div class="w-full lg:w-80">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Cài đặt xem trước</h3>
        <div class="space-y-6 bg-white border border-gray-200 rounded-lg p-4">
          
          <!-- Chỉnh sửa nội dung văn bản -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Văn bản xem trước</label>
            <textarea
              v-model="previewText"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows="3"
              placeholder="Xin chào, tôi là người bạn tốt của bạn Tiểu Trí!"
            ></textarea>
          </div>

          <!-- Chuyển đổi biểu tượng cảm xúc -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Biểu tượng cảm xúc hiện tại</label>
            <div v-if="availableEmotions.length > 0" class="flex flex-wrap gap-2 max-h-32 overflow-y-auto justify-center">
              <button
                v-for="emotion in availableEmotions"
                :key="emotion.key"
                @click="changeEmotion(emotion.key)"
                :class="[
                  'p-2 border rounded transition-colors flex items-center justify-center',
                  currentEmoji === emotion.key 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                ]"
                :title="emotion.name"
                :style="{ width: getEmojiControlSize() + 'px', height: getEmojiControlSize() + 'px' }"
              >
                <div v-if="getEmotionImage(emotion.key)">
                  <img 
                    :src="getEmotionImage(emotion.key)"
                    :alt="emotion.name"
                    :style="{ width: getEmojiDisplaySize() + 'px', height: getEmojiDisplaySize() + 'px' }"
                    class="object-contain rounded"
                  />
                </div>
                <div v-else class="text-lg">{{ emotion.emoji }}</div>
              </button>
            </div>
            <div v-else class="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
              <div class="text-2xl mb-2">😕</div>
              <div class="text-sm">Vui lòng cấu hình gói biểu tượng trong thiết kế giao diện trước</div>
            </div>
          </div>

          <!-- Chuyển đổi chế độ giao diện -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Chế độ giao diện</label>
            <div class="flex space-x-2">
              <button
                @click="themeMode = 'light'"
                :class="[
                  'flex-1 py-2 px-3 text-sm border rounded transition-colors',
                  themeMode === 'light'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                ]"
              >
                🌞 Sáng
              </button>
              <button
                @click="themeMode = 'dark'"
                :class="[
                  'flex-1 py-2 px-3 text-sm border rounded transition-colors',
                  themeMode === 'dark'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                ]"
              >
                🌙 Tối
              </button>
            </div>
          </div>


          <!-- Tóm tắt cấu hình -->
          <div class="border-t pt-4">
            <h4 class="font-medium text-gray-900 mb-2">Tóm tắt cấu hình</h4>
            <div class="text-xs text-gray-600 space-y-1">
              <div v-if="config.theme.wakeword">Từ đánh thức: {{ getWakewordName() }}</div>
              <div class="flex items-center">
                <span>Font chữ: {{ getFontName() }}</span>
                <span v-if="!fontLoaded" class="ml-2 animate-pulse text-blue-500">Đang tải...</span>
                <span v-else class="ml-2 text-green-500">✓</span>
              </div>
              <div>Biểu tượng: {{ getEmojiName() }}</div>
              <div>Giao diện: {{ getSkinName() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nút thao tác -->
    <div class="flex justify-between">
      <button 
        @click="$emit('prev')"
        class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Bước trước
      </button>
      <button 
        @click="$emit('generate')"
        class="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-lg font-medium transition-colors flex items-center"
      >
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        Tạo assets.bin
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

defineEmits(['prev', 'generate'])

// Trạng thái xem trước
const previewText = ref('Xin chào, tôi là người bạn tốt của bạn Tiểu Trí!')
const currentEmoji = ref('happy')
const themeMode = ref('light')
const fontLoaded = ref(false)
const loadedFontFamily = ref('')

// Dữ liệu biểu tượng cảm xúc
const emotionList = [
  { key: 'neutral', name: 'Mặc định', emoji: '😶' },
  { key: 'happy', name: 'Vui vẻ', emoji: '🙂' },
  { key: 'laughing', name: 'Cười lớn', emoji: '😆' },
  { key: 'funny', name: 'Hài hước', emoji: '😂' },
  { key: 'sad', name: 'Buồn bã', emoji: '😔' },
  { key: 'angry', name: 'Tức giận', emoji: '😠' },
  { key: 'crying', name: 'Khóc', emoji: '😭' },
  { key: 'loving', name: 'Yêu thích', emoji: '😍' },
  { key: 'surprised', name: 'Ngạc nhiên', emoji: '😯' },
  { key: 'thinking', name: 'Suy nghĩ', emoji: '🤔' },
  { key: 'cool', name: 'Ngầu', emoji: '😎' },
  { key: 'sleepy', name: 'Buồn ngủ', emoji: '😴' }
]

// Danh sách biểu tượng cảm xúc khả dụng
const availableEmotions = computed(() => {
  if (props.config.theme.emoji.type === 'preset' && props.config.theme.emoji.preset) {
    return emotionList
  } else if (props.config.theme.emoji.type === 'custom') {
    // Chỉ hiển thị biểu tượng do người dùng tải lên
    const customImages = props.config.theme.emoji.custom.images
    return emotionList.filter(emotion => customImages[emotion.key])
  } else {
    // Trả về mảng rỗng khi chưa cấu hình biểu tượng
    return []
  }
})

// Hình ảnh biểu tượng cảm xúc hiện tại
const currentEmojiImage = computed(() => {
  return getEmotionImage(currentEmoji.value)
})

// Lấy kiểu màn hình
const getScreenStyle = () => {
  const { width, height } = props.config.chip.display
  
  // Sử dụng tỷ lệ pixel 1:1, trực tiếp sử dụng kích thước trong cấu hình
  return {
    width: `${width}px`,
    height: `${height}px`
  }
}

// Lấy kiểu nền
const getBackgroundStyle = () => {
  const bg = props.config.theme.skin[themeMode.value]
  
  if (bg.backgroundType === 'image' && bg.backgroundImage) {
    try {
      // Xác minh tệp hình nền có hợp lệ không
      if (bg.backgroundImage && typeof bg.backgroundImage === 'object' && bg.backgroundImage.size) {
        return {
          backgroundImage: `url(${URL.createObjectURL(bg.backgroundImage)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      }
    } catch (error) {
      console.warn('Tải xem trước hình nền thất bại:', error)
    }
  }
  
  return {
    backgroundColor: bg.backgroundColor || '#ffffff'
  }
}

// Lấy kiểu biểu tượng cảm xúc
const getEmojiStyle = () => {
  let size = 48 // Kích thước mặc định
  
  if (props.config.theme.emoji.type === 'preset') {
    size = props.config.theme.emoji.preset === 'twemoji64' ? 64 : 32
  } else if (props.config.theme.emoji.custom.size) {
    size = Math.min(props.config.theme.emoji.custom.size.width, props.config.theme.emoji.custom.size.height)
  }
  
  // Sử dụng tỷ lệ pixel 1:1, trực tiếp sử dụng kích thước biểu tượng trong cấu hình
  return {
    width: `${size}px`,
    height: `${size}px`
  }
}

// Lấy kiểu văn bản
const getTextStyle = () => {
  let fontSize = 14
  
  // Điều chỉnh cỡ chữ theo cấu hình font
  if (props.config.theme.font.type === 'preset') {
    const fontConfig = props.config.theme.font.preset
    if (fontConfig.includes('_14_')) fontSize = 14
    else if (fontConfig.includes('_16_')) fontSize = 16
    else if (fontConfig.includes('_20_')) fontSize = 20
    else if (fontConfig.includes('_30_')) fontSize = 30
  } else if (props.config.theme.font.custom.size) {
    fontSize = props.config.theme.font.custom.size
  }
  
  // Sử dụng tỷ lệ pixel 1:1, trực tiếp sử dụng kích thước font trong cấu hình
  const textColor = themeMode.value === 'dark' 
    ? props.config.theme.skin.dark.textColor 
    : props.config.theme.skin.light.textColor
  
  return {
    fontSize: `${fontSize}px`,
    color: textColor,
    fontFamily: getFontFamily(),
    textShadow: themeMode.value === 'dark' ? '1px 1px 2px rgba(0,0,0,0.5)' : '1px 1px 2px rgba(255,255,255,0.5)'
  }
}

// Tải font động
const loadFont = async () => {
  // Dọn dẹp font trước đó
  const existingStyles = document.querySelectorAll('style[data-font-preview]')
  existingStyles.forEach(style => style.remove())
  
  fontLoaded.value = false
  loadedFontFamily.value = ''

  try {
    if (props.config.theme.font.type === 'preset') {
      // Tải font có sẵn
      const fontFamily = 'PuHuiPreview'
      const fontUrl = './static/fonts/puhui_deepseek.ttf'
      
      const style = document.createElement('style')
      style.setAttribute('data-font-preview', 'true')
      style.textContent = `
        @font-face {
          font-family: '${fontFamily}';
          src: url('${fontUrl}') format('truetype');
          font-display: swap;
        }
      `
      document.head.appendChild(style)
      
      // Đợi font tải xong
      await document.fonts.load(`16px "${fontFamily}"`)
      loadedFontFamily.value = fontFamily
      fontLoaded.value = true
      
    } else if (props.config.theme.font.custom.file) {
      // Tải font tùy chỉnh
      try {
        const fontFile = props.config.theme.font.custom.file
        
        // Xác minh đối tượng tệp có hợp lệ không
        if (!fontFile || typeof fontFile !== 'object' || !fontFile.size) {
          throw new Error('Đối tượng tệp font không hợp lệ')
        }
        
        const fontFamily = 'CustomFontPreview'
        const fontUrl = URL.createObjectURL(fontFile)
        
        const style = document.createElement('style')
        style.setAttribute('data-font-preview', 'true')
        style.textContent = `
          @font-face {
            font-family: '${fontFamily}';
            src: url('${fontUrl}');
            font-display: swap;
          }
        `
        document.head.appendChild(style)
        
        // Đợi font tải xong
        await document.fonts.load(`16px "${fontFamily}"`)
        loadedFontFamily.value = fontFamily
        fontLoaded.value = true
      } catch (error) {
        console.warn('Tải xem trước font tùy chỉnh thất bại:', error)
        // Sử dụng font mặc định của hệ thống làm dự phòng
        loadedFontFamily.value = 'Arial, sans-serif'
        fontLoaded.value = true
      }
    } else {
      // Sử dụng font hệ thống
      loadedFontFamily.value = 'system-ui'
      fontLoaded.value = true
    }
  } catch (error) {
    console.warn('Tải font thất bại:', error)
    loadedFontFamily.value = 'system-ui'
    fontLoaded.value = true
  }
}

// Lấy họ font
const getFontFamily = () => {
  if (fontLoaded.value && loadedFontFamily.value) {
    return `"${loadedFontFamily.value}", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
  }
  return '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
}

// Lấy hình ảnh biểu tượng cảm xúc
const getEmotionImage = (emotionKey) => {
  if (props.config.theme.emoji.type === 'preset') {
    const size = props.config.theme.emoji.preset === 'twemoji64' ? '64' : '32'
    return `./static/twemoji${size}/${emotionKey}.png`
  } else if (props.config.theme.emoji.type === 'custom' && props.config.theme.emoji.custom.images[emotionKey]) {
    try {
      const emojiFile = props.config.theme.emoji.custom.images[emotionKey]
      // Xác minh tệp biểu tượng có hợp lệ không
      if (emojiFile && typeof emojiFile === 'object' && emojiFile.size) {
        return URL.createObjectURL(emojiFile)
      }
    } catch (error) {
      console.warn(`Tải xem trước hình biểu tượng thất bại (${emotionKey}):`, error)
    }
  }
  return null
}

// Lấy ký tự biểu tượng cảm xúc
const getEmojiCharacter = (emotionKey) => {
  const emotion = emotionList.find(e => e.key === emotionKey)
  return emotion ? emotion.emoji : '😶'
}

// Lấy kích thước nút điều khiển biểu tượng cảm xúc
const getEmojiControlSize = () => {
  if (props.config.theme.emoji.type === 'preset') {
    const baseSize = props.config.theme.emoji.preset === 'twemoji64' ? 64 : 32
    return baseSize + 16 // Thêm padding
  } else if (props.config.theme.emoji.custom.size) {
    const baseSize = Math.min(props.config.theme.emoji.custom.size.width, props.config.theme.emoji.custom.size.height)
    return Math.min(baseSize + 16, 64) // Giới hạn kích thước tối đa
  }
  return 48 // Kích thước mặc định
}

// Lấy kích thước hiển thị hình biểu tượng cảm xúc
const getEmojiDisplaySize = () => {
  if (props.config.theme.emoji.type === 'preset') {
    return props.config.theme.emoji.preset === 'twemoji64' ? 64 : 32
  } else if (props.config.theme.emoji.custom.size) {
    return Math.min(props.config.theme.emoji.custom.size.width, props.config.theme.emoji.custom.size.height, 48)
  }
  return 32 // Kích thước mặc định
}

// Chuyển đổi biểu tượng cảm xúc
const changeEmotion = (emotionKey) => {
  currentEmoji.value = emotionKey
}


// Phương thức tóm tắt cấu hình
const getWakewordName = () => {
  const names = {
    'wn9s_hilexin': 'Hi,Lexin', 'wn9s_hiesp': 'Hi,ESP', 'wn9s_nihaoxiaozhi': 'Xin chào Tiểu Trí',
    'wn9_nihaoxiaozhi_tts': 'Xin chào Tiểu Trí', 'wn9_alexa': 'Alexa', 'wn9_jarvis_tts': 'Jarvis'
  }
  return names[props.config.theme.wakeword] || props.config.theme.wakeword
}

const getFontName = () => {
  if (props.config.theme.font.type === 'preset') {
    const presetNames = {
      'font_puhui_deepseek_14_1': 'PuHui 14px',
      'font_puhui_deepseek_16_4': 'PuHui 16px',
      'font_puhui_deepseek_20_4': 'PuHui 20px',
      'font_puhui_deepseek_30_4': 'PuHui 30px'
    }
    return presetNames[props.config.theme.font.preset] || props.config.theme.font.preset
  } else {
    const custom = props.config.theme.font.custom
    return `Font tùy chỉnh ${custom.size}px`
  }
}

const getEmojiName = () => {
  if (props.config.theme.emoji.type === 'preset' && props.config.theme.emoji.preset) {
    return props.config.theme.emoji.preset === 'twemoji64' ? 'Twemoji 64×64' : 'Twemoji 32×32'
  } else if (props.config.theme.emoji.type === 'custom') {
    const count = Object.keys(props.config.theme.emoji.custom.images).length
    return `Biểu tượng tùy chỉnh ${count} ảnh`
  } else {
    return 'Chưa cấu hình'
  }
}

const getSkinName = () => {
  const light = props.config.theme.skin.light.backgroundType === 'image' ? 'Hình ảnh' : 'Màu'
  const dark = props.config.theme.skin.dark.backgroundType === 'image' ? 'Hình ảnh' : 'Màu'
  return `Sáng ${light}/Tối ${dark}`
}

// Theo dõi thay đổi cấu hình font
watch(() => props.config.theme.font, () => {
  loadFont()
}, { deep: true })

// Gắn kết component
onMounted(async () => {
  // Đảm bảo có biểu tượng cảm xúc khả dụng
  if (availableEmotions.value.length > 0) {
    currentEmoji.value = availableEmotions.value[0].key
  } else {
    currentEmoji.value = ''
  }
  
  // Tải font
  await loadFont()
})

// Dọn dẹp font khi hủy component
onUnmounted(() => {
  const existingStyles = document.querySelectorAll('style[data-font-preview]')
  existingStyles.forEach(style => style.remove())
})
</script>

<style scoped>
.emoji-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-image {
  border-radius: 8px;
  object-fit: cover;
}

.emoji-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-message {
  line-height: 1;
  word-wrap: break-word;
}
</style>