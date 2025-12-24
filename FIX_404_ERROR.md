# 修复 404 错误

## 问题原因
前端 React 开发服务器（运行在端口3000）无法连接到后端服务器（运行在端口8000），因为缺少代理配置。

## 已修复内容

### 1. 添加代理配置 ✅
在 `frontend/package.json` 中添加了：
```json
"proxy": "http://localhost:8000"
```

这样前端的所有 `/api/*` 请求会自动代理到后端的 `http://localhost:8000`。

### 2. 修复 ESLint 警告 ✅
移除了未使用的 `outlineBuffer` 变量。

## 需要重启前端服务器

⚠️ **重要：** 修改 `package.json` 后，需要重启前端开发服务器才能生效。

### 操作步骤：

1. **停止前端服务器**
   - 在终端19中按 `Ctrl+C` 停止当前的 `npm start` 进程

2. **重新启动前端服务器**
   ```bash
   cd frontend
   npm start
   ```

3. **验证配置**
   - 前端应该运行在 `http://localhost:3000`
   - 后端应该运行在 `http://localhost:8000`
   - 前端的 `/api/*` 请求会自动代理到后端

## 代理工作原理

```
浏览器访问: http://localhost:3000
    ↓
前端发起请求: /api/config/load
    ↓
React代理转发: http://localhost:8000/api/config/load
    ↓
后端处理并返回结果
```

## 验证方法

重启前端服务器后，打开浏览器开发者工具（F12）：
1. 访问 `http://localhost:3000`
2. 打开 Network 标签
3. 尝试任何操作（如点击配置按钮）
4. 检查请求是否成功（状态码200而不是404）

## 备选方案：使用 setupProxy.js

如果简单的 proxy 配置不够用，可以创建 `frontend/src/setupProxy.js`：

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
    })
  );
};
```

但目前使用简单的 `"proxy"` 配置就足够了。

## 常见问题

### Q: 重启后仍然404？
A: 检查：
- 后端服务器是否在运行（应该在 http://localhost:8000）
- 前端是否正确重启（不要只刷新页面，要停止并重新运行 npm start）
- 浏览器缓存是否清除（Ctrl+Shift+R 强制刷新）

### Q: 端口冲突？
A: 如果8000端口被占用，需要：
1. 修改 `backend/run.py` 中的端口
2. 同时修改 `frontend/package.json` 中的 proxy 地址

### Q: CORS 错误？
A: 后端已经配置了 CORS，应该不会有问题。如果仍然出现，检查 `backend/app/main.py` 中的 CORS 配置。

