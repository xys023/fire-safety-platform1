/**
 * 巡查记录页面
 */
window.InspectionsPage = {
  template: `
    <div class="page-card">
      <div class="page-header"><h3>巡查记录</h3></div>
      <div class="search-bar">
        <el-select v-model="query.template_type" placeholder="巡查类型" clearable style="width:140px">
          <el-option v-for="t in templateTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="query.result" placeholder="检查结果" clearable style="width:120px">
          <el-option label="合格" value="pass" /><el-option label="不合格" value="fail" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="created_at" label="巡查时间" width="160" />
        <el-table-column prop="place_name" label="场所" min-width="140" show-overflow-tooltip />
        <el-table-column prop="template_type" label="巡查类型" width="110" />
        <el-table-column prop="inspector_name" label="巡查人" width="100" />
        <el-table-column label="结果" width="90">
          <template #default="{row}">
            <el-tag size="small" :type="row.result==='pass'?'success':'danger'">{{row.result==='pass'?'合格':'不合格'}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="100">
          <template #default="{row}"><el-button link type="primary" size="small" @click="view(row)">查看</el-button></template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <el-dialog v-model="detailDialog" title="巡查记录详情" width="600px">
        <el-descriptions v-if="detail" :column="2" border>
          <el-descriptions-item label="场所">{{detail.place_name}}</el-descriptions-item>
          <el-descriptions-item label="类型">{{detail.template_type}}</el-descriptions-item>
          <el-descriptions-item label="巡查人">{{detail.inspector_name}}</el-descriptions-item>
          <el-descriptions-item label="时间">{{detail.created_at}}</el-descriptions-item>
          <el-descriptions-item label="结果">
            <el-tag size="small" :type="detail.result==='pass'?'success':'danger'">{{detail.result==='pass'?'合格':'不合格'}}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{detail.remark||'-'}}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detail && detail.items_arr" style="margin-top:16px">
          <h4 style="margin-bottom:10px">检查项明细：</h4>
          <el-table :data="detail.items_arr" border size="small">
            <el-table-column prop="name" label="检查项" />
            <el-table-column label="结果" width="100">
              <template #default="{row}">
                <el-tag size="small" :type="row.pass?'success':'danger'">{{row.pass?'合格':'不合格'}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" show-overflow-tooltip />
          </el-table>
        </div>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]); const total = ref(0); const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, template_type: '', result: '' });
    const detailDialog = ref(false); const detail = ref(null);
    const templateTypes = ['三小场所', '群租房', '自建房', '工厂企业', '公共场所'];

    async function loadData() {
      loading.value = true;
      const res = await api('/inspections?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    async function view(row) {
      const res = await api('/inspections/' + row.id);
      if (res.code === 0) {
        detail.value = { ...res.data, items_arr: res.data.items ? JSON.parse(res.data.items) : [] };
        detailDialog.value = true;
      }
    }
    onMounted(loadData);
    return { list, total, loading, query, detailDialog, detail, templateTypes, loadData, view };
  }
};
