/**
 * 用户管理页面（管理员）
 */
window.UsersPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>用户管理</h3>
        <el-button type="primary" @click="openDialog()">新增用户</el-button>
      </div>
      <div class="search-bar">
        <el-select v-model="query.role" placeholder="角色" clearable style="width:140px">
          <el-option label="管理员" value="admin" /><el-option label="网格员" value="grid_worker" />
          <el-option label="业主" value="owner" /><el-option label="运维人员" value="operator" />
          <el-option label="消防部门" value="fire_department" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="姓名/账号/电话" style="width:200px" clearable @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column label="角色" width="110">
          <template #default="{row}"><el-tag size="small" :type="roleType(row.role)">{{roleText(row.role)}}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggleStatus(row)" active-text="启用" inactive-text="禁用" />
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="180">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="resetPwd(row)">重置密码</el-button>
            <el-button link type="danger" size="small" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <el-dialog v-model="dialog" :title="form.id?'编辑用户':'新增用户'" width="480px">
        <el-form :model="form" label-width="90px">
          <el-form-item label="账号"><el-input v-model="form.username" :disabled="!!form.id" /></el-form-item>
          <el-form-item label="密码" v-if="!form.id"><el-input v-model="form.password" type="password" show-password placeholder="至少6位" /></el-form-item>
          <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
          <el-form-item label="角色">
            <el-select v-model="form.role" style="width:100%">
              <el-option label="管理员" value="admin" /><el-option label="网格员" value="grid_worker" />
              <el-option label="业主" value="owner" /><el-option label="运维人员" value="operator" />
              <el-option label="消防部门" value="fire_department" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog=false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]); const total = ref(0); const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, role: '', keyword: '' });
    const dialog = ref(false);
    const form = reactive({ id: null, username: '', password: '', name: '', phone: '', role: 'grid_worker' });

    function roleText(r) { return { admin: '管理员', grid_worker: '网格员', owner: '业主', operator: '运维人员', fire_department: '消防部门' }[r]; }
    function roleType(r) { return { admin: 'danger', grid_worker: 'primary', owner: 'success', operator: 'warning', fire_department: 'info' }[r]; }

    async function loadData() {
      loading.value = true;
      const res = await api('/users?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    function openDialog(row) {
      if (row) Object.assign(form, { ...row, password: '' });
      else Object.assign(form, { id: null, username: '', password: '', name: '', phone: '', role: 'grid_worker' });
      dialog.value = true;
    }
    async function save() {
      if (!form.username || !form.name) { ElementPlus.ElMessage.warning('请填写完整'); return; }
      if (!form.id && (!form.password || form.password.length < 6)) { ElementPlus.ElMessage.warning('密码至少6位'); return; }
      const url = form.id ? '/users/' + form.id : '/users';
      const res = await api(url, { method: form.id ? 'PUT' : 'POST', body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('保存成功'); dialog.value = false; loadData(); }
      else ElementPlus.ElMessage.error(res.message);
    }
    async function toggleStatus(row) {
      const newStatus = row.status === 'active' ? 'disabled' : 'active';
      await api('/users/' + row.id, { method: 'PUT', body: { status: newStatus } });
      ElementPlus.ElMessage.success('状态已更新'); loadData();
    }
    function resetPwd(row) {
      ElementPlus.ElMessageBox.confirm('将密码重置为 123456？', '提示', { type: 'warning' }).then(async () => {
        await api('/users/' + row.id, { method: 'PUT', body: { password: '123456' } });
        ElementPlus.ElMessage.success('密码已重置为 123456');
      }).catch(() => {});
    }
    function del(row) {
      ElementPlus.ElMessageBox.confirm('确定删除该用户？', '提示', { type: 'warning' }).then(async () => {
        await api('/users/' + row.id, { method: 'DELETE' });
        ElementPlus.ElMessage.success('删除成功'); loadData();
      }).catch(() => {});
    }
    onMounted(loadData);
    return { list, total, loading, query, dialog, form, roleText, roleType, loadData, openDialog, save, toggleStatus, resetPwd, del };
  }
};
