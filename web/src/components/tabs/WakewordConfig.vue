<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Cấu hình từ đánh thức</h3>
      <p class="text-gray-600">
        Chọn mô hình từ đánh thức phù hợp theo loại chip của bạn.
        <span v-if="chipModel.includes('c3') || chipModel.includes('c6')" class="text-blue-600">
          Chip của bạn hỗ trợ mô hình WakeNet9s.
        </span>
        <span v-else class="text-blue-600">
          Chip của bạn hỗ trợ mô hình WakeNet9.
        </span>
      </p>
    </div>

    <!-- Lựa chọn từ đánh thức -->
    <div class="space-y-4">
      <label class="block text-sm font-medium text-gray-700">Chọn từ đánh thức</label>
      
      <!-- Menu thả xuống -->
      <div class="relative">
        <select 
          :value="modelValue"
          @change="selectWakeword($event.target.value)"
          class="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Vui lòng chọn từ đánh thức (tùy chọn)</option>
          <option
            v-for="wakeword in availableWakewords"
            :key="wakeword.id"
            :value="wakeword.id"
          >
            {{ wakeword.name }} ({{ wakeword.model }})
          </option>
        </select>
      </div>

      <!-- Hiển thị lựa chọn hiện tại -->
      <div v-if="modelValue" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <h4 class="text-sm font-medium text-green-800">
              Đã chọn từ đánh thức: {{ getSelectedWakewordName() }}
            </h4>
            <div class="mt-1 text-sm text-green-700">
              Loại mô hình: {{ getSelectedWakewordModel() }}
            </div>
            <div class="mt-1 text-sm text-green-700">
              Tên tệp: {{ modelValue }}.bin
            </div>
          </div>
        </div>
      </div>

      <!-- Thông tin hướng dẫn -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div class="text-sm text-blue-800">
          <strong>Lưu ý:</strong>
          <ul class="mt-1 list-disc list-inside space-y-1">
            <li>Từ đánh thức là tùy chọn, nếu không cấu hình thì thiết bị sẽ không thể đánh thức bằng giọng nói</li>
            <li>{{ chipModel.includes('c3') || chipModel.includes('c6') ? 'Chip C3/C6 chỉ hỗ trợ mô hình nhẹ WakeNet9s' : 'Chip S3/P4 hỗ trợ mô hình đầy đủ WakeNet9, nhiều lựa chọn hơn' }}</li>
            <li>Có thể thay đổi hoặc hủy lựa chọn bất cứ lúc nào</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  chipModel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Dữ liệu cấu hình từ đánh thức đầy đủ
const wakewordData = [
  // WakeNet9s (Hỗ trợ chip C3/C6)
  { id: 'wn9s_hilexin', name: 'Hi,乐鑫', model: 'WakeNet9s' },
  { id: 'wn9s_hiesp', name: 'Hi,ESP', model: 'WakeNet9s' },
  { id: 'wn9s_nihaoxiaozhi', name: '你好小智', model: 'WakeNet9s' },
  { id: 'wn9s_hijason_tts2', name: 'Hi,Jason', model: 'WakeNet9s' },
  
  // WakeNet9 (Hỗ trợ chip S3/P4)
  { id: 'wn9_hilexin', name: 'Hi,乐鑫', model: 'WakeNet9' },
  { id: 'wn9_hiesp', name: 'Hi,ESP', model: 'WakeNet9' },
  { id: 'wn9_nihaoxiaozhi_tts', name: '你好小智', model: 'WakeNet9' },
  { id: 'wn9_hijason_tts2', name: 'Hi,Jason', model: 'WakeNet9' },
  { id: 'wn9_nihaomiaoban_tts2', name: '你好喵伴', model: 'WakeNet9' },
  { id: 'wn9_xiaoaitongxue', name: '小爱同学', model: 'WakeNet9' },
  { id: 'wn9_himfive', name: 'Hi,M Five', model: 'WakeNet9' },
  { id: 'wn9_alexa', name: 'Alexa', model: 'WakeNet9' },
  { id: 'wn9_jarvis_tts', name: 'Jarvis', model: 'WakeNet9' },
  { id: 'wn9_computer_tts', name: 'Computer', model: 'WakeNet9' },
  { id: 'wn9_heywillow_tts', name: 'Hey,Willow', model: 'WakeNet9' },
  { id: 'wn9_sophia_tts', name: 'Sophia', model: 'WakeNet9' },
  { id: 'wn9_mycroft_tts', name: 'Mycroft', model: 'WakeNet9' },
  { id: 'wn9_heyprinter_tts', name: 'Hey,Printer', model: 'WakeNet9' },
  { id: 'wn9_hijoy_tts', name: 'Hi,Joy', model: 'WakeNet9' },
  { id: 'wn9_heywanda_tts', name: 'Hey,Wand', model: 'WakeNet9' },
  { id: 'wn9_astrolabe_tts', name: 'Astrolabe', model: 'WakeNet9' },
  { id: 'wn9_heyily_tts2', name: 'Hey,Ily', model: 'WakeNet9' },
  { id: 'wn9_hijolly_tts2', name: 'Hi,Jolly', model: 'WakeNet9' },
  { id: 'wn9_hifairy_tts2', name: 'Hi,Fairy', model: 'WakeNet9' },
  { id: 'wn9_bluechip_tts2', name: 'Blue Chip', model: 'WakeNet9' },
  { id: 'wn9_hiandy_tts2', name: 'Hi,Andy', model: 'WakeNet9' },
  { id: 'wn9_hiwalle_tts2', name: 'Hi,Wall E', model: 'WakeNet9' },
  { id: 'wn9_nihaoxiaoxin_tts', name: '你好小鑫', model: 'WakeNet9' },
  { id: 'wn9_xiaomeitongxue_tts', name: '小美同学', model: 'WakeNet9' },
  { id: 'wn9_hixiaoxing_tts', name: 'Hi,小星', model: 'WakeNet9' },
  { id: 'wn9_xiaolongxiaolong_tts', name: '小龙小龙', model: 'WakeNet9' },
  { id: 'wn9_miaomiaotongxue_tts', name: '喵喵同学', model: 'WakeNet9' },
  { id: 'wn9_himiaomiao_tts', name: 'Hi,喵喵', model: 'WakeNet9' },
  { id: 'wn9_hilili_tts', name: 'Hi,Lily', model: 'WakeNet9' },
  { id: 'wn9_hitelly_tts', name: 'Hi,Telly', model: 'WakeNet9' },
  { id: 'wn9_xiaobinxiaobin_tts', name: '小滨小滨', model: 'WakeNet9' },
  { id: 'wn9_haixiaowu_tts', name: 'Hi,小巫', model: 'WakeNet9' },
  { id: 'wn9_xiaoyaxiaoya_tts2', name: '小鸭小鸭', model: 'WakeNet9' },
  { id: 'wn9_linaiban_tts2', name: '璃奈板', model: 'WakeNet9' },
  { id: 'wn9_xiaosurou_tts2', name: '小酥肉', model: 'WakeNet9' },
  { id: 'wn9_xiaoyutongxue_tts2', name: '小宇同学', model: 'WakeNet9' },
  { id: 'wn9_xiaomingtongxue_tts2', name: '小明同学', model: 'WakeNet9' },
  { id: 'wn9_xiaokangtongxue_tts2', name: '小康同学', model: 'WakeNet9' },
  { id: 'wn9_xiaojianxiaojian_tts2', name: '小箭小箭', model: 'WakeNet9' },
  { id: 'wn9_xiaotexiaote_tts2', name: '小特小特', model: 'WakeNet9' },
  { id: 'wn9_nihaoxiaoyi_tts2', name: '你好小益', model: 'WakeNet9' },
  { id: 'wn9_nihaobaiying_tts2', name: '你好百应', model: 'WakeNet9' },
  { id: 'wn9_xiaoluxiaolu_tts2', name: '小鹿小鹿', model: 'WakeNet9' },
  { id: 'wn9_nihaodongdong_tts2', name: '你好东东', model: 'WakeNet9' },
  { id: 'wn9_nihaoxiaoan_tts2', name: '你好小安', model: 'WakeNet9' },
  { id: 'wn9_ni3hao3xiao3mai4_tts2', name: '你好小脉', model: 'WakeNet9' }
]

const availableWakewords = computed(() => {
  if (props.chipModel.includes('c3') || props.chipModel.includes('c6')) {
    return wakewordData.filter(w => w.model === 'WakeNet9s')
  } else {
    return wakewordData.filter(w => w.model === 'WakeNet9')
  }
})

const selectWakeword = (id) => {
  // Nếu chọn giá trị rỗng, xóa lựa chọn
  if (id === '') {
    emit('update:modelValue', '')
    return
  }
  
  // Nếu click vào từ đánh thức đã chọn, hủy chọn
  if (props.modelValue === id) {
    emit('update:modelValue', '')
  } else {
    emit('update:modelValue', id)
  }
}

const getSelectedWakewordName = () => {
  const selected = wakewordData.find(w => w.id === props.modelValue)
  return selected?.name || ''
}

const getSelectedWakewordModel = () => {
  const selected = wakewordData.find(w => w.id === props.modelValue)
  return selected?.model || ''
}
</script>