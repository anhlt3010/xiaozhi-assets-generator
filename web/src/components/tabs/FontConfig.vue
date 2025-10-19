<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Cấu hình phông chữ</h3>
      <p class="text-gray-600">Chọn phông chữ có sẵn hoặc tải lên tệp phông chữ tùy chỉnh.</p>
    </div>

    <!-- Chọn loại phông chữ -->
    <div class="space-y-4">
      <div class="flex space-x-4">
        <button
          @click="setFontType('preset')"
          :class="[
            'px-4 py-2 border rounded-lg transition-colors',
            modelValue.type === 'preset'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          Phông chữ có sẵn
        </button>
        <button
          @click="setFontType('custom')"
          :class="[
            'px-4 py-2 border rounded-lg transition-colors',
            modelValue.type === 'custom'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          Phông chữ tùy chỉnh
        </button>
      </div>
    </div>

    <!-- Chọn phông chữ có sẵn -->
    <div v-if="modelValue.type === 'preset'" class="space-y-4">
      <h4 class="font-medium text-gray-900">Chọn phông chữ có sẵn</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="font in presetFonts"
          :key="font.id"
          @click="selectPresetFont(font.id)"
          :class="[
            'border-2 rounded-lg p-4 cursor-pointer transition-all',
            modelValue.preset === font.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h5 class="font-medium text-gray-900 mb-1">{{ font.name }}</h5>
              <div class="text-sm text-gray-600 space-y-1">
                <div>Cỡ chữ: {{ font.size }}px</div>
                <div>Độ sâu bit: {{ font.bpp }}bpp</div>
                <div>Bộ ký tự: {{ font.charset }}</div>
                <div>Kích thước tệp: {{ font.fileSize }}</div>
              </div>
            </div>
            <div 
              v-if="modelValue.preset === font.id"
              class="flex-shrink-0 ml-3"
            >
              <div class="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cấu hình phông chữ tùy chỉnh -->
    <div v-if="modelValue.type === 'custom'" class="space-y-6">
      <h4 class="font-medium text-gray-900">Cấu hình phông chữ tùy chỉnh</h4>
      
      <!-- Tải lên tệp -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">Tệp phông chữ</label>
        <div 
          @drop="handleFileDrop"
          @dragover.prevent
          @dragenter.prevent
          class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".ttf,.woff,.woff2"
            @change="handleFileSelect"
            class="hidden"
          >
          <div v-if="!modelValue.custom.file">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <div class="mt-2">
              <button 
                @click="$refs.fileInput.click()"
                class="text-primary-600 hover:text-primary-500 font-medium"
              >
                Nhấp để chọn tệp phông chữ
              </button>
              <p class="text-gray-500">hoặc kéo thả tệp vào đây</p>
            </div>
            <p class="text-xs text-gray-400 mt-1">Hỗ trợ định dạng TTF, WOFF, WOFF2</p>
          </div>
          <div v-else class="text-green-600">
            <svg class="mx-auto h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <p class="mt-1 font-medium">{{ modelValue.custom.file?.name }}</p>
            <button 
              @click="clearFile"
              class="text-red-600 hover:text-red-500 text-sm mt-1"
            >
              Xóa tệp
            </button>
          </div>
        </div>
      </div>

      <!-- Tùy chọn cấu hình phông chữ -->
      <div v-if="modelValue.custom.file" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Cỡ chữ -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cỡ chữ (px)</label>
          <input
            type="number"
            v-model.number="localCustom.size"
            min="8"
            max="80"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
          <p class="text-xs text-gray-500 mt-1">Phạm vi: 8-80px</p>
        </div>

        <!-- Độ sâu bit -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Độ sâu bit (BPP)</label>
          <select 
            v-model="localCustom.bpp"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option :value="1">1 bpp (đơn sắc)</option>
            <option :value="2">2 bpp (4 màu)</option>
            <option :value="4">4 bpp (16 màu)</option>
          </select>
        </div>

        <!-- Bộ ký tự -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Bộ ký tự</label>
          <select 
            v-model="localCustom.charset"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="deepseek">DeepSeek R1 (7405 ký tự)</option>
            <option value="gb2312">GB2312 (7445 ký tự)</option>
            <option value="latin">Latin1 (190 ký tự)</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Khuyến nghị sử dụng DeepSeek R1</p>
        </div>
      </div>

      <!-- Xem trước phông chữ tùy chỉnh -->
      <div v-if="modelValue.custom.file" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 class="font-medium text-blue-900 mb-2">Xem trước cấu hình phông chữ</h5>
        <div class="text-sm text-blue-800 space-y-1">
          <div>Tệp phông chữ: {{ modelValue.custom.file.name }}</div>
          <div>Cỡ chữ: {{ localCustom.size }}px</div>
          <div>Độ sâu bit: {{ localCustom.bpp }}bpp</div>
          <div>Bộ ký tự: {{ 
            localCustom.charset === 'deepseek' ? 'DeepSeek R1' : 
            localCustom.charset === 'gb2312' ? 'GB2312' : 
            localCustom.charset === 'latin' ? 'Latin1' : 
            localCustom.charset 
          }}</div>
          <div class="text-xs text-blue-600 mt-2">
            Tên tệp đầu ra: font_custom_{{ localCustom.size }}_{{ localCustom.bpp }}.bin
          </div>
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
          <h4 class="text-sm font-medium text-green-800">
            Cấu hình phông chữ hoàn tất
          </h4>
          <div class="mt-1 text-sm text-green-700">
            {{ getConfigSummary() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import StorageHelper from '@/utils/StorageHelper.js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)

const presetFonts = [
  {
    id: 'font_puhui_deepseek_14_1',
    name: 'Alibaba PuHuiTi 14px',
    size: 14,
    bpp: 1,
    charset: '7000 chữ thường dùng',
    fileSize: '~180KB'
  },
  {
    id: 'font_puhui_deepseek_16_4',
    name: 'Alibaba PuHuiTi 16px',
    size: 16,
    bpp: 4,
    charset: '7000 chữ thường dùng',
    fileSize: '~720KB'
  },
  {
    id: 'font_puhui_deepseek_20_4',
    name: 'Alibaba PuHuiTi 20px',
    size: 20,
    bpp: 4,
    charset: '7000 chữ thường dùng',
    fileSize: '~1.1MB'
  },
  {
    id: 'font_puhui_deepseek_30_4',
    name: 'Alibaba PuHuiTi 30px',
    size: 30,
    bpp: 4,
    charset: '7000 chữ thường dùng',
    fileSize: '~2.5MB'
  }
]

const localCustom = ref({
  size: 20,
  bpp: 4,
  charset: 'deepseek'
})

const hasValidConfig = computed(() => {
  return props.modelValue.preset || props.modelValue.custom.file
})

const setFontType = (type) => {
  emit('update:modelValue', {
    ...props.modelValue,
    type,
    preset: type === 'preset' ? props.modelValue.preset : '',
    custom: {
      ...props.modelValue.custom,
      file: type === 'custom' ? props.modelValue.custom.file : null
    }
  })
}

const selectPresetFont = (id) => {
  emit('update:modelValue', {
    ...props.modelValue,
    preset: id,
    custom: {
      ...props.modelValue.custom,
      file: null
    }
  })
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    updateCustomFile(file)
  }
}

const handleFileDrop = (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files.length > 0) {
    updateCustomFile(files[0])
  }
}

const updateCustomFile = async (file) => {
  if (file && (file.type.includes('font') || file.name.toLowerCase().match(/\.(ttf|woff|woff2)$/))) {
    emit('update:modelValue', {
      ...props.modelValue,
      custom: {
        ...props.modelValue.custom,
        file,
        ...localCustom.value
      }
    })

    // Tự động lưu tệp vào bộ nhớ
    await StorageHelper.saveFontFile(file, localCustom.value)
  } else {
    alert('Vui lòng chọn tệp phông chữ hợp lệ (TTF, WOFF, WOFF2)')
  }
}

const clearFile = async () => {
  emit('update:modelValue', {
    ...props.modelValue,
    custom: {
      ...props.modelValue.custom,
      file: null
    }
  })
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  // Xóa tệp trong bộ nhớ
  await StorageHelper.deleteFontFile()
}

const getConfigSummary = () => {
  if (props.modelValue.type === 'preset') {
    const preset = presetFonts.find(f => f.id === props.modelValue.preset)
    return preset ? `Sử dụng phông chữ có sẵn: ${preset.name}` : ''
  } else {
    const file = props.modelValue.custom.file
    return file ? `Phông chữ tùy chỉnh: ${file.name} (${localCustom.value.size}px, ${localCustom.value.bpp}bpp)` : ''
  }
}

// Cờ để ngăn cập nhật vòng lặp
const isUpdatingFromProps = ref(false)

watch(() => localCustom.value, (newVal) => {
  if (isUpdatingFromProps.value) return
  
  if (props.modelValue.type === 'custom' && props.modelValue.custom.file) {
    emit('update:modelValue', {
      ...props.modelValue,
      custom: {
        ...props.modelValue.custom,
        ...newVal
      }
    })
  }
}, { deep: true })

watch(() => props.modelValue.custom, (newVal) => {
  if (newVal.size && newVal.bpp && newVal.charset) {
    isUpdatingFromProps.value = true
    localCustom.value = {
      size: newVal.size,
      bpp: newVal.bpp,
      charset: newVal.charset
    }
    // Đặt lại cờ trong tick tiếp theo
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  }
}, { deep: true, immediate: true })
</script>