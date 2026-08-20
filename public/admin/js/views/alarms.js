/**
 * 警情管理页面
 */
window.AlarmsPage = {
  template: `
    <div class="page-card">
      <div class="page-header"><h3>警情管理</h3></div>
      <div class="search-bar">
        <el-select v-model="query.status" placeholder="处理状态" clearable style="width:140px">
          <el-option label="待处理" value="pending" /><el-option label="已确认" value="confirmed" />
          <el-option label="处置中" value="handling" /><el-option label="已处置" value="resolved" />
          <el-option label="误报" value="false_alarm" />
        </el-select>
        <el-select v-model="query.type" placeholder="警情类型" clearable style="width:140px">
          <el-option label="火警" value="fire" /><el-option label="故障" value="fault" />
          <el-option label="低电量" value="low_battery" /><el-option label="离线" value="offline" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="地址/场所" style="width:200px" clearable @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="alarm_time" label="报警时间" width="160" />
        <el-table-column prop="place_name" label="场所" min-width="120" show-overflow-tooltip />
        <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="device_code" label="设备编号" width="130" />
        <el-table-column label="类型" width="90">
          <template #default="{row}">
            <el-tag size="small" :type="row.type==='fire'?'danger':row.type==='false_alarm'?'info':'warning'">{{typeText(row.type)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="smoke_value" label="烟雾值" width="80" />
        <el-table-column prop="temperature" label="温度" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{row}"><el-tag size="small" :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="handler_name" label="处置人" width="90" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="view(row)">详情</el-button>
            <template v-if="row.status==='pending'">
              <el-button link type="danger" size="small" @click="confirmAlarm(row, true)">确认真火</el-button>
              <el-button link type="info" size="small" @click="confirmAlarm(row, false)">标记误报</el-button>
            </template>
            <el-button v-if="row.status==='confirmed'" link type="warning" size="small" @click="handle(row)">到场处置</el-button>
            <el-button v-if="row.status==='handling'" link type="success" size="small" @click="resolve(row)">完成处置</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <el-dialog v-model="detailDialog" title="警情详情" width="550px">
        <el-descriptions v-if="detail" :column="2" border>
          <el-descriptions-item label="报警时间">{{detail.alarm_time}}</el-descriptions-item>
          <el-descriptions-item label="警情类型">{{typeText(detail.type)}}</el-descriptions-item>
          <el-descriptions-item label="场所">{{detail.place_name}}</el-descriptions-item>
          <el-descriptions-item label="设备编号">{{detail.device_code}}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{detail.address}}</el-descriptions-item>
          <el-descriptions-item label="烟雾值">{{detail.smoke_value}}</el-descriptions-item>
          <el-descriptions-item label="温度">{{detail.temperature}}℃</el-descriptions-item>
          <el-descriptions-item label="状态">{{statusText(detail.status)}}</el-descriptions-item>
          <el-descriptions-item label="确认人">{{detail.confirmer_name||'-'}}</el-descriptions-item>
          <el-descriptions-item label="处置人">{{detail.handler_name||'-'}}</el-descriptions-item>
          <el-descriptions-item label="到场时间">{{detail.handle_time||'-'}}</el-descriptions-item>
          <el-descriptions-item label="处置结果" :span="2">{{detail.handle_result||'暂无'}}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]); const total = ref(0); const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, status: '', type: '', keyword: '' });
    const detailDialog = ref(false); const detail = ref(null);

    function typeText(t) { return { fire: '火警', fault: '故障', false_alarm: '误报', low_battery: '低电量', offline: '离线' }[t]; }
    function statusText(s) { return { pending: '待处理', confirmed: '已确认', handling: '处置中', resolved: '已处置', false_alarm: '误报' }[s]; }
    function statusType(s) { return { pending: 'danger', confirmed: 'warning', handling: 'primary', resolved: 'success', false_alarm: 'info' }[s]; }

    async function loadData() {
      loading.value = true;
      const res = await api('/alarms?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    async function view(row) { const res = await api('/alarms/' + row.id); if (res.code === 0) { detail.value = res.data; detailDialog.value = true; } }
    function confirmAlarm(row, isFire) {
      ElementPlus.ElMessageBox.confirm(isFire ? '确认真实火情？将自动生成处置工单并通知相关人员' : '标记为误报？', '确认', { type: 'warning' }).then(async () => {
        const res = await api('/alarms/' + row.id + '/confirm', { method: 'PUT', body: { is_fire: isFire } });
        if (res.code === 0) { ElementPlus.ElMessage.success(res.message); loadData(); }
      }).catch(() => {});
    }
    async function handle(row) { await api('/alarms/' + row.id + '/handle', { method: 'PUT' }); ElementPlus.ElMessage.success('已确认到场'); loadData(); }
    function resolve(row) {
      ElementPlus.ElMessageBox.prompt('请输入处置结果', '完成处置', { confirmButtonText: '完成', cancelButtonText: '取消' }).then(async ({ value }) => {
        const res = await api('/alarms/' + row.id + '/resolve', { method: 'PUT', body: { result: value } });
        if (res.code === 0) { ElementPlus.ElMessage.success('处置完成'); loadData(); }
      }).catch(() => {});
    }
    onMounted(loadData);
    return { list, total, loading, query, detailDialog, detail, typeText, statusText, statusType, loadData, view, confirmAlarm, handle, resolve };
  }
};
