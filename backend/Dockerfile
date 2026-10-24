# ==============================================================================
# backend/Dockerfile: Container hóa ứng dụng Node.js/Express Task Tracker
# Đáp ứng yêu cầu bảo mật: chạy bằng user không phải root (USER node)
# ==============================================================================

FROM node:22-alpine

WORKDIR /app

# Sao chép tệp định nghĩa thư viện và cài đặt
COPY package*.json ./
RUN npm install --omit=dev

# Sao chép mã nguồn ứng dụng
COPY src ./src

# Chạy ứng dụng bằng tài khoản người dùng thông thường, không dùng root
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
