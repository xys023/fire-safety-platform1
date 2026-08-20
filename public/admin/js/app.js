/**
 * PC端后台主应用
 * 包含：登录、布局、路由、API封装
 */
const { createApp, ref, reactive, computed, onMounted, watch, h } = Vue;

/* ============ API 封装 ============ */
const API_BASE = '/api';
function getToken() { return localStorage.getItem('fire_token') || ''; }
function setToken(t) { localStorage.setItem('fire_token', t); }
function clearToken() { localStorage.removeItem('fire_token'); localStorage.removeItem('fire_user'); }

async function api(url, options = {}) {
  const token = getToken();
  const opts = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  try {
    const res = await fetch(API_BASE + url, opts);
    if (res.status === 401) { clearToken(); location.hash = '#/login'; return { code: 401, message: '登录已过期' }; }
    return await res.json();
  } catch (e) {
    ElementPlus.ElMessage.error('网络请求失败：' + e.message);
    return { code: -1, message: e.message };
  }
}

// 文件上传
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(API_BASE + '/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + getToken() },
    body: formData
  });
  return await res.json();
}

/* ============ 登录页组件 ============ */
const LoginPage = {
  template: `
    <div class="login-container">
      <div class="login-box">
        <div class="login-title">
          <h1>智慧消防联防联控平台</h1>
          <p>PC端管理后台</p>
        </div>
        <el-form :model="form" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input v-model="form.username" placeholder="请输入账号" prefix-icon="User" size="large" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password @keyup.enter="handleLogin" />
          </el-form-item>
          <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleLogin">登 录</el-button>
        </el-form>
        <div class="login-tip">
          <strong>演示账号：</strong><br>
          管理员：admin / 123456<br>
          网格员：grid01 / 123456<br>
          业主：owner01 / 123456
        </div>
      </div>
    </div>
  `,
  setup() {
    const form = reactive({ username: '', password: '' });
    const loading = ref(false);
    const router = Vue.inject('router');

    async function handleLogin() {
      if (!form.username || !form.password) {
        ElementPlus.ElMessage.warning('请输入账号和密码');
        return;
      }
      loading.value = true;
      const res = await api('/auth/login', { method: 'POST', body: form });
      loading.value = false;
      if (res.code === 0) {
        setToken(res.data.token);
        localStorage.setItem('fire_user', JSON.stringify(res.data.user));
        ElementPlus.ElMessage.success('登录成功');
        router.go('/dashboard');
      } else {
        ElementPlus.ElMessage.error(res.message);
      }
    }
    return { form, loading, handleLogin };
  }
};

/* ============ 主布局组件 ============ */
const MainLayout = {
  template: `
    <div class="layout">
      <div class="sidebar">
        <div class="sidebar-logo">
          <el-icon><AlarmClock /></el-icon>
          智慧消防平台
        </div>
        <el-menu :default-active="currentPath" background-color="#1d2b3a" text-color="#bfcbd9" active-text-color="#409eff" @select="handleSelect" router>
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon><span>数据大屏</span>
          </el-menu-item>
          <el-sub-menu index="base">
            <template #title><el-icon><OfficeBuilding /></el-icon><span>基础管理</span></template>
            <el-menu-item index="/places">场所管理</el-menu-item>
            <el-menu-item index="/grids">网格管理</el-menu-item>
            <el-menu-item index="/resources">消防资源</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="monitor">
            <template #title><el-icon><Monitor /></el-icon><span>物联监测</span></template>
            <el-menu-item index="/devices">烟感设备</el-menu-item>
            <el-menu-item index="/alarms">警情管理</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="govern">
            <template #title><el-icon><Warning /></el-icon><span>隐患治理</span></template>
            <el-menu-item index="/hazards">隐患管理</el-menu-item>
            <el-menu-item index="/inspections">巡查记录</el-menu-item>
            <el-menu-item index="/workorders">工单管理</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/knowledge">
            <el-icon><Reading /></el-icon><span>消防知识库</span>
          </el-menu-item>
          <el-menu-item index="/users" v-if="user.role === 'admin'">
            <el-icon><UserFilled /></el-icon><span>用户管理</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="main-area">
        <div class="header">
          <div class="header-left">{{ pageTitle }}</div>
          <div class="header-right">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="badge-item">
              <el-button :icon="Bell" circle size="small" @click="showNotifications" />
            </el-badge>
            <el-dropdown @command="handleCommand">
              <span style="cursor:pointer;display:flex;align-items:center;gap:6px;">
                <el-avatar :size="32" style="background:#409eff;">{{ user.name ? user.name[0] : 'U' }}</el-avatar>
                <span>{{ user.name }}</span>
                <el-tag size="small" :type="roleTagType">{{ roleText }}</el-tag>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <div class="content">
          <component :is="currentView" />
        </div>
      </div>

      <!-- 修改密码弹窗 -->
      <el-dialog v-model="pwdDialog" title="修改密码" width="400px">
        <el-form :model="pwdForm" label-width="80px">
          <el-form-item label="原密码"><el-input v-model="pwdForm.oldPassword" type="password" show-password /></el-form-item>
          <el-form-item label="新密码"><el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少6位" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="pwdDialog = false">取消</el-button>
          <el-button type="primary" @click="changePassword">确定</el-button>
        </template>
      </el-dialog>

      <!-- 通知弹窗 -->
      <el-dialog v-model="notifDialog" title="消息通知" width="500px">
        <div v-if="notifications.length === 0" style="text-align:center;color:#999;padding:20px;">暂无通知</div>
        <el-timeline v-else>
          <el-timeline-item v-for="n in notifications" :key="n.id" :timestamp="n.created_at" :type="n.is_read ? 'info' : 'primary'">
            <div style="font-weight:600;">{{ n.title }}</div>
            <div style="color:#666;font-size:13px;">{{ n.content }}</div>
          </el-timeline-item>
        </el-timeline>
      </el-dialog>
    </div>
  `,
  setup() {
    const router = Vue.inject('router');
    const user = ref(JSON.parse(localStorage.getItem('fire_user') || '{}'));
    const currentPath = ref(router.current);
    const pwdDialog = ref(false);
    const pwdForm = reactive({ oldPassword: '', newPassword: '' });
    const notifDialog = ref(false);
    const notifications = ref([]);
    const unreadCount = ref(0);

    const { Bell } = ElementPlusIconsVue;

    // 路由映射
    const routeMap = {
      '/dashboard': { comp: 'DashboardPage', title: '数据大屏' },
      '/places': { comp: 'PlacesPage', title: '场所管理' },
      '/grids': { comp: 'GridsPage', title: '网格管理' },
      '/devices': { comp: 'DevicesPage', title: '烟感设备管理' },
      '/alarms': { comp: 'AlarmsPage', title: '警情管理' },
      '/hazards': { comp: 'HazardsPage', title: '隐患管理' },
      '/inspections': { comp: 'InspectionsPage', title: '巡查记录' },
      '/workorders': { comp: 'WorkordersPage', title: '工单管理' },
      '/resources': { comp: 'ResourcesPage', title: '消防资源' },
      '/knowledge': { comp: 'KnowledgePage', title: '消防知识库' },
      '/users': { comp: 'UsersPage', title: '用户管理' }
    };

    const currentView = computed(() => routeMap[currentPath.value]?.comp || 'DashboardPage');
    const pageTitle = computed(() => routeMap[currentPath.value]?.title || '数据大屏');

    const roleMap = { admin: '管理员', grid_worker: '网格员', owner: '业主', operator: '运维人员', fire_department: '消防部门' };
    const roleText = computed(() => roleMap[user.value.role] || user.value.role);
    const roleTagType = computed(() => {
      const m = { admin: 'danger', grid_worker: 'primary', owner: 'success', operator: 'warning', fire_department: 'info' };
      return m[user.value.role] || '';
    });

    function handleSelect(index) { router.go(index); }

    // 监听路由变化
    router.onChange((path) => { currentPath.value = path; });

    function handleCommand(cmd) {
      if (cmd === 'logout') {
        ElementPlus.ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' }).then(() => {
          clearToken();
          router.go('/login');
        }).catch(() => {});
      } else if (cmd === 'password') {
        pwdForm.oldPassword = ''; pwdForm.newPassword = '';
        pwdDialog.value = true;
      }
    }

    async function changePassword() {
      if (!pwdForm.oldPassword || !pwdForm.newPassword) { ElementPlus.ElMessage.warning('请填写完整'); return; }
      const res = await api('/auth/password', { method: 'PUT', body: pwdForm });
      if (res.code === 0) { ElementPlus.ElMessage.success('密码修改成功'); pwdDialog.value = false; }
      else ElementPlus.ElMessage.error(res.message);
    }

    async function loadNotifications() {
      const res = await api('/notifications');
      if (res.code === 0) { notifications.value = res.data.list; unreadCount.value = res.data.unread; }
    }
    function showNotifications() { notifDialog.value = true; loadNotifications(); }

    onMounted(() => { loadNotifications(); setInterval(loadNotifications, 60000); });

    return { user, currentPath, currentView, pageTitle, roleText, roleTagType, Bell,
      handleSelect, handleCommand, pwdDialog, pwdForm, changePassword,
      notifDialog, notifications, unreadCount, showNotifications };
  }
};

/* ============ 简易路由 ============ */
function createRouter() {
  const listeners = [];
  const current = ref(location.hash.replace('#', '') || '/dashboard');
  window.addEventListener('hashchange', () => {
    current.value = location.hash.replace('#', '') || '/dashboard';
    listeners.forEach(fn => fn(current.value));
  });
  return {
    current,
    go(path) { location.hash = '#' + path; },
    onChange(fn) { listeners.push(fn); }
  };
}

/* ============ 应用启动 ============ */
const App = {
  template: `
    <component :is="isLogin ? 'LoginPage' : 'MainLayout'" />
  `,
  setup() {
    const router = createRouter();
    Vue.provide('router', router);
    Vue.provide('api', api);
    Vue.provide('uploadFile', uploadFile);

    const isLogin = ref(!getToken());
    router.onChange((path) => {
      isLogin.value = !getToken() || path === '/login';
    });
    // 初始检查
    if (!getToken()) { location.hash = '#/login'; isLogin.value = true; }
    else if (location.hash.replace('#', '') === '' || location.hash.replace('#', '') === '/') { location.hash = '#/dashboard'; }

    return { isLogin };
  }
};

const app = createApp(App);
// 注册 Element Plus
app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
// 注册全局组件
app.component('LoginPage', LoginPage);
app.component('MainLayout', MainLayout);
app.component('DashboardPage', window.DashboardPage);
app.component('PlacesPage', window.PlacesPage);
app.component('GridsPage', window.GridsPage);
app.component('DevicesPage', window.DevicesPage);
app.component('AlarmsPage', window.AlarmsPage);
app.component('HazardsPage', window.HazardsPage);
app.component('InspectionsPage', window.InspectionsPage);
app.component('WorkordersPage', window.WorkordersPage);
app.component('ResourcesPage', window.ResourcesPage);
app.component('KnowledgePage', window.KnowledgePage);
app.component('UsersPage', window.UsersPage);

app.mount('#app');
