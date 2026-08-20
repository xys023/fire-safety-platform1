/**
 * 智慧消防联防联控平台 - 后端服务入口
 *
 * 启动方式：node server.js
 * 默认端口：3000
 * PC端后台：http://localhost:3000/admin/
 * 移动端小程序：http://localhost:3000/mobile/
 * API接口：http://localhost:3000/api/
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // 支持base64图片上传
app.use(express.urlencoded({ extended: true }));

// 静态文件：上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 静态文件：PC端后台
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
// 静态文件：移动端
app.use('/mobile', express.static(path.join(__dirname, 'public', 'mobile')));
// 根路径跳转到PC端
app.get('/', (req, res) => {
  res.redirect('/admin/');
});

/* ===================== API 路由 ===================== */
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/grids', require('./src/routes/grids'));
app.use('/api/places', require('./src/routes/places'));
app.use('/api/devices', require('./src/routes/devices'));
app.use('/api/alarms', require('./src/routes/alarms'));
app.use('/api/hazards', require('./src/routes/hazards'));
app.use('/api/inspections', require('./src/routes/inspections'));
app.use('/api/workorders', require('./src/routes/workorders'));
app.use('/api/statistics', require('./src/routes/statistics'));
app.use('/api/resources', require('./src/routes/resources'));
app.use('/api/knowledge', require('./src/routes/knowledge'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/upload', require('./src/routes/upload'));

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[服务器错误]', err.message);
  res.status(500).json({ code: 500, message: '服务器内部错误：' + err.message });
});

/* ===================== 启动服务 ===================== */
async function start() {
  try {
    // 1. 初始化数据库（加载 WASM、建表、写入演示数据）
    await initDatabase();

    // 2. 启动 HTTP 服务
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('========================================');
      console.log('  智慧消防联防联控平台 已启动');
      console.log('========================================');
      console.log(`  PC端后台：  http://localhost:${PORT}/admin/`);
      console.log(`  移动端：    http://localhost:${PORT}/mobile/`);
      console.log(`  API接口：   http://localhost:${PORT}/api/`);
      console.log('----------------------------------------');
      console.log('  默认管理员账号：admin / 123456');
      console.log('  网格员账号：    grid01 / 123456');
      console.log('  业主账号：      owner01 / 123456');
      console.log('========================================');
      console.log('');
    });
  } catch (err) {
    console.error('[启动失败]', err);
    process.exit(1);
  }
}

start();
