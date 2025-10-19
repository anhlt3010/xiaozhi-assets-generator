<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Cấu hình bộ biểu tượng cảm xúc</h3>
      <p class="text-gray-600">Chọn bộ biểu tượng có sẵn hoặc tùy chỉnh hình ảnh biểu tượng. Mỗi bộ biểu tượng bao gồm 21 biểu cảm khác nhau.</p>
    </div>

    <!-- Lựa chọn loại biểu tượng -->
    <div class="space-y-4">
      <div class="flex space-x-4">
        <button
          @click="setEmojiType('preset')"
          :class="[
            'px-4 py-2 border rounded-lg transition-colors',
            modelValue.type === 'preset'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          Bộ biểu tượng có sẵn
        </button>
        <button
          @click="setEmojiType('custom')"
          :class="[
            'px-4 py-2 border rounded-lg transition-colors',
            modelValue.type === 'custom'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          Bộ biểu tượng tùy chỉnh
        </button>
      </div>
    </div>

    <!-- Chọn bộ biểu tượng có sẵn -->
    <div v-if="modelValue.type === 'preset'" class="space-y-4">
      <h4 class="font-medium text-gray-900">Chọn bộ biểu tượng có sẵn</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="pack in presetEmojis"
          :key="pack.id"
          @click="selectPresetEmoji(pack.id)"
          :class="[
            'border-2 rounded-lg p-4 cursor-pointer transition-all',
            modelValue.preset === pack.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h5 class="font-medium text-gray-900">{{ pack.name }}</h5>
              <p class="text-sm text-gray-600">{{ pack.description }}</p>
              <div class="text-xs text-gray-500 mt-1">
                Kích thước: {{ pack.size }}px × {{ pack.size }}px
              </div>
            </div>
            <div 
              v-if="modelValue.preset === pack.id"
              class="flex-shrink-0 ml-3"
            >
              <div class="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
          
          <!-- Lưới xem trước biểu tượng -->
          <div class="grid grid-cols-7 gap-1 justify-items-center">
            <div
              v-for="emotion in pack.preview"
              :key="emotion"
              :style="{ width: pack.size + 'px', height: pack.size + 'px' }"
              class="bg-gray-100 rounded flex items-center justify-center"
            >
              <img 
                :src="getPresetEmojiUrl(pack.id, emotion)"
                :alt="emotion"
                :style="{ width: pack.size + 'px', height: pack.size + 'px' }"
                class="object-contain rounded"
                @error="handleImageError"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bộ biểu tượng tùy chỉnh -->
    <div v-if="modelValue.type === 'custom'" class="space-y-6">
      <h4 class="font-medium text-gray-900">Cấu hình bộ biểu tượng tùy chỉnh</h4>
      
      <!-- Cấu hình cơ bản -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Kích thước hình ảnh -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Chiều rộng hình ảnh (px)</label>
          <input
            type="number"
            v-model.number="localCustom.size.width"
            min="16"
            max="200"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Chiều cao hình ảnh (px)</label>
          <input
            type="number"
            v-model.number="localCustom.size.height"
            min="16"
            max="200"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
      </div>

      <!-- Tải lên hình ảnh biểu tượng -->
      <div class="space-y-4">
        <h5 class="font-medium text-gray-900">Tải lên hình ảnh biểu tượng</h5>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div
            v-for="emotion in emotionList"
            :key="emotion.key"
            class="space-y-2"
          >
            <div class="text-center">
              <div class="text-lg mb-1">{{ emotion.emoji }}</div>
              <div class="text-xs text-gray-600">{{ emotion.name }}</div>
              <div v-if="emotion.key === 'neutral'" class="text-xs text-red-500">Bắt buộc</div>
            </div>
            
            <div 
              @drop="(e) => handleFileDrop(e, emotion.key)"
              @dragover.prevent
              @dragenter.prevent
              :class="[
                'border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors aspect-square flex flex-col items-center justify-center',
                modelValue.custom.images[emotion.key]
                  ? 'border-green-300 bg-green-50'
                  : emotion.key === 'neutral'
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <input
                :ref="emotion.key + 'Input'"
                type="file"
                accept=".png,.gif"
                @change="(e) => handleFileSelect(e, emotion.key)"
                class="hidden"
              >
              
              <div v-if="!modelValue.custom.images[emotion.key]" @click="$refs[emotion.key + 'Input'][0]?.click()">
                <svg class="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <div class="text-xs text-gray-500">Nhấp để tải lên</div>
              </div>
              
              <div v-else class="w-full h-full relative">
                <img 
                  v-if="getImagePreview(emotion.key)"
                  :src="getImagePreview(emotion.key)" 
                  :alt="emotion.name"
                  class="w-full h-full object-cover rounded"
                  @error="handleImageError"
                >
                <button
                  @click="removeImage(emotion.key)"
                  class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="text-xs text-gray-500 mt-2">
          * Bắt buộc phải tải lên biểu tượng mặc định (neutral), các biểu tượng khác là tùy chọn. Nếu không tải lên biểu tượng khác, hệ thống sẽ sử dụng biểu tượng mặc định thay thế.
        </div>
      </div>
    </div>

    <!-- Trạng thái cấu hình hiện tại -->
    <div v-if="hasValidConfig" class="bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <h4 class="text-sm font-medium text-green-800">Cấu hình biểu tượng hoàn tất</h4>
          <div class="mt-1 text-sm text-green-700">
            {{ getConfigSummary() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import StorageHelper from '@/utils/StorageHelper.js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const presetEmojis = [
  {
    id: 'twemoji32',
    name: 'Twemoji 32x32',
    description: 'Bộ biểu tượng Twitter, 32×32 pixel',
    size: 32,
    preview: ['neutral', 'happy', 'laughing', 'funny', 'sad', 'angry', 'crying']
  },
  {
    id: 'twemoji64',
    name: 'Twemoji 64x64', 
    description: 'Bộ biểu tượng Twitter, 64×64 pixel',
    size: 64,
    preview: ['neutral', 'happy', 'laughing', 'funny', 'sad', 'angry', 'crying']
  }
]

const emotionList = [
  { key: 'neutral', name: 'Mặc định', emoji: '😶' },
  { key: 'happy', name: 'Vui vẻ', emoji: '🙂' },
  { key: 'laughing', name: 'Cười lớn', emoji: '😆' },
  { key: 'funny', name: 'Hài hước', emoji: '😂' },
  { key: 'sad', name: 'Buồn', emoji: '😔' },
  { key: 'angry', name: 'Tức giận', emoji: '😠' },
  { key: 'crying', name: 'Khóc', emoji: '😭' },
  { key: 'loving', name: 'Yêu thích', emoji: '😍' },
  { key: 'embarrassed', name: 'Ngượng ngùng', emoji: '😳' },
  { key: 'surprised', name: 'Ngạc nhiên', emoji: '😯' },
  { key: 'shocked', name: 'Choáng váng', emoji: '😱' },
  { key: 'thinking', name: 'Suy nghĩ', emoji: '🤔' },
  { key: 'winking', name: 'Nháy mắt', emoji: '😉' },
  { key: 'cool', name: 'Ngầu', emoji: '😎' },
  { key: 'relaxed', name: 'Thư giãn', emoji: '😌' },
  { key: 'delicious', name: 'Ngon', emoji: '🤤' },
  { key: 'kissy', name: 'Hôn gió', emoji: '😘' },
  { key: 'confident', name: 'Tự tin', emoji: '😏' },
  { key: 'sleepy', name: 'Buồn ngủ', emoji: '😴' },
  { key: 'silly', name: 'Nghịch ngợm', emoji: '😜' },
  { key: 'confused', name: 'Bối rối', emoji: '🙄' }
]

const localCustom = ref({
  size: { width: 32, height: 32 }
})

const hasValidConfig = computed(() => {
  return props.modelValue.preset || props.modelValue.custom.images.neutral
})

const setEmojiType = (type) => {
  // Tránh thiết lập lại cùng loại nhiều lần
  if (props.modelValue.type === type) return
  
  const newValue = { ...props.modelValue, type }
  
  if (type === 'preset') {
    newValue.preset = props.modelValue.preset || 'twemoji32'
    newValue.custom = {
      ...props.modelValue.custom,
      images: {}
    }
  } else if (type === 'custom') {
    newValue.preset = ''
    newValue.custom = {
      ...props.modelValue.custom,
      images: props.modelValue.custom.images || {}
    }
  }
  
  emit('update:modelValue', newValue)
}

const selectPresetEmoji = (id) => {
  // Tránh chọn lại cùng bộ có sẵn
  if (props.modelValue.preset === id) return
  
  emit('update:modelValue', {
    ...props.modelValue,
    preset: id,
    custom: {
      ...props.modelValue.custom,
      images: {}
    }
  })
}

const handleFileSelect = (event, emotionKey) => {
  const file = event.target.files[0]
  if (file) {
    updateEmojiImage(emotionKey, file)
  }
}

const handleFileDrop = (event, emotionKey) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files.length > 0) {
    updateEmojiImage(emotionKey, files[0])
  }
}

const updateEmojiImage = async (emotionKey, file) => {
  const validFormats = ['png', 'gif']
  const fileExtension = file.name.split('.').pop().toLowerCase()
  
  if (validFormats.includes(fileExtension)) {
    emit('update:modelValue', {
      ...props.modelValue,
      custom: {
        ...props.modelValue.custom,
        size: localCustom.value.size,
        images: {
          ...props.modelValue.custom.images,
          [emotionKey]: file
        }
      }
    })

    // Tự động lưu tệp biểu tượng vào bộ nhớ
    await StorageHelper.saveEmojiFile(emotionKey, file, {
      size: localCustom.value.size,
      format: fileExtension
    })
  } else {
    alert('Vui lòng chọn hình ảnh định dạng PNG hoặc GIF hợp lệ')
  }
}

const removeImage = async (emotionKey) => {
  const newImages = { ...props.modelValue.custom.images }
  delete newImages[emotionKey]
  
  emit('update:modelValue', {
    ...props.modelValue,
    custom: {
      ...props.modelValue.custom,
      images: newImages
    }
  })

  // Xóa tệp biểu tượng trong bộ nhớ
  await StorageHelper.deleteEmojiFile(emotionKey)
}

const getPresetEmojiUrl = (packId, emotion) => {
  const size = packId === 'twemoji64' ? '64' : '32'
  return `./static/twemoji${size}/${emotion}.png`
}

const getImagePreview = (emotionKey) => {
  if (props.modelValue.type === 'preset') {
    return getPresetEmojiUrl(props.modelValue.preset, emotionKey)
  } else {
    const file = props.modelValue.custom.images[emotionKey]
    // Chỉ tạo xem trước khi là File hoặc Blob, tránh lỗi do đối tượng placeholder sau khi khôi phục
    if (file instanceof File || file instanceof Blob) {
      return URL.createObjectURL(file)
    }
    return null
  }
}

const handleImageError = (event) => {
  console.warn('Không thể tải hình ảnh biểu tượng:', event.target.src)
  // Có thể đặt một hình ảnh fallback mặc định
  event.target.style.display = 'none'
}

const getConfigSummary = () => {
  if (props.modelValue.type === 'preset') {
    const preset = presetEmojis.find(p => p.id === props.modelValue.preset)
    return preset ? `Sử dụng bộ biểu tượng có sẵn: ${preset.name}` : ''
  } else {
    const imageCount = Object.keys(props.modelValue.custom.images).length
    const size = localCustom.value.size
    return `Bộ biểu tượng tùy chỉnh: ${imageCount} hình ảnh (${size.width}×${size.height}px)`
  }
}

// Xóa watch có thể gây đệ quy vô hạn
// Sử dụng computed để đồng bộ localCustom, tránh xung đột ràng buộc hai chiều
watch(() => localCustom.value.size, (newSize) => {
  if (props.modelValue.type === 'custom') {
    const currentCustom = props.modelValue.custom
    // Chỉ kích hoạt cập nhật khi giá trị kích thước thực sự thay đổi
    if (JSON.stringify(currentCustom.size) !== JSON.stringify(newSize)) {
      emit('update:modelValue', {
        ...props.modelValue,
        custom: {
          ...currentCustom,
          size: newSize
        }
      })
    }
  }
}, { deep: true })

// Khởi tạo localCustom
if (props.modelValue.custom.size) {
  localCustom.value = {
    size: { ...props.modelValue.custom.size }
  }
}
</script>