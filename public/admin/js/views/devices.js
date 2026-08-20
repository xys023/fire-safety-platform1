/**
 * 烟感设备管理页面
 */
window.DevicesPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>烟感设备管理</h3>
        <el-button type="primary" @click="openDialog()">绑定设备</el-button>
      </div>
      <div class="search-bar">
        <el-input v-model="query.keyword" placeholder="设备编号/场所名称" style="width:220px" clearable @keyup.enter="loadData" />
        <el-select v-model="query.status" placeholder="设备状态" clearable style="width:140px">
          <el-option label="在线" value="online" /><el-option label="离线" value="offline" />
          <el-option label="报警" value="alarm" /><el-option label="故障" value="fault" />
          <el-option label="低电量" value="low_battery" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="device_code" label="设备编号" width="140" />
        <el-table-column prop="place_name" label="安装场所" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{row}"><el-tag size="small" :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="battery" label="电量" width="80">
          <template #default="{row}">
            <el-progress :percentage="row.battery" :color="row.battery < 20 ? '#f56c6c' : '#67c23a'" :stroke-width="10" />
          </template>
        </el-table-column>
        <el-table-column prop="signal" label="信号" width="80">
          <template #default="{row}">{{'★'.repeat(row.signal)}}{{'☆'.repeat(5-row.signal)}}</template>
        </el-table-column>
        <el-table-column prop="temperature" label="温度(℃)" width="90" />
        <el-table-column prop="humidity" label="湿度(%)" width="90" />
        <el-table-column prop="smoke_value" label="烟雾值" width="90">
          <template #default="{row}">
            <span :style="{color: row.smoke_value >= row.threshold ? '#f56c6c' : '#333', fontWeight: row.smoke_value >= row.threshold ? 700 : 400}">{{row.smoke_value}}</span>
          </template>
        </el-table-column>
        <el-table-column prop="last_online_at" label="最后在线" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{row}">
            <el-button v-if="row.status==='alarm'" link type="warning" size="small" @click="silence(row)">远程消音</el-button>
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <el-dialog v-model="dialog" :title="form.id?'编辑设备':'绑定设备'" width="450px">
        <el-form :model="form" label-width="90px">
          <el-form-item label="设备编号"><el-input v-model="form.device_code" placeholder="如 YG-2024-0011" /></el-form-item>
          <el-form-item label="安装场所">
            <el-select v-model="form.place_id" filterable style="width:100%" clearable>
              <el-option v-for="p in places" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="报警阈值"><el-input-number v-model="form.threshold" :min="10" :max="100" style="width:100%" /></el-form-item>
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
    const query = reactive({ page: 1, pageSize: 10, keyword: '', status: '' });
    const dialog = ref(false); const places = ref([]);
    const form = reactive({ id: null, device_code: '', place_id: null, threshold: 50 });

    function statusText(s) { return { online: '在线', offline: '离线', alarm: '报警', fault: '故障', low_battery: '低电量' }[s]; }
    function statusType(s) { return { online: 'success', offline: 'info', alarm: 'danger', fault: 'warning', low_battery: 'warning' }[s]; }

    async function loadData() {
      loading.value = true;
      const res = await api('/devices?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    async function loadPlaces() {
      const res = await api('/places?pageSize=999');
      if (res.code === 0) places.value = res.data.list;
    }
    function openDialog(row) {
      if (row) Object.assign(form, row);
      else Object.assign(form, { id: null, device_code: '', place_id: null, threshold: 50 });
      dialog.value = true;
    }
    async function save() {
      if (!form.device_code) { ElementPlus.ElMessage.warning('请填写设备编号'); return; }
      const url = form.id ? '/devices/' + form.id : '/devices';
      const res = await api(url, { method: form.id ? 'PUT' : 'POST', body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('保存成功'); dialog.value = false; loadData(); }
      else ElementPlus.ElMessage.error(res.message);
    }
    async function silence(row) {
      const res = await api('/devices/' + row.id + '/silence', { method: 'POST' });
      if (res.code === 0) { ElementPlus.ElMessage.success('消音指令已发送'); loadData(); }
    }
    function del(row) {
      ElementPlus.ElMessageBox.confirm('确定删除该设备？', '提示', { type: 'warning' }).then(async () => {
        await api('/devices/' + row.id, { method: 'DELETE' });
        ElementPlus.ElMessage.success('删除成功'); loadData();
      }).catch(() => {});
    }
    onMounted(() => { loadData(); loadPlaces(); });
    return { list, total, loading, query, dialog, places, form, statusText, statusType, loadData, openDialog, save, silence, del };
  }
};
