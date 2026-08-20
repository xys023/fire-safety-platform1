/**
 * 工单管理页面
 */
window.WorkordersPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>工单管理</h3>
        <el-button type="primary" @click="openDialog()">创建工单</el-button>
      </div>
      <div class="search-bar">
        <el-select v-model="query.type" placeholder="工单类型" clearable style="width:140px">
          <el-option label="隐患整改" value="hazard_rectify" /><el-option label="设备维修" value="device_repair" />
          <el-option label="警情处置" value="alarm_handle" /><el-option label="巡查任务" value="inspection" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable style="width:120px">
          <el-option label="待处理" value="pending" /><el-option label="已派单" value="assigned" />
          <el-option label="处理中" value="processing" /><el-option label="已完成" value="completed" /><el-option label="已验收" value="verified" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="优先级" width="90">
          <template #default="{row}"><el-tag size="small" :type="priorityType(row.priority)">{{priorityText(row.priority)}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{row}">{{typeText(row.type)}}</template>
        </el-table-column>
        <el-table-column prop="assignee_name" label="负责人" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{row}"><el-tag size="small" :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="deadline" label="期限" width="160" />
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{row}">
            <el-button v-if="row.status==='pending'" link type="primary" size="small" @click="assign(row)">派单</el-button>
            <el-button v-if="row.status==='assigned'" link type="warning" size="small" @click="start(row)">开始处理</el-button>
            <el-button v-if="row.status==='processing'" link type="success" size="small" @click="complete(row)">完成</el-button>
            <el-button v-if="row.status==='completed'" link type="info" size="small" @click="verify(row)">验收</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <!-- 创建工单 -->
      <el-dialog v-model="dialog" title="创建工单" width="500px">
        <el-form :model="form" label-width="80px">
          <el-form-item label="类型">
            <el-select v-model="form.type" style="width:100%">
              <el-option label="隐患整改" value="hazard_rectify" /><el-option label="设备维修" value="device_repair" />
              <el-option label="巡查任务" value="inspection" />
            </el-select>
          </el-form-item>
          <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
          <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="form.priority" style="width:100%">
              <el-option label="紧急" value="urgent" /><el-option label="高" value="high" />
              <el-option label="普通" value="normal" /><el-option label="低" value="low" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog=false">取消</el-button>
          <el-button type="primary" @click="save">创建</el-button>
        </template>
      </el-dialog>

      <!-- 派单弹窗 -->
      <el-dialog v-model="assignDialog" title="派单" width="400px">
        <el-form label-width="80px">
          <el-form-item label="负责人">
            <el-select v-model="assignUserId" filterable style="width:100%">
              <el-option v-for="u in users" :key="u.id" :label="u.name + ' (' + roleText(u.role) + ')'" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="assignDialog=false">取消</el-button>
          <el-button type="primary" @click="submitAssign">确定派单</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]); const total = ref(0); const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, type: '', status: '' });
    const dialog = ref(false);
    const form = reactive({ type: 'hazard_rectify', title: '', description: '', priority: 'normal' });
    const assignDialog = ref(false); const assignUserId = ref(null); const currentId = ref(null);
    const users = ref([]);

    function typeText(t) { return { hazard_rectify: '隐患整改', device_repair: '设备维修', alarm_handle: '警情处置', inspection: '巡查任务' }[t]; }
    function statusText(s) { return { pending: '待处理', assigned: '已派单', processing: '处理中', completed: '已完成', verified: '已验收' }[s]; }
    function statusType(s) { return { pending: 'info', assigned: 'warning', processing: 'primary', completed: 'success', verified: 'success' }[s]; }
    function priorityText(p) { return { urgent: '紧急', high: '高', normal: '普通', low: '低' }[p]; }
    function priorityType(p) { return { urgent: 'danger', high: 'warning', normal: 'primary', low: 'info' }[p]; }
    function roleText(r) { return { admin: '管理员', grid_worker: '网格员', owner: '业主', operator: '运维', fire_department: '消防' }[r]; }

    async function loadData() {
      loading.value = true;
      const res = await api('/workorders?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    async function loadUsers() { const res = await api('/users?pageSize=999'); if (res.code === 0) users.value = res.data.list; }
    function openDialog() { Object.assign(form, { type: 'hazard_rectify', title: '', description: '', priority: 'normal' }); dialog.value = true; }
    async function save() {
      if (!form.title) { ElementPlus.ElMessage.warning('请填写标题'); return; }
      const res = await api('/workorders', { method: 'POST', body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('创建成功'); dialog.value = false; loadData(); }
    }
    function assign(row) { currentId.value = row.id; assignUserId.value = null; assignDialog.value = true; }
    async function submitAssign() {
      if (!assignUserId.value) { ElementPlus.ElMessage.warning('请选择负责人'); return; }
      const res = await api('/workorders/' + currentId.value + '/assign', { method: 'PUT', body: { assignee_id: assignUserId.value } });
      if (res.code === 0) { ElementPlus.ElMessage.success('派单成功'); assignDialog.value = false; loadData(); }
    }
    async function start(row) { await api('/workorders/' + row.id + '/start', { method: 'PUT' }); ElementPlus.ElMessage.success('已开始处理'); loadData(); }
    function complete(row) {
      ElementPlus.ElMessageBox.prompt('请输入处理结果', '完成工单', { inputType: 'textarea' }).then(async ({ value }) => {
        await api('/workorders/' + row.id + '/complete', { method: 'PUT', body: { result: value } });
        ElementPlus.ElMessage.success('工单已完成'); loadData();
      }).catch(() => {});
    }
    async function verify(row) { await api('/workorders/' + row.id + '/verify', { method: 'PUT' }); ElementPlus.ElMessage.success('验收通过'); loadData(); }

    onMounted(() => { loadData(); loadUsers(); });
    return { list, total, loading, query, dialog, form, assignDialog, assignUserId, users,
      typeText, statusText, statusType, priorityText, priorityType, roleText,
      loadData, openDialog, save, assign, submitAssign, start, complete, verify };
  }
};
