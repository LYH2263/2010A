# 小型电商商品管理系统

一个轻量化的 Web 应用系统，提供商品管理、订单处理、库存统计等核心功能。采用前后端分离架构，遵循 Laravel MVC 设计模式。

## 🛠 技术栈

### 前端
- **React 18** - UI 框架
- **Vite** - 构建工具与开发服务器
- **React Router** - 路由管理
- **Tailwind CSS** - 样式框架（主色 #FF6A00）
- **Nginx** - 生产环境静态资源服务

### 后端
- **Laravel 10** - PHP 框架
- **Laravel Sanctum** - SPA 认证
- **PHP 8.2** - 运行环境
- **MySQL 8.0** - 数据库
- **Eloquent ORM** - 数据库操作

### 部署
- **Docker Compose** - 容器编排
- **Docker** - 容器化部署

## 📁 目录结构

遵循 Laravel MVC 与目录规范，控制器、模型、视图、服务类等文件组织清晰。

```
label-2010/
├── backend/                    # Laravel 后端（MVC + 服务层）
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/    # 控制器（Dashboard, Product, Category, Order, Inventory）
│   │   │   ├── Requests/       # Form Request 校验
│   │   │   └── Middleware/     # 中间件
│   │   ├── Models/             # Eloquent 模型（User, Category, Product, Order, OrderItem）
│   │   └── Services/           # 业务逻辑层（ProductService, CategoryService, OrderService, InventoryService）
│   ├── database/
│   │   ├── migrations/         # 数据库迁移（5 张表：users + 4 张业务表）
│   │   └── seeders/            # 数据填充（演示数据）
│   ├── resources/views/        # Blade 视图（按模块：dashboard, products, categories, orders, inventory）
│   ├── routes/
│   │   ├── web.php             # Web 路由（Blade 页面）
│   │   └── api.php             # API 路由（JSON 接口）
│   └── Dockerfile
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── pages/              # 页面组件（Login, Dashboard, ProductList 等）
│   │   ├── contexts/           # React Context（AuthContext、ToastContext、ConfirmDialogContext）
│   │   ├── components/         # 组件（ProtectedRoute、Pagination、Toast）
│   │   ├── api.js              # API 调用封装
│   │   ├── App.jsx             # 主应用组件
│   │   └── index.css           # Tailwind 样式
│   ├── public/                 # 静态资源（favicon）
│   ├── nginx.conf              # Nginx SPA 路由回退配置（刷新子路由不 404）
│   └── Dockerfile
├── docker-compose.yml          # Docker 编排配置
└── README.md                   # 项目说明文档
```

## 🚀 启动指南 (How to Run)

### 方式一：Docker Compose（推荐）

1. **确保 Docker Desktop 已启动**

2. **在项目根目录（label-2010）执行：**
   ```bash
   docker compose up --build
   ```

3. **等待容器启动完成**
   - 首次启动会自动执行数据库迁移（共 5 张表：users + 4 张业务表）
   - 自动填充演示数据（分类、商品、订单）
   - 后端服务启动在 8000 端口
   - 前端服务启动在 3000 端口

4. **访问应用**
   - 前端：http://localhost:3000
   - 后端 Web：http://localhost:8000
   - 后端 API：http://localhost:8000/api

### 方式二：本地开发（可选）

#### 后端开发
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# 修改 .env 中的 DB_HOST=127.0.0.1（本地 MySQL）
php artisan migrate --seed
# 若需大量测试数据（图表、分页等）：php artisan migrate:fresh --seed
php artisan serve --port=8000
```

#### 前端开发
```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
# Vite 开发服务器会自动代理 /api 请求到后端
```

## 🔗 服务地址 (Services)

| 服务 | 地址 | 说明 |
|------|------|------|
| **前端** | http://localhost:3000 | React SPA 应用 |
| **后端 Web** | http://localhost:8000 | Laravel Blade 视图（可选） |
| **后端 API** | http://localhost:8000/api | RESTful API 接口 |
| **数据库** | localhost:3306 | MySQL（用户: root / 密码: secret，数据库: shop） |

## 📊 数据库设计

满足「至少 4 张数据表、合理设计字段」要求，当前共 5 张表。

### 数据表（5 张）

1. **users** - 管理员用户
   - id, name, email, password, timestamps

2. **categories** - 商品分类
   - id, name, slug, sort_order, timestamps

3. **products** - 商品
   - id, category_id, name, sku, description, price, stock, status, timestamps

4. **orders** - 订单
   - id, order_no, status, total_amount, remark, timestamps

5. **order_items** - 订单明细
   - id, order_id, product_id, product_name, price, quantity, subtotal, timestamps

### 表关系
- categories ↔ products：一对多
- orders ↔ order_items：一对多
- products ↔ order_items：一对多

## ✨ 功能说明

### 1. 仪表盘（Dashboard）
- **核心数据统计**：商品总数、订单总数、库存总量、已收款金额
- **最近订单**：显示最近 8 条订单，快速查看订单状态与金额
- **低库存提醒**：显示库存 ≤10 的商品，便于及时补货
- **快捷入口**：新增商品、创建订单、库存管理

### 2. 商品管理（Products）
- **商品列表**：支持按商品名称/SKU、分类筛选，提供「查询」「重置」按钮；分页与总数由服务端返回
- **商品新增**：填写名称、SKU、分类、单价、库存、状态
- **商品编辑**：修改商品信息；从列表进入编辑后保存/取消返回列表，从详情进入则返回详情
- **商品详情**：查看完整信息，快速跳转库存调整
- **商品删除**：删除商品（使用自定义确认弹窗）

### 3. 分类管理（Categories）
- **分类列表**：查看所有分类
- **分类新增**：创建新分类（名称、标识、排序）
- **分类编辑**：修改分类信息
- **分类删除**：删除分类（使用自定义确认弹窗）

### 4. 订单处理（Orders）
- **订单列表**：按状态筛选（全部/待付款/已付款/已发货）；支持按订单号、创建时间起止筛选，提供「查询」「重置」按钮；操作列为按钮样式，文案与详情页一致（详情、标记已付款、标记已发货、操作已完成、取消订单）
- **订单创建**：选择商品并填写数量，自动计算总金额，提交后扣减库存
- **订单详情**：查看订单信息、明细列表、订单状态；可进行状态更新操作
- **状态更新**：标记已付款、已发货、操作已完成、取消订单（取消时退回库存，关键操作均使用自定义确认弹窗）

### 5. 库存统计（Inventory）
- **库存概览**：库存总量、库存总价值、低库存商品数
- **库存列表**：支持按商品名称/SKU、分类、仅低库存（≤10）筛选，提供「查询」「重置」按钮；低库存商品高亮显示
- **低库存提醒**：库存 ≤10 的商品快速入口
- **库存调整**：单商品库存调整（正数入库、负数出库），记录调整原因

## 🎨 UI/UX 特点

- **主色与配色**：主色 #FF6A00，浅色 #FFE5D6，悬停 #FF8533
- **界面风格**：圆角卡片、轻量阴影、渐变背景
- **响应式设计**：支持 PC 端与移动端
- **交互反馈**：加载状态、错误提示、空状态提示、自定义确认弹窗（替代浏览器原生弹窗）、Toast 全局提示
- **面包屑导航**：清晰的页面层级导航
- **路由刷新支持**：Nginx 使用 SPA 回退（`try_files $uri $uri/ /index.html`），在 `/login`、`/products/:id` 等子路由刷新不会 404

## 🔌 API 接口

### 基础路径
- API 前缀：`/api`
- 请求头：`Accept: application/json`

### 认证接口（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 登录（body: `{ "email", "password" }`） |
| POST | `/api/logout` | 登出 |

### 业务接口（需登录，请求时携带 Cookie）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me` | 获取当前登录用户信息 |
| GET | `/api/` | 仪表盘数据（含最近订单、低库存商品） |
| GET | `/api/products` | 商品列表（支持 `category_id`、`keyword` 名称/SKU 模糊、`per_page`、`page`） |
| POST | `/api/products` | 创建商品（需认证） |
| GET | `/api/products/{id}` | 商品详情 |
| PUT | `/api/products/{id}` | 更新商品 |
| DELETE | `/api/products/{id}` | 删除商品 |
| GET | `/api/categories` | 分类列表 |
| POST | `/api/categories` | 创建分类 |
| PUT | `/api/categories/{id}` | 更新分类 |
| DELETE | `/api/categories/{id}` | 删除分类 |
| GET | `/api/orders` | 订单列表（支持 `status`、`order_no`、`date_from`、`date_to`、`per_page`、`page`） |
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders/{id}` | 订单详情 |
| PATCH | `/api/orders/{order}/status` | 更新订单状态 |
| GET | `/api/inventory` | 库存列表与统计（支持 `keyword`、`category_id`、`low_stock`、`per_page`、`page`） |
| POST | `/api/inventory/{product}/adjust` | 调整库存 |

## 🔐 登录认证

系统已启用登录功能，所有页面需要管理员登录后才能访问。

### 默认管理员账号
- **邮箱**：`admin@example.com`
- **密码**：`admin123`

首次启动会自动创建该管理员账号。
登录页面不展示默认账号与密码，测试账号仅在 README 提供。

### 登录流程
1. 访问前端地址 http://localhost:3000
2. 自动跳转到登录页面
3. 输入邮箱和密码登录
4. 登录成功后进入仪表盘

### 认证机制
- 使用 **Laravel Session** 进行认证
- 基于 Session Cookie，前后端同域或 CORS + credentials 携带 Cookie
- 所有 API 接口需要认证（除登录、登出接口）
- 未登录访问会自动跳转到登录页

## 📝 开发规范

### 后端（Laravel）
- **MVC 架构**：Controller → Service → Model
- **Form Request**：参数校验
- **Eloquent ORM**：数据库操作，禁止拼接 SQL
- **日志**：使用 `Log` facade，禁止 `print()`
- **错误处理**：try-catch + 日志记录

### 前端（React）
- **组件化**：页面组件 + API 封装
- **状态管理**：useState + useEffect
- **路由**：React Router
- **样式**：Tailwind CSS

### Docker
- **一键启动**：`docker compose up --build`
- **数据持久化**：MySQL 数据存储在 Docker Volume
- **服务通信**：容器间使用服务名（如 `backend`、`db`）

## 🐛 常见问题

### Q: 容器启动失败？
A: 检查 Docker Desktop 是否运行，端口 3000、8000、3306 是否被占用。

### Q: 前端无法连接后端 API？
A: 检查后端容器是否正常运行，访问 http://localhost:8000/api/ 测试 API 是否可用。

### Q: 数据库连接失败？
A: 确保 `db` 容器健康检查通过，检查 `backend` 容器的 `DB_HOST=db` 配置。

### Q: 如何重置数据库？
A: 删除 MySQL Volume 后重新启动：
```bash
docker compose down -v
docker compose up --build
```

### Q: 登录后仍提示未登录或 401？
A: 确认请求带 Cookie：前端请求需加 `credentials: 'include'`；后端 CORS 需允许来源且 `supports_credentials` 为 true；若前后端端口不同，确保 `config/cors.php` 中 `allowed_origins` 包含前端地址（如 `http://localhost:3000`）。

### Q: 前端子路由刷新出现 404（如 /login、/orders/1）？
A: 确保前端镜像包含 `frontend/nginx.conf` 并已重新构建；配置需包含 `try_files $uri $uri/ /index.html;`，用于 SPA 路由回退。

## 📋 与需求文档对应说明

根据需求文档（prompt.md）要求，本项目对应关系如下：

| 需求项 | 分值 | 对应说明 |
|--------|------|----------|
| **1. 架构设计文档** | 40 分 | **系统模块划分**：遵循 Laravel MVC，后端含 Controllers、Models、Views、Services、Requests；模块划分为仪表盘、商品、分类、订单、库存。**路由规划**：Web 路由与 API 路由见 `backend/routes/web.php`、`api.php`。 |
| **2. 数据库设计** | 20 分 | 见上文「📊 数据库设计」：共 5 张表（users、categories、products、orders、order_items），字段与表关系已说明。 |
| **3. 目录结构规范** | 40 分 | 见上文「📁 目录结构」：后端严格按 Laravel 组织（app/Http/Controllers、Models、Services、database/migrations、resources/views、routes）；前端按 React 项目组织（pages、contexts、components、api）。 |

## 📦 项目特点

✅ **100% 容器化** - 前端、后端、数据库全部 Docker 化  
✅ **一键启动** - `docker compose up` 即可运行  
✅ **登录认证** - 管理员登录后可查看与管理数据  
✅ **双端支持** - 同时提供 Web（Blade）和 API（JSON）接口  
✅ **现代 UI** - 简洁界面与清晰交互  
✅ **完整功能** - 商品、分类、订单、库存全流程管理；各列表支持筛选与查询/重置  
✅ **演示数据** - 自动填充种子数据，开箱即用  

---

**项目状态**：✅ 已完成，可直接使用
