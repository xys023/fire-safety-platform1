/**
 * 场所管理页面
 */
window.PlacesPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>场所管理</h3>
        <el-button type="primary" @click="openDialog()">新增场所</el-button>
      </div>
      <div class="search-bar">
        <el-input v-model="query.keyword" placeholder="搜索场所名称/地址/业主" style="width:240px" clearable @keyup.enter="loadData" />
        <el-select v-model="query.type" placeholder="场所类型" clearable style="width:140px">
          <el-option v-for="t in placeTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="query.risk_level" placeholder="风险等级" clearable style="width:120px">
          <el-option label="红色(重大)" value="red" />
          <el-option label="黄色(一般)" value="yellow" />
          <el-option label="绿色(安全)" value="green" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="场所名称" min-width="140" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="owner_name" label="业主" width="90" />
        <el-table-column prop="owner_phone" label="联系电话" width="120" />
        <el-table-column prop="area" label="面积(㎡)" width="90" />
        <el-table-column label="风险等级" width="100">
          <template #default="{row}">
            <el-tag :type="riskTagType(row.risk_level)" size="small">{{ riskText(row.risk_level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="device_count" label="烟感数" width="80" align="center" />
        <el-table-column prop="hazard_count" label="未整改隐患" width="100" align="center">
          <template #default="{row}">
            <el-badge :value="row.hazard_count" :hidden="row.hazard_count===0" type="danger">
              <span style="color:#999">{{ row.hazard_count }}</span>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deletePlace(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="pageChange" />
      </div>

      <!-- 新增/编辑弹窗 -->
      <el-dialog v-model="dialog" :title="form.id ? '编辑场所' : '新增场所'" width="600px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="场所名称"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="场所类型">
            <el-select v-model="form.type" style="width:100%">
              <el-option v-for="t in placeTypes" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="详细地址"><el-input v-model="form.address" /></el-form-item>
          <el-row :gutter="10">
            <el-col :span="12"><el-form-item label="面积(㎡)"><el-input-number v-model="form.area" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="从业人员"><el-input-number v-model="form.employee_count" :min="0" style="width:100%" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="10">
            <el-col :span="12"><el-form-item label="业主姓名"><el-input v-model="form.owner_name" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="业主电话"><el-input v-model="form.owner_phone" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="10">
            <el-col :span="12"><el-form-item label="经度"><el-input v-model.number="form.lng" placeholder="如116.404" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="纬度"><el-input v-model.number="form.lat" placeholder="如39.915" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="消防设施">
            <el-checkbox-group v-model="form.fire_facilities_arr">
              <el-checkbox label="灭火器" /><el-checkbox label="消火栓" /><el-checkbox label="烟感" /><el-checkbox label="喷淋" /><el-checkbox label="应急灯" /><el-checkbox label="疏散指示" />
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="风险等级">
            <el-radio-group v-model="form.risk_level">
              <el-radio value="green">绿色(安全)</el-radio>
              <el-radio value="yellow">黄色(一般)</el-radio>
              <el-radio value="red">红色(重大)</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog=false">取消</el-button>
          <el-button type="primary" @click="savePlace">保存</el-button>
        </template>
      </el-dialog>

      <!-- 详情弹窗 -->
      <el-dialog v-model="detailDialog" title="场所详情" width="700px">
        <el-descriptions v-if="detail" :column="2" border>
          <el-descriptions-item label="场所名称">{{detail.name}}</el-descriptions-item>
          <el-descriptions-item label="类型">{{detail.type}}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{detail.address}}</el-descriptions-item>
          <el-descriptions-item label="业主">{{detail.owner_name}}</el-descriptions-item>
          <el-descriptions-item label="电话">{{detail.owner_phone}}</el-descriptions-item>
          <el-descriptions-item label="面积">{{detail.area}} ㎡</el-descriptions-item>
          <el-descriptions-item label="从业人员">{{detail.employee_count}}人</el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="riskTagType(detail.risk_level)">{{riskText(detail.risk_level)}}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="消防设施">{{(detail.fire_facilities_arr||[]).join('、')}}</el-descriptions-item>
        </el-descriptions>
        <el-tabs style="margin-top:16px">
          <el-tab-pane label="烟感设备">
            <el-table :data="detail.devices" size="small" border>
              <el-table-column prop="device_code" label="设备编号" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{row}"><el-tag size="small" :type="deviceStatusType(row.status)">{{deviceStatusText(row.status)}}</el-tag></template>
              </el-table-column>
              <el-table-column prop="battery" label="电量" width="80" />
              <el-table-column prop="signal" label="信号" width="80" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="隐患记录">
            <el-table :data="detail.hazards" size="small" border>
              <el-table-column prop="description" label="隐患描述" show-overflow-tooltip />
              <el-table-column prop="level" label="等级" width="80"><template #default="{row}"><el-tag size="small" :type="riskTagType(row.level)">{{riskText(row.level)}}</el-tag></template></el-table-column>
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column prop="created_at" label="上报时间" width="160" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]);
    const total = ref(0);
    const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, keyword: '', type: '', risk_level: '' });
    const dialog = ref(false);
    const detailDialog = ref(false);
    const detail = ref(null);
    const placeTypes = ['三小场所', '出租屋', '自建房', '群租房', '工厂企业', '公共场所'];
    const form = reactive({ id: null, name: '', type: '', address: '', area: 0, employee_count: 0, owner_name: '', owner_phone: '', lng: null, lat: null, fire_facilities_arr: [], risk_level: 'green' });

    function riskText(l) { return { red: '红色(重大)', yellow: '黄色(一般)', green: '绿色(安全)' }[l] || l; }
    function riskTagType(l) { return { red: 'danger', yellow: 'warning', green: 'success' }[l] || ''; }
    function deviceStatusText(s) { return { online: '在线', offline: '离线', alarm: '报警', fault: '故障', low_battery: '低电量' }[s] || s; }
    function deviceStatusType(s) { return { online: 'success', offline: 'info', alarm: 'danger', fault: 'warning', low_battery: 'warning' }[s] || ''; }

    async function loadData() {
      loading.value = true;
      const res = await api('/places?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    function pageChange(p) { query.page = p; loadData(); }
    function resetQuery() { Object.assign(query, { page: 1, keyword: '', type: '', risk_level: '' }); loadData(); }

    function openDialog(row) {
      if (row) {
        Object.assign(form, { ...row, fire_facilities_arr: row.fire_facilities ? JSON.parse(row.fire_facilities) : [] });
      } else {
        Object.assign(form, { id: null, name: '', type: '', address: '', area: 0, employee_count: 0, owner_name: '', owner_phone: '', lng: null, lat: null, fire_facilities_arr: [], risk_level: 'green' });
      }
      dialog.value = true;
    }

    async function savePlace() {
      if (!form.name || !form.type || !form.address) { ElementPlus.ElMessage.warning('请填写必填项'); return; }
      const body = { ...form, fire_facilities: form.fire_facilities_arr };
      const url = form.id ? '/places/' + form.id : '/places';
      const method = form.id ? 'PUT' : 'POST';
      const res = await api(url, { method, body });
      if (res.code === 0) { ElementPlus.ElMessage.success('保存成功'); dialog.value = false; loadData(); }
      else ElementPlus.ElMessage.error(res.message);
    }

    async function viewDetail(row) {
      const res = await api('/places/' + row.id);
      if (res.code === 0) {
        detail.value = { ...res.data, fire_facilities_arr: res.data.fire_facilities ? JSON.parse(res.data.fire_facilities) : [] };
        detailDialog.value = true;
      }
    }

    function deletePlace(row) {
      ElementPlus.ElMessageBox.confirm('确定删除该场所吗？', '提示', { type: 'warning' }).then(async () => {
        const res = await api('/places/' + row.id, { method: 'DELETE' });
        if (res.code === 0) { ElementPlus.ElMessage.success('删除成功'); loadData(); }
      }).catch(() => {});
    }

    onMounted(loadData);
    return { list, total, loading, query, dialog, detailDialog, detail, form, placeTypes,
      riskText, riskTagType, deviceStatusText, deviceStatusType,
      loadData, pageChange, resetQuery, openDialog, savePlace, viewDetail, deletePlace };
  }
};
