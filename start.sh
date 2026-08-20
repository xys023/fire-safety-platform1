#!/bin/bash
# 智慧消防联防联控平台 启动脚本 (Linux/Mac)
cd "$(dirname "$0")"

echo "========================================"
echo "  智慧消防联防联控平台 启动脚本"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js 16 或以上版本"
    echo "Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
    echo "Mac: brew install node"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "[1/2] 首次运行，正在安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败，请检查网络"
        exit 1
    fi
else
    echo "[1/2] 依赖已安装，跳过"
fi

echo "[2/2] 正在启动服务..."
echo ""
echo "========================================"
echo "  启动成功！"
echo ""
echo "  PC端后台：http://localhost:3000/admin/"
echo "  移动端：  http://localhost:3000/mobile/"
echo ""
echo "  默认账号：admin / 123456"
echo "  按 Ctrl+C 停止服务"
echo "========================================"
echo ""

node server.js
