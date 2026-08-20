/**
 * 移动端小程序主应用
 * 微信小程序风格 H5，可封装为微信小程序
 */
const { createApp, ref, reactive, computed, onMounted, onActivated, nextTick } = Vue;

/* ========== API 封装 ========== */
const API_BASE = '/api';
function getToken() { return localStorage.getItem('m_token') || ''; }
function setToken(t) { localStorage.setItem('m_token', t); }
function clearToken() { localStorage.removeItem('m_token'); localStorage.removeItem('m_user'); }

async function api(url, options = {}) {
  const token = getToken();
  const opts = { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  try {
    const res = await fetch(API_BASE + url, opts);
    if (res.status === 401) { clearToken(); location.reload(); return { code: 401 }; }
    return await res.json();
  } catch (e) {
    return { code: -1, message: '网络错误' };
  }
}

/* ========== 应用组件 ========== */
const App = {
  template: `
    <div class="page">
      <!-- 登录页 -->
      <template v-if="!isLogin">
        <div class="login-page">
          <div class="login-logo">🚒</div>
          <div class="login-title">智慧消防联防联控</div>
          <div class="login-form">
            <div class="input-group"><input v-model="loginForm.username" placeholder="请输入账号" /></div>
            <div class="input-group"><input v-model="loginForm.password" type="password" placeholder="请输入密码" @keyup.enter="doLogin" /></div>
            <button class="login-btn" @click="doLogin" :disabled="logging">{{ logging ? '登录中...' : '登 录' }}</button>
            <div class="login-tip">
              演示账号：grid01 / 123456（网格员）<br>
              owner01 / 123456（业主）
            </div>
          </div>
        </div>
      </template>

      <!-- 主界面 -->
      <template v-else>
        <!-- 页面导航栏 -->
        <div class="nav-bar" v-if="currentTab !== 'home' || pageStack.length > 0">
          <span class="back" v-if="pageStack.length > 0" @click="goBack">‹</span>
          {{ pageTitle }}
          <span class="right-btn" v-if="currentPage === 'home'" @click="refresh">刷新</span>
        </div>

        <div class="page-content">
          <!-- 工作台 -->
          <template v-if="currentTab === 'home' && pageStack.length === 0">
            <div class="workbench-header">
              <div class="greeting">你好，{{ user.name }}</div>
              <div class="sub">{{ roleText }} · {{ today }}</div>
            </div>
            <div class="stat-row">
              <div class="stat-item"><div class="num">{{ stats.places || 0 }}</div><div class="label">建档场所</div></div>
              <div class="stat-item"><div class="num red">{{ stats.alarms || 0 }}</div><div class="label">待处理警情</div></div>
              <div class="stat-item"><div class="num orange">{{ stats.hazards || 0 }}</div><div class="label">待整改隐患</div></div>
              <div class="stat-item"><div class="num">{{ stats.devices || 0 }}</div><div class="label">在线设备</div></div>
            </div>
            <div class="func-grid">
              <div class="func-item" @click="navigate('places')">
                <div class="icon icon-blue">🏢</div><div class="text">场所巡查</div>
              </div>
              <div class="func-item" @click="navigate('hazard-report')">
                <div class="icon icon-red">⚠️</div><div class="text">隐患上报</div>
              </div>
              <div class="func-item" @click="navigate('alarms')">
                <div class="icon icon-red">🚨</div><div class="text">警情处置</div>
              </div>
              <div class="func-item" @click="navigate('devices')">
                <div class="icon icon-cyan">📡</div><div class="text">设备监控</div>
              </div>
              <div class="func-item" @click="navigate('map')">
                <div class="icon icon-green">🗺️</div><div class="text">消防地图</div>
              </div>
              <div class="func-item" @click="navigate('workorders')">
                <div class="icon icon-orange">📋</div><div class="text">我的工单</div>
              </div>
              <div class="func-item" @click="navigate('knowledge')">
                <div class="icon icon-purple">📚</div><div class="text">消防知识</div>
              </div>
              <div class="func-item" @click="navigate('inspection-start')">
                <div class="icon icon-blue">✅</div><div class="text">开始巡查</div>
              </div>
            </div>
            <div class="section-title">最新警情</div>
            <div v-if="recentAlarms.length === 0" class="empty"><div class="icon">✅</div>暂无警情</div>
            <div v-for="a in recentAlarms" :key="a.id" class="card alarm-card" :class="a.type" @click="viewAlarm(a.id)">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:600;color:#f56c6c;">🚨 {{ typeText(a.type) }}</span>
                <span class="tag" :class="statusTag(a.status)">{{ statusText(a.status) }}</span>
              </div>
              <div style="margin-top:8px;font-size:14px;">{{ a.place_name }}</div>
              <div style="margin-top:4px;font-size:12px;color:#999;">{{ a.address }}</div>
              <div style="margin-top:4px;font-size:12px;color:#bbb;">{{ a.alarm_time }}</div>
            </div>
          </template>

          <!-- 巡查Tab -->
          <template v-if="currentTab === 'inspect' && pageStack.length === 0">
            <div class="search-bar"><input v-model="inspectSearch" placeholder="搜索场所名称" @keyup.enter="loadPlaces" /></div>
            <div v-for="p in places" :key="p.id" class="list-item" @click="startInspect(p)">
              <div class="title">
                {{ p.name }}
                <span class="tag" :class="riskTag(p.risk_level)">{{ riskText(p.risk_level) }}</span>
              </div>
              <div class="desc">{{ p.address }}</div>
              <div class="meta"><span>{{ p.type }} · {{ p.owner_name }}</span><span>{{ p.device_count }}个烟感</span></div>
            </div>
            <div v-if="places.length === 0" class="empty"><div class="icon">📋</div>暂无场所</div>
          </template>

          <!-- 警情Tab -->
          <template v-if="currentTab === 'alarm' && pageStack.length === 0">
            <div v-for="a in alarmList" :key="a.id" class="list-item" @click="viewAlarm(a.id)">
              <div class="title">
                <span>🚨 {{ a.place_name }}</span>
                <span class="tag" :class="statusTag(a.status)">{{ statusText(a.status) }}</span>
              </div>
              <div class="desc">{{ a.address }}</div>
              <div class="meta"><span>{{ typeText(a.type) }}</span><span>{{ a.alarm_time }}</span></div>
            </div>
            <div v-if="alarmList.length === 0" class="empty"><div class="icon">✅</div>暂无警情</div>
          </template>

          <!-- 我的Tab -->
          <template v-if="currentTab === 'me' && pageStack.length === 0">
            <div class="profile-header">
              <div class="profile-avatar">{{ user.name ? user.name[0] : 'U' }}</div>
              <div>
                <div class="profile-name">{{ user.name }}</div>
                <div class="profile-role">{{ roleText }} · {{ user.phone }}</div>
              </div>
            </div>
            <div class="profile-menu">
              <div class="profile-menu-item" @click="navigate('my-workorders')">
                <span class="icon">📋</span><span class="text">我的工单</span><span class="arrow">›</span>
              </div>
              <div class="profile-menu-item" @click="navigate('my-inspections')">
                <span class="icon">📝</span><span class="text">巡查记录</span><span class="arrow">›</span>
              </div>
              <div class="profile-menu-item" @click="navigate('password')">
                <span class="icon">🔒</span><span class="text">修改密码</span><span class="arrow">›</span>
              </div>
              <div class="profile-menu-item" @click="logout">
                <span class="icon">🚪</span><span class="text">退出登录</span><span class="arrow">›</span>
              </div>
            </div>
          </template>

          <!-- 子页面：场所列表 -->
          <template v-if="currentPage === 'places'">
            <div class="search-bar"><input v-model="placeSearch" placeholder="搜索场所" @keyup.enter="loadPlaces" /></div>
            <div v-for="p in places" :key="p.id" class="list-item" @click="viewPlace(p.id)">
              <div class="title">{{ p.name }}<span class="tag" :class="riskTag(p.risk_level)">{{ riskText(p.risk_level) }}</span></div>
              <div class="desc">{{ p.address }}</div>
              <div class="meta"><span>{{ p.type }}</span><span>{{ p.owner_phone }}</span></div>
            </div>
          </template>

          <!-- 子页面：场所详情 -->
          <template v-if="currentPage === 'place-detail' && placeDetail">
            <div class="card">
              <h3 style="margin-bottom:10px;">{{ placeDetail.name }}</h3>
              <div style="font-size:13px;color:#666;line-height:2;">
                <div>类型：{{ placeDetail.type }}</div>
                <div>地址：{{ placeDetail.address }}</div>
                <div>业主：{{ placeDetail.owner_name }} {{ placeDetail.owner_phone }}</div>
                <div>面积：{{ placeDetail.area }}㎡ · 员工：{{ placeDetail.employee_count }}人</div>
                <div>风险等级：<span class="tag" :class="riskTag(placeDetail.risk_level)">{{ riskText(placeDetail.risk_level) }}</span></div>
              </div>
              <div style="margin-top:12px;display:flex;gap:8px;">
                <button class="btn btn-primary btn-sm" @click="startInspect(placeDetail)">开始巡查</button>
                <button class="btn btn-danger btn-sm" @click="reportHazardForPlace(placeDetail)">上报隐患</button>
              </div>
            </div>
            <div class="section-title">烟感设备</div>
            <div v-for="d in placeDetail.devices" :key="d.id" class="list-item">
              <div class="title">{{ d.device_code }}<span class="tag" :class="deviceStatusTag(d.status)">{{ deviceStatusText(d.status) }}</span></div>
              <div class="meta"><span>电量{{ d.battery }}%</span><span>{{ d.last_online_at }}</span></div>
            </div>
            <div class="section-title">隐患记录</div>
            <div v-for="h in placeDetail.hazards" :key="h.id" class="list-item">
              <div class="title">{{ h.description }}<span class="tag" :class="riskTag(h.level)">{{ riskText(h.level) }}</span></div>
              <div class="meta"><span>{{ h.status }}</span><span>{{ h.created_at }}</span></div>
            </div>
          </template>

          <!-- 子页面：隐患上报 -->
          <template v-if="currentPage === 'hazard-report'">
            <div class="form-group">
              <div class="form-label">选择场所</div>
              <select class="form-select" v-model="hazardForm.place_id">
                <option :value="null">请选择</option>
                <option v-for="p in places" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <div class="form-label">隐患等级</div>
              <div style="padding:8px 16px;display:flex;gap:10px;">
                <label><input type="radio" v-model="hazardForm.level" value="red"> 红色(重大)</label>
                <label><input type="radio" v-model="hazardForm.level" value="yellow"> 黄色(一般)</label>
                <label><input type="radio" v-model="hazardForm.level" value="green"> 绿色</label>
              </div>
            </div>
            <div class="form-group">
              <div class="form-label">隐患类型</div>
              <input class="form-input" v-model="hazardForm.type" placeholder="如：通道堵塞/违规住人" />
            </div>
            <div class="form-group">
              <div class="form-label">隐患描述</div>
              <textarea class="form-textarea" v-model="hazardForm.description" placeholder="请详细描述隐患情况"></textarea>
            </div>
            <div style="padding:16px;">
              <button class="btn btn-primary btn-block" @click="submitHazard">提交隐患</button>
            </div>
          </template>

          <!-- 子页面：开始巡查 -->
          <template v-if="currentPage === 'inspection-start'">
            <div class="form-group">
              <div class="form-label">选择场所</div>
              <select class="form-select" v-model="inspectForm.place_id" @change="loadTemplate">
                <option :value="null">请选择</option>
                <option v-for="p in places" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group" v-if="inspectForm.place_id">
              <div class="form-label">巡查模板</div>
              <select class="form-select" v-model="inspectForm.template_type" @change="loadCheckItems">
                <option v-for="t in templateTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <template v-if="checkItems.length > 0">
              <div class="section-title">检查项（点击选择合格/不合格）</div>
              <div v-for="(item, idx) in checkItems" :key="idx" class="check-item">
                <span class="name">{{ item.name }}</span>
                <span class="result">
                  <span :class="{pass: item.pass === true}" @click="item.pass = true">合格</span>
                  <span :class="{fail: item.pass === false}" @click="item.pass = false">不合格</span>
                </span>
              </div>
              <div class="form-group" style="margin-top:10px;">
                <div class="form-label">备注</div>
                <textarea class="form-textarea" v-model="inspectForm.remark" placeholder="巡查备注（选填）"></textarea>
              </div>
              <div style="padding:16px;">
                <button class="btn btn-primary btn-block" @click="submitInspection">提交巡查记录</button>
              </div>
            </template>
          </template>

          <!-- 子页面：警情详情 -->
          <template v-if="currentPage === 'alarm-detail' && alarmDetail">
            <div class="card">
              <div style="font-size:16px;font-weight:600;color:#f56c6c;margin-bottom:10px;">🚨 {{ typeText(alarmDetail.type) }}</div>
              <div style="font-size:14px;line-height:2;">
                <div>场所：{{ alarmDetail.place_name }}</div>
                <div>地址：{{ alarmDetail.address }}</div>
                <div>设备：{{ alarmDetail.device_code }}</div>
                <div>烟雾值：{{ alarmDetail.smoke_value }}（阈值{{ alarmDetail.threshold }}）</div>
                <div>温度：{{ alarmDetail.temperature }}℃</div>
                <div>时间：{{ alarmDetail.alarm_time }}</div>
                <div>状态：<span class="tag" :class="statusTag(alarmDetail.status)">{{ statusText(alarmDetail.status) }}</span></div>
              </div>
            </div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:10px;" v-if="alarmDetail.status === 'pending'">
              <button class="btn btn-danger btn-block" @click="confirmAlarm(true)">🔥 确认真火情</button>
              <button class="btn btn-outline btn-block" @click="confirmAlarm(false)">误报</button>
            </div>
            <div style="padding:16px;" v-if="alarmDetail.status === 'confirmed'">
              <button class="btn btn-warning btn-block" @click="handleAlarm">已到达现场，开始处置</button>
            </div>
            <div style="padding:16px;" v-if="alarmDetail.status === 'handling'">
              <button class="btn btn-success btn-block" @click="resolveAlarm">完成处置</button>
            </div>
          </template>

          <!-- 子页面：设备列表 -->
          <template v-if="currentPage === 'devices'">
            <div v-for="d in deviceList" :key="d.id" class="list-item">
              <div class="title">{{ d.device_code }}<span class="tag" :class="deviceStatusTag(d.status)">{{ deviceStatusText(d.status) }}</span></div>
              <div class="desc">{{ d.place_name }}</div>
              <div class="meta"><span>电量{{ d.battery }}%</span><span>烟雾值{{ d.smoke_value }}</span></div>
            </div>
          </template>

          <!-- 子页面：消防地图 -->
          <template v-if="currentPage === 'map'">
            <div class="map-placeholder">
              <div v-for="(r, i) in resourceList" :key="r.id" class="map-dot" :class="r.type"
                :style="{left: (10 + (i*37)%80) + '%', top: (15 + (i*23)%70) + '%'}"></div>
              <div style="text-align:center;">
                <div style="font-size:40px;margin-bottom:8px;">🗺️</div>
                <div>消防资源分布图</div>
                <div style="font-size:12px;margin-top:4px;">🔵消火栓 🔴微型消防站</div>
              </div>
            </div>
            <div class="section-title">附近消防资源</div>
            <div v-for="r in resourceList" :key="r.id" class="list-item">
              <div class="title">{{ r.name }}<span class="tag" :class="r.type==='hydrant'?'tag-blue':'tag-red'">{{ r.type==='hydrant'?'消火栓':'微型消防站' }}</span></div>
              <div class="desc">{{ r.address }}</div>
              <div class="meta"><span>{{ r.contact }}</span><span>{{ r.status==='normal'?'正常':'故障' }}</span></div>
            </div>
          </template>

          <!-- 子页面：知识库 -->
          <template v-if="currentPage === 'knowledge'">
            <div v-for="k in knowledgeList" :key="k.id" class="list-item" @click="viewKnowledge(k.id)">
              <div class="title">{{ k.title }}<span class="tag tag-blue">{{ k.category }}</span></div>
              <div class="desc">{{ k.content.slice(0, 50) }}...</div>
            </div>
          </template>

          <!-- 子页面：知识详情 -->
          <template v-if="currentPage === 'knowledge-detail' && knowledgeDetail">
            <div class="card">
              <h3 style="margin-bottom:8px;">{{ knowledgeDetail.title }}</h3>
              <span class="tag tag-blue">{{ knowledgeDetail.category }}</span>
              <span style="font-size:12px;color:#999;margin-left:8px;">{{ knowledgeDetail.created_at }}</span>
            </div>
            <div class="knowledge-content">{{ knowledgeDetail.content }}</div>
          </template>

          <!-- 子页面：工单列表 -->
          <template v-if="currentPage === 'workorders' || currentPage === 'my-workorders'">
            <div v-for="w in workorderList" :key="w.id" class="list-item">
              <div class="title">{{ w.title }}<span class="tag" :class="woStatusTag(w.status)">{{ woStatusText(w.status) }}</span></div>
              <div class="desc">{{ w.description }}</div>
              <div class="meta"><span>{{ w.assignee_name || '未分配' }}</span><span>{{ w.deadline }}</span></div>
            </div>
            <div v-if="workorderList.length === 0" class="empty"><div class="icon">📋</div>暂无工单</div>
          </template>

          <!-- 子页面：我的巡查记录 -->
          <template v-if="currentPage === 'my-inspections'">
            <div v-for="ins in inspectionList" :key="ins.id" class="list-item">
              <div class="title">{{ ins.place_name }}<span class="tag" :class="ins.result==='pass'?'tag-green':'tag-red'">{{ ins.result==='pass'?'合格':'不合格' }}</span></div>
              <div class="desc">{{ ins.template_type }}</div>
              <div class="meta"><span>{{ ins.inspector_name }}</span><span>{{ ins.created_at }}</span></div>
            </div>
          </template>

          <!-- 子页面：修改密码 -->
          <template v-if="currentPage === 'password'">
            <div class="form-group">
              <div class="form-label">原密码</div>
              <input class="form-input" type="password" v-model="pwdForm.oldPassword" />
            </div>
            <div class="form-group">
              <div class="form-label">新密码</div>
              <input class="form-input" type="password" v-model="pwdForm.newPassword" placeholder="至少6位" />
            </div>
            <div style="padding:16px;"><button class="btn btn-primary btn-block" @click="changePassword">确认修改</button></div>
          </template>
        </div>

        <!-- 底部Tab -->
        <div class="tab-bar" v-if="pageStack.length === 0">
          <div class="tab-item" :class="{active: currentTab==='home'}" @click="switchTab('home')">
            <span class="icon">🏠</span><span>工作台</span>
          </div>
          <div class="tab-item" :class="{active: currentTab==='inspect'}" @click="switchTab('inspect')">
            <span class="icon">🔍</span><span>巡查</span>
          </div>
          <div class="tab-item" :class="{active: currentTab==='alarm'}" @click="switchTab('alarm')">
            <span class="icon">🚨</span><span>警情</span>
          </div>
          <div class="tab-item" :class="{active: currentTab==='me'}" @click="switchTab('me')">
            <span class="icon">👤</span><span>我的</span>
          </div>
        </div>
      </template>
    </div>
  `,
  setup() {
    const isLogin = ref(!!getToken());
    const user = ref(JSON.parse(localStorage.getItem('m_user') || '{}'));
    const loginForm = reactive({ username: '', password: '' });
    const logging = ref(false);

    const currentTab = ref('home');
    const pageStack = ref([]);
    const currentPage = computed(() => pageStack.value.length > 0 ? pageStack.value[pageStack.value.length - 1] : currentTab.value);

    const pageTitleMap = {
      home: '工作台', inspect: '场所巡查', alarm: '警情处置', me: '我的',
      places: '场所列表', 'place-detail': '场所详情', 'hazard-report': '隐患上报',
      'inspection-start': '开始巡查', 'alarm-detail': '警情详情', devices: '设备监控',
      map: '消防地图', knowledge: '消防知识', 'knowledge-detail': '知识详情',
      workorders: '工单列表', 'my-workorders': '我的工单', 'my-inspections': '巡查记录',
      password: '修改密码'
    };
    const pageTitle = computed(() => pageTitleMap[currentPage.value] || '');

    const today = new Date().toLocaleDateString('zh-CN');
    const roleMap = { admin: '管理员', grid_worker: '网格员', owner: '业主', operator: '运维人员', fire_department: '消防部门' };
    const roleText = computed(() => roleMap[user.value.role] || '');

    // 数据
    const stats = ref({});
    const recentAlarms = ref([]);
    const places = ref([]);
    const alarmList = ref([]);
    const deviceList = ref([]);
    const resourceList = ref([]);
    const knowledgeList = ref([]);
    const workorderList = ref([]);
    const inspectionList = ref([]);
    const placeDetail = ref(null);
    const alarmDetail = ref(null);
    const knowledgeDetail = ref(null);
    const placeSearch = ref('');
    const inspectSearch = ref('');
    const templateTypes = ['三小场所', '群租房', '自建房', '工厂企业', '公共场所'];
    const checkItems = ref([]);

    const hazardForm = reactive({ place_id: null, level: 'yellow', type: '', description: '' });
    const inspectForm = reactive({ place_id: null, template_type: '三小场所', remark: '' });
    const pwdForm = reactive({ oldPassword: '', newPassword: '' });

    // 工具方法
    function riskText(l) { return { red: '红色', yellow: '黄色', green: '绿色' }[l] || l; }
    function riskTag(l) { return { red: 'tag-red', yellow: 'tag-yellow', green: 'tag-green' }[l] || ''; }
    function typeText(t) { return { fire: '火警', fault: '故障', false_alarm: '误报', low_battery: '低电量', offline: '离线' }[t] || t; }
    function statusText(s) { return { pending: '待处理', confirmed: '已确认', handling: '处置中', resolved: '已处置', false_alarm: '误报' }[s] || s; }
    function statusTag(s) { return { pending: 'tag-red', confirmed: 'tag-yellow', handling: 'tag-blue', resolved: 'tag-green', false_alarm: 'tag-gray' }[s] || ''; }
    function deviceStatusText(s) { return { online: '在线', offline: '离线', alarm: '报警', fault: '故障', low_battery: '低电量' }[s] || s; }
    function deviceStatusTag(s) { return { online: 'tag-green', offline: 'tag-gray', alarm: 'tag-red', fault: 'tag-yellow', low_battery: 'tag-yellow' }[s] || ''; }
    function woStatusText(s) { return { pending: '待处理', assigned: '已派单', processing: '处理中', completed: '已完成', verified: '已验收' }[s] || s; }
    function woStatusTag(s) { return { pending: 'tag-gray', assigned: 'tag-yellow', processing: 'tag-blue', completed: 'tag-green', verified: 'tag-green' }[s] || ''; }

    // 登录
    async function doLogin() {
      if (!loginForm.username || !loginForm.password) { alert('请输入账号密码'); return; }
      logging.value = true;
      const res = await api('/auth/login', { method: 'POST', body: loginForm });
      logging.value = false;
      if (res.code === 0) {
        setToken(res.data.token);
        localStorage.setItem('m_user', JSON.stringify(res.data.user));
        user.value = res.data.user;
        isLogin.value = true;
        loadHome();
      } else {
        alert(res.message || '登录失败');
      }
    }

    function logout() {
      if (confirm('确定退出登录？')) { clearToken(); isLogin.value = false; }
    }

    // Tab切换
    function switchTab(tab) {
      currentTab.value = tab;
      pageStack.value = [];
      if (tab === 'inspect') loadPlaces();
      if (tab === 'alarm') loadAlarms();
    }

    // 页面导航
    function navigate(page) {
      pageStack.value.push(page);
      if (page === 'places' || page === 'hazard-report' || page === 'inspection-start') loadPlaces();
      if (page === 'alarms') loadAlarms();
      if (page === 'devices') loadDevices();
      if (page === 'map') loadResources();
      if (page === 'knowledge') loadKnowledge();
      if (page === 'workorders' || page === 'my-workorders') loadWorkorders();
      if (page === 'my-inspections') loadInspections();
    }

    function goBack() {
      pageStack.value.pop();
    }

    async function refresh() { loadHome(); }

    // 加载首页数据
    async function loadHome() {
      const [dashRes, alarmRes] = await Promise.all([
        api('/statistics/dashboard'),
        api('/alarms?pageSize=5')
      ]);
      if (dashRes.code === 0) {
        stats.value = {
          places: dashRes.data.place?.total || 0,
          alarms: dashRes.data.alarm?.pending || 0,
          hazards: dashRes.data.hazard?.pending || 0,
          devices: dashRes.data.device?.online || 0
        };
      }
      // 警情列表
      const aRes = await api('/alarms?pageSize=5');
      if (aRes.code === 0) recentAlarms.value = aRes.data.list;
    }

    async function loadPlaces() {
      const res = await api('/places?pageSize=100&keyword=' + (placeSearch.value || inspectSearch.value || ''));
      if (res.code === 0) places.value = res.data.list;
    }

    async function loadAlarms() {
      const res = await api('/alarms?pageSize=50');
      if (res.code === 0) alarmList.value = res.data.list;
    }

    async function loadDevices() {
      const res = await api('/devices?pageSize=100');
      if (res.code === 0) deviceList.value = res.data.list;
    }

    async function loadResources() {
      const res = await api('/resources');
      if (res.code === 0) resourceList.value = res.data;
    }

    async function loadKnowledge() {
      const res = await api('/knowledge?pageSize=50');
      if (res.code === 0) knowledgeList.value = res.data.list;
    }

    async function loadWorkorders() {
      const res = await api('/workorders?pageSize=50');
      if (res.code === 0) workorderList.value = res.data.list;
    }

    async function loadInspections() {
      const res = await api('/inspections?pageSize=50');
      if (res.code === 0) inspectionList.value = res.data.list;
    }

    async function viewPlace(id) {
      const res = await api('/places/' + id);
      if (res.code === 0) { placeDetail.value = res.data; navigate('place-detail'); }
    }

    async function viewAlarm(id) {
      const res = await api('/alarms/' + id);
      if (res.code === 0) { alarmDetail.value = res.data; navigate('alarm-detail'); }
    }

    async function viewKnowledge(id) {
      const res = await api('/knowledge/' + id);
      if (res.code === 0) { knowledgeDetail.value = res.data; navigate('knowledge-detail'); }
    }

    function startInspect(place) {
      inspectForm.place_id = place.id;
      inspectForm.template_type = place.type || '三小场所';
      if (!templateTypes.includes(inspectForm.template_type)) inspectForm.template_type = '三小场所';
      loadCheckItems();
      navigate('inspection-start');
    }

    function reportHazardForPlace(place) {
      hazardForm.place_id = place.id;
      navigate('hazard-report');
    }

    async function loadTemplate() {
      checkItems.value = [];
    }

    function loadCheckItems() {
      // 标准巡查模板：四大必查项
      const templates = {
        '三小场所': [
          { name: '用电用气安全（无乱拉电线、无违规用电）', pass: null },
          { name: '疏散通道畅通（无堵塞、无锁闭）', pass: null },
          { name: '烟感报警器正常（已安装且运行）', pass: null },
          { name: '灭火器等应急器材完好有效', pass: null },
          { name: '无违规住人现象', pass: null },
          { name: '电动自行车未违规入内充电', pass: null }
        ],
        '群租房': [
          { name: '疏散通道、安全出口畅通', pass: null },
          { name: '烟感报警器完好有效', pass: null },
          { name: '灭火器、应急照明配备齐全', pass: null },
          { name: '电气线路规范无私拉乱接', pass: null },
          { name: '无违规使用明火、大功率电器', pass: null },
          { name: '房间隔墙耐火等级符合要求', pass: null }
        ],
        '自建房': [
          { name: '用电用气安全', pass: null },
          { name: '疏散通道畅通', pass: null },
          { name: '烟感报警器正常', pass: null },
          { name: '应急器材完好', pass: null }
        ],
        '工厂企业': [
          { name: '消防设施器材完好有效', pass: null },
          { name: '疏散通道安全出口畅通', pass: null },
          { name: '用电用气规范', pass: null },
          { name: '消防安全制度落实', pass: null },
          { name: '员工消防培训到位', pass: null }
        ],
        '公共场所': [
          { name: '疏散通道安全出口畅通', pass: null },
          { name: '消防设施完好有效', pass: null },
          { name: '应急照明疏散指示正常', pass: null },
          { name: '用火用电规范', pass: null }
        ]
      };
      checkItems.value = (templates[inspectForm.template_type] || templates['三小场所']).map(i => ({ ...i }));
    }

    async function submitHazard() {
      if (!hazardForm.place_id) { alert('请选择场所'); return; }
      if (!hazardForm.description) { alert('请填写隐患描述'); return; }
      const res = await api('/hazards', { method: 'POST', body: hazardForm });
      if (res.code === 0) {
        alert('隐患上报成功');
        Object.assign(hazardForm, { place_id: null, level: 'yellow', type: '', description: '' });
        goBack();
      } else alert(res.message);
    }

    async function submitInspection() {
      if (checkItems.value.some(i => i.pass === null)) { alert('请完成所有检查项'); return; }
      const allPass = checkItems.value.every(i => i.pass === true);
      const res = await api('/inspections', {
        method: 'POST',
        body: {
          place_id: inspectForm.place_id,
          template_type: inspectForm.template_type,
          items: checkItems.value,
          result: allPass ? 'pass' : 'fail',
          remark: inspectForm.remark
        }
      });
      if (res.code === 0) {
        alert('巡查记录提交成功');
        inspectForm.remark = '';
        checkItems.value = [];
        pageStack.value = [];
        currentTab.value = 'home';
      } else alert(res.message);
    }

    async function confirmAlarm(isFire) {
      if (!isFire && !confirm('确认为误报？')) return;
      const res = await api('/alarms/' + alarmDetail.value.id + '/confirm', { method: 'PUT', body: { is_fire: isFire } });
      if (res.code === 0) {
        alert(isFire ? '已确认真火情，已通知相关人员' : '已标记为误报');
        viewAlarm(alarmDetail.value.id);
        loadHome();
      }
    }

    async function handleAlarm() {
      const res = await api('/alarms/' + alarmDetail.value.id + '/handle', { method: 'PUT' });
      if (res.code === 0) { alert('已确认到达现场'); viewAlarm(alarmDetail.value.id); }
    }

    async function resolveAlarm() {
      const result = prompt('请输入处置结果：');
      if (!result) return;
      const res = await api('/alarms/' + alarmDetail.value.id + '/resolve', { method: 'PUT', body: { result } });
      if (res.code === 0) { alert('处置完成'); viewAlarm(alarmDetail.value.id); loadHome(); }
    }

    async function changePassword() {
      if (!pwdForm.oldPassword || !pwdForm.newPassword) { alert('请填写完整'); return; }
      const res = await api('/auth/password', { method: 'PUT', body: pwdForm });
      if (res.code === 0) { alert('密码修改成功'); goBack(); }
      else alert(res.message);
    }

    onMounted(() => { if (isLogin.value) loadHome(); });

    return {
      isLogin, user, loginForm, logging, doLogin, logout,
      currentTab, pageStack, currentPage, pageTitle, today, roleText,
      stats, recentAlarms, places, alarmList, deviceList, resourceList, knowledgeList,
      workorderList, inspectionList, placeDetail, alarmDetail, knowledgeDetail,
      placeSearch, inspectSearch, templateTypes, checkItems,
      hazardForm, inspectForm, pwdForm,
      riskText, riskTag, typeText, statusText, statusTag, deviceStatusText, deviceStatusTag,
      woStatusText, woStatusTag,
      switchTab, navigate, goBack, refresh, loadPlaces, loadAlarms,
      viewPlace, viewAlarm, viewKnowledge, startInspect, reportHazardForPlace,
      loadCheckItems, submitHazard, submitInspection, confirmAlarm, handleAlarm, resolveAlarm,
      changePassword
    };
  }
};

createApp(App).mount('#app');
