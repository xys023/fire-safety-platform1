/**
 * 消防资源页面（消火栓、微型消防站）
 */
window.ResourcesPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>消防资源管理</h3>
        <el-button type="primary" @click="openDialog()">新增资源</el-button>
      </div>
      <div class="search-bar">
        <el-radio-group v-model="query.type" @change="loadData">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="hydrant">消火栓</el-radio-button>
          <el-radio-button value="mini_station">微型消防站</el-radio-button>
        </el-radio-group>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="类型" width="120">
          <template #default="{row}">
            <el-tag size="small" :type="row.type==='hydrant'?'primary':'success'">{{row.type==='hydrant'?'消火栓':'微型消防站'}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="lng" label="经度" width="100" />
        <el-table-column prop="lat" label="纬度" width="100" />
        <el-table-column prop="contact" label="联系电话" width="130" />
        <el-table-column label="状态" width="90">
          <template #default="{row}">
            <el-tag size="small" :type="row.status==='normal'?'success':'danger'">{{row.status==='normal'?'正常':'故障'}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialog" :title="form.id?'编辑资源':'新增资源'" width="500px">
        <el-form :model="form" label-width="90px">
          <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="类型">
            <el-radio-group v-model="form.type">
              <el-radio value="hydrant">消火栓</el-radio>
              <el-radio value="mini_station">微型消防站</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
          <el-row :gutter="10">
            <el-col :span="12"><el-form-item label="经度"><el-input v-model.number="form.lng" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="纬度"><el-input v-model.number="form.lat" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="联系电话"><el-input v-model="form.contact" /></el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="form.status" active-value="normal" inactive-value="fault" active-text="正常" inactive-text="故障" />
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
    const list = ref([]); const loading = ref(false);
    const query = reactive({ type: '' });
    const dialog = ref(false);
    const form = reactive({ id: null, name: '', type: 'hydrant', address: '', lng: null, lat: null, contact: '', status: 'normal' });

    async function loadData() {
      loading.value = true;
      const res = await api('/resources?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) list.value = res.data;
    }
    function openDialog(row) {
      if (row) Object.assign(form, row);
      else Object.assign(form, { id: null, name: '', type: 'hydrant', address: '', lng: null, lat: null, contact: '', status: 'normal' });
      dialog.value = true;
    }
    async function save() {
      if (!form.name) { ElementPlus.ElMessage.warning('请填写名称'); return; }
      const url = form.id ? '/resources/' + form.id : '/resources';
      const res = await api(url, { method: form.id ? 'PUT' : 'POST', body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('保存成功'); dialog.value = false; loadData(); }
    }
    function del(row) {
      ElementPlus.ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }).then(async () => {
        await api('/resources/' + row.id, { method: 'DELETE' });
        ElementPlus.ElMessage.success('删除成功'); loadData();
      }).catch(() => {});
    }
    onMounted(loadData);
    return { list, loading, query, dialog, form, loadData, openDialog, save, del };
  }
};
