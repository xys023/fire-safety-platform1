/**
 * 隐患管理页面
 */
window.HazardsPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>隐患管理（红黄绿三色闭环）</h3>
        <el-button type="primary" @click="openDialog()">上报隐患</el-button>
      </div>
      <div class="search-bar">
        <el-select v-model="query.level" placeholder="隐患等级" clearable style="width:130px">
          <el-option label="红色(重大)" value="red" /><el-option label="黄色(一般)" value="yellow" /><el-option label="绿色" value="green" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable style="width:130px">
          <el-option label="待整改" value="pending" /><el-option label="整改中" value="rectifying" />
          <el-option label="待复查" value="rectified" /><el-option label="已销号" value="verified" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="场所/描述" style="width:200px" clearable @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="place_name" label="场所" min-width="130" show-overflow-tooltip />
        <el-table-column prop="address" label="地址" min-width="160" show-overflow-tooltip />
        <el-table-column label="等级" width="100">
          <template #default="{row}"><el-tag size="small" :type="levelType(row.level)">{{levelText(row.level)}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="110" />
        <el-table-column prop="description" label="隐患描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{row}"><el-tag size="small" :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="deadline" label="整改期限" width="160" />
        <el-table-column prop="reporter_name" label="上报人" width="90" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="view(row)">详情</el-button>
            <el-button v-if="row.status==='rectified'" link type="success" size="small" @click="verify(row, true)">复查通过</el-button>
            <el-button v-if="row.status==='rectified'" link type="warning" size="small" @click="verify(row, false)">复查不通过</el-button>
            <el-button v-if="row.status==='pending'" link type="primary" size="small" @click="rectify(row)">整改</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <!-- 上报隐患 -->
      <el-dialog v-model="dialog" title="上报隐患" width="500px">
        <el-form :model="form" label-width="90px">
          <el-form-item label="场所">
            <el-select v-model="form.place_id" filterable style="width:100%">
              <el-option v-for="p in places" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="隐患等级">
            <el-radio-group v-model="form.level">
              <el-radio value="red">红色(重大)</el-radio><el-radio value="yellow">黄色(一般)</el-radio><el-radio value="green">绿色</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="隐患类型"><el-input v-model="form.type" placeholder="如：违规住人/通道堵塞/消防设施缺失" /></el-form-item>
          <el-form-item label="隐患描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog=false">取消</el-button>
          <el-button type="primary" @click="save">提交</el-button>
        </template>
      </el-dialog>

      <!-- 整改弹窗 -->
      <el-dialog v-model="rectifyDialog" title="提交整改" width="500px">
        <el-form label-width="90px">
          <el-form-item label="整改说明"><el-input v-model="rectifyNote" type="textarea" :rows="3" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="rectifyDialog=false">取消</el-button>
          <el-button type="primary" @click="submitRectify">提交整改</el-button>
        </template>
      </el-dialog>

      <!-- 详情 -->
      <el-dialog v-model="detailDialog" title="隐患详情" width="550px">
        <el-descriptions v-if="detail" :column="2" border>
          <el-descriptions-item label="场所">{{detail.place_name}}</el-descriptions-item>
          <el-descriptions-item label="等级"><el-tag size="small" :type="levelType(detail.level)">{{levelText(detail.level)}}</el-tag></el-descriptions-item>
          <el-descriptions-item label="类型">{{detail.type}}</el-descriptions-item>
          <el-descriptions-item label="状态">{{statusText(detail.status)}}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{detail.description}}</el-descriptions-item>
          <el-descriptions-item label="上报人">{{detail.reporter_name}}</el-descriptions-item>
          <el-descriptions-item label="上报时间">{{detail.created_at}}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{detail.deadline}}</el-descriptions-item>
          <el-descriptions-item label="复查人">{{detail.verifier_name||'-'}}</el-descriptions-item>
          <el-descriptions-item v-if="detail.rectify_note" label="整改说明" :span="2">{{detail.rectify_note}}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]); const total = ref(0); const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, level: '', status: '', keyword: '' });
    const dialog = ref(false); const places = ref([]);
    const form = reactive({ place_id: null, level: 'yellow', type: '', description: '' });
    const rectifyDialog = ref(false); const rectifyNote = ref(''); const currentId = ref(null);
    const detailDialog = ref(false); const detail = ref(null);

    function levelText(l) { return { red: '红色(重大)', yellow: '黄色(一般)', green: '绿色' }[l]; }
    function levelType(l) { return { red: 'danger', yellow: 'warning', green: 'success' }[l]; }
    function statusText(s) { return { pending: '待整改', rectifying: '整改中', rectified: '待复查', verified: '已销号', overdue: '逾期' }[s]; }
    function statusType(s) { return { pending: 'danger', rectifying: 'warning', rectified: 'primary', verified: 'success', overdue: 'info' }[s]; }

    async function loadData() {
      loading.value = true;
      const res = await api('/hazards?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    async function loadPlaces() { const res = await api('/places?pageSize=999'); if (res.code === 0) places.value = res.data.list; }
    function openDialog() { Object.assign(form, { place_id: null, level: 'yellow', type: '', description: '' }); dialog.value = true; }
    async function save() {
      if (!form.place_id) { ElementPlus.ElMessage.warning('请选择场所'); return; }
      const res = await api('/hazards', { method: 'POST', body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('上报成功'); dialog.value = false; loadData(); }
    }
    function rectify(row) { currentId.value = row.id; rectifyNote.value = ''; rectifyDialog.value = true; }
    async function submitRectify() {
      const res = await api('/hazards/' + currentId.value + '/rectify', { method: 'PUT', body: { rectify_note: rectifyNote.value } });
      if (res.code === 0) { ElementPlus.ElMessage.success('整改已提交'); rectifyDialog.value = false; loadData(); }
    }
    function verify(row, pass) {
      ElementPlus.ElMessageBox.confirm(pass ? '复查通过，隐患将销号' : '复查不通过，需重新整改', '确认', { type: 'warning' }).then(async () => {
        const res = await api('/hazards/' + row.id + '/verify', { method: 'PUT', body: { pass } });
        if (res.code === 0) { ElementPlus.ElMessage.success(res.message); loadData(); }
      }).catch(() => {});
    }
    async function view(row) { const res = await api('/hazards/' + row.id); if (res.code === 0) { detail.value = res.data; detailDialog.value = true; } }
    onMounted(() => { loadData(); loadPlaces(); });
    return { list, total, loading, query, dialog, places, form, rectifyDialog, rectifyNote, detailDialog, detail,
      levelText, levelType, statusText, statusType, loadData, openDialog, save, rectify, submitRectify, verify, view };
  }
};
