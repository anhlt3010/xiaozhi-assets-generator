# Hướng dẫn chức năng lưu trữ cấu hình lâu dài

## Tổng quan chức năng

Dự án này đã bổ sung chức năng lưu trữ lâu dài cấu hình và tệp dựa trên IndexedDB, cho phép người dùng giữ nguyên trạng thái cấu hình và tệp đã tải lên sau khi làm mới trang.

## Tính năng chính

### 1. Tự động lưu cấu hình
- **Lưu theo thời gian thực**: Tự động lưu vào IndexedDB khi người dùng sửa đổi cấu hình
- **Phát hiện thông minh**: Tự động phát hiện cấu hình đã lưu khi tải trang
- **Khôi phục trạng thái**: Khôi phục vị trí tiến độ và trạng thái tab giao diện của người dùng

### 2. Tự động lưu trữ tệp
- **Tệp font chữ**: Tự động lưu tệp font tùy chỉnh, bao gồm dữ liệu font đã chuyển đổi
- **Hình ảnh biểu tượng**: Tự động lưu hình ảnh biểu tượng tùy chỉnh vào bộ nhớ
- **Hình ảnh nền**: Tự động lưu hình nền chế độ sáng/tối

### 3. Chức năng bắt đầu lại
- **Dọn dẹp một chạm**: Cung cấp nút bắt đầu lại, xóa toàn bộ dữ liệu lưu trữ sau khi xác nhận
- **Xác nhận an toàn**: Bao gồm hộp thoại xác nhận chi tiết, ngăn thao tác nhầm lẫn
- **Đặt lại hoàn toàn**: Dọn dẹp cấu hình, tệp và dữ liệu tạm thời

## Triển khai kỹ thuật

### Các component cốt lõi

#### ConfigStorage.js
- Quản lý cơ sở dữ liệu IndexedDB
- Lưu trữ và khôi phục cấu hình
- Lưu trữ nhị phân tệp
- Quản lý dữ liệu tạm thời

#### StorageHelper.js
- Cung cấp API lưu trữ tiện lợi cho các component
- Giao diện thống nhất để lưu và xóa tệp
- Quản lý phân loại các loại tệp tài nguyên khác nhau

#### Tích hợp AssetsBuilder.js
- Tích hợp sâu với hệ thống lưu trữ
- Tự động lưu dữ liệu font đã chuyển đổi
- Khôi phục thông minh tệp tài nguyên

### Cấu trúc lưu trữ

```javascript
// Cơ sở dữ liệu: XiaozhiConfigDB
{
  configs: {      // Bảng cấu hình
    key: 'current_config',
    config: { ... },           // Đối tượng cấu hình đầy đủ
    currentStep: 1,           // Bước hiện tại
    activeThemeTab: 'font',   // Tab đang hoạt động
    timestamp: 1234567890     // Thời gian lưu
  },
  
  files: {        // Bảng tệp
    id: 'custom_font',
    type: 'font',             // Loại tệp
    name: 'MyFont.ttf',       // Tên tệp
    size: 1024,               // Kích thước tệp
    mimeType: 'font/ttf',     // Loại MIME
    data: ArrayBuffer,        // Dữ liệu nhị phân tệp
    metadata: { ... },        // Siêu dữ liệu
    timestamp: 1234567890     // Thời gian lưu
  },
  
  temp_data: {    // Bảng dữ liệu tạm thời
    key: 'converted_font_xxx',
    type: 'converted_font',   // Loại dữ liệu
    data: ArrayBuffer,        // Dữ liệu đã chuyển đổi
    metadata: { ... },        // Siêu dữ liệu
    timestamp: 1234567890     // Thời gian lưu
  }
}
```

## Trải nghiệm người dùng

### Sử dụng lần đầu
1. Người dùng cấu hình chip, giao diện bình thường
2. Mỗi lần sửa đổi tự động lưu vào bộ nhớ cục bộ
3. Tệp tải lên được lưu đồng bộ

### Sau khi làm mới trang
1. Hiển thị thông báo "Phát hiện cấu hình đã lưu"
2. Tự động khôi phục về trạng thái cấu hình lần trước
3. Khôi phục tệp đã tải lên và dữ liệu đã chuyển đổi
4. Cung cấp tùy chọn "Bắt đầu lại"

### Bắt đầu lại
1. Nhấp nút "Bắt đầu lại"
2. Hiển thị hộp thoại xác nhận chi tiết
3. Liệt kê các loại dữ liệu sẽ bị xóa
4. Sau khi xác nhận, đặt lại hoàn toàn về trạng thái ban đầu

## Tài liệu tham khảo API

### Các phương thức chính của ConfigStorage

```javascript
// Lưu cấu hình
await configStorage.saveConfig(config, currentStep, activeThemeTab)

// Tải cấu hình
const data = await configStorage.loadConfig()

// Lưu tệp
await configStorage.saveFile(id, file, type, metadata)

// Tải tệp
const file = await configStorage.loadFile(id)

// Xóa toàn bộ dữ liệu
await configStorage.clearAll()
```

### Các phương thức tiện lợi của StorageHelper

```javascript
// Lưu tệp font
await StorageHelper.saveFontFile(file, config)

// Lưu tệp biểu tượng
await StorageHelper.saveEmojiFile(emojiName, file, config)

// Lưu tệp nền
await StorageHelper.saveBackgroundFile(mode, file, config)

// Xóa tệp
await StorageHelper.deleteFontFile()
await StorageHelper.deleteEmojiFile(emojiName)
await StorageHelper.deleteBackgroundFile(mode)
```

## Lưu ý

### Tương thích trình duyệt
- Cần trình duyệt hiện đại hỗ trợ IndexedDB
- Khuyến nghị sử dụng Chrome 58+, Firefox 55+, Safari 10.1+

### Giới hạn lưu trữ
- Không gian lưu trữ IndexedDB bị giới hạn bởi trình duyệt
- Tệp lớn có thể ảnh hưởng đến hiệu suất lưu trữ
- Khuyến nghị dọn dẹp định kỳ dữ liệu không cần thiết

### Cân nhắc về quyền riêng tư
- Dữ liệu chỉ lưu trữ cục bộ trong trình duyệt của người dùng
- Không tải lên máy chủ
- Xóa dữ liệu trình duyệt sẽ mất cấu hình đã lưu

## Khắc phục sự cố

### Lưu trữ thất bại
- Kiểm tra trình duyệt có hỗ trợ IndexedDB không
- Xác nhận không gian lưu trữ trình duyệt đủ
- Kiểm tra có bật chế độ duyệt web riêng tư không

### Mất cấu hình
- Xóa dữ liệu trình duyệt sẽ dẫn đến mất cấu hình
- Nâng cấp trình duyệt có thể ảnh hưởng tương thích lưu trữ
- Khuyến nghị sao lưu thủ công các cấu hình quan trọng

### Vấn đề hiệu suất
- Lưu trữ nhiều tệp có thể ảnh hưởng hiệu suất
- Sử dụng định kỳ chức năng "Bắt đầu lại" để dọn dẹp dữ liệu
- Tránh thao tác tải lên tệp lớn thường xuyên