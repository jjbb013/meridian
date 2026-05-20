# iOS 快捷指令配置指南

## 快速开始

### 1. 创建快捷指令

1. 打开 iOS "快捷指令" App
2. 点击右上角 "+" 创建新快捷指令
3. 添加操作：

#### 操作 1: 获取文本输入
- 搜索 "询问输入"
- 提示文本："请输入你的问题"

#### 操作 2: 设置变量
- 搜索 "设置变量"
- 变量名：`prompt`
- 值：快捷指令输入

#### 操作 3: 获取 URL 内容
- 搜索 "获取 URL 内容"
- URL：`https://your-domain.com/api/ios/chat`
- 方法：`POST`
- 请求体：`JSON`
  ```json
  {
    "message": "{{prompt}}",
    "model": "kimi-coding"
  }
  ```
- 标头：
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer YOUR_API_KEY`

#### 操作 4: 获取字典值
- 搜索 "获取字典值"
- 键：`response`
- 获取：`值`

#### 操作 5: 显示结果
- 搜索 "显示提醒"
- 标题："AI 回复"
- 内容：字典值

### 2. 高级配置

#### 带历史记录的对话
1. 使用 "文件" App 存储对话历史
2. 每次请求前读取历史
3. 将历史作为 `messages` 数组发送

#### Siri 语音触发
1. 点击快捷指令设置
2. 添加 Siri 语音指令："问 AI"
3. 现在可以说 "嘿 Siri，问 AI"

### 3. 可用端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/ios/chat` | POST | 发送消息，获取 AI 回复 |
| `/api/ios/health` | GET | 检查服务状态 |
| `/api/ios/config` | GET | 获取配置模板 |

### 4. 请求格式

```json
{
  "message": "你的问题",
  "model": "kimi-coding"
}
```

### 5. 响应格式

```json
{
  "success": true,
  "response": "AI 的回复内容",
  "model": "kimi-coding",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 50,
    "total_tokens": 60
  }
}
```

### 6. 错误处理

```json
{
  "success": false,
  "error": "错误描述"
}
```

## 示例快捷指令

### 简单问答
```
询问输入 → 设置变量(prompt) → 获取URL内容 → 获取字典值(response) → 显示提醒
```

### 代码解释
```
询问输入("解释这段代码") → 设置变量(code) → 获取URL内容(message="解释这段代码:\n{{code}}") → 显示结果
```

### 翻译助手
```
询问输入("翻译") → 设置变量(text) → 获取URL内容(message="将以下文本翻译成中文:\n{{text}}") → 显示结果
```
