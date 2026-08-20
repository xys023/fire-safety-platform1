/**
 * 消防知识库页面
 */
window.KnowledgePage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>消防知识库</h3>
        <el-button type="primary" @click="openDialog()">发布内容</el-button>
      </div>
      <div class="search-bar">
        <el-select v-model="query.category" placeholder="分类" clearable style="width:140px">
          <el-option label="整治动态" value="整治动态" /><el-option label="火灾案例" value="火灾案例" />
          <el-option label="防火安全" value="防火安全" /><el-option label="器材操作" value="器材操作" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="搜索标题" style="width:200px" clearable @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{row}"><el-tag size="small">{{row.category}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="170" />
        <el-table-column label="操作" width="180">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="view(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize" :current-page="query.page" @current-change="p=>{query.page=p;loadData()}" />
      </div>

      <el-dialog v-model="dialog" :title="form.id?'编辑内容':'发布内容'" width="600px">
        <el-form :model="form" label-width="80px">
          <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
          <el-form-item label="分类">
            <el-select v-model="form.category" style="width:100%">
              <el-option label="整治动态" value="整治动态" /><el-option label="火灾案例" value="火灾案例" />
              <el-option label="防火安全" value="防火安全" /><el-option label="器材操作" value="器材操作" />
            </el-select>
          </el-form-item>
          <el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="8" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog=false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="viewDialog" :title="detail.title" width="600px">
        <el-tag size="small">{{detail.category}}</el-tag>
        <span style="color:#999;font-size:12px;margin-left:10px">{{detail.created_at}}</span>
        <div style="margin-top:16px;line-height:1.8;color:#333;white-space:pre-wrap">{{detail.content}}</div>
      </el-dialog>
    </div>
  `,
  setup() {
    const list = ref([]); const total = ref(0); const loading = ref(false);
    const query = reactive({ page: 1, pageSize: 10, category: '', keyword: '' });
    const dialog = ref(false); const viewDialog = ref(false);
    const form = reactive({ id: null, title: '', category: '防火安全', content: '' });
    const detail = ref({});

    async function loadData() {
      loading.value = true;
      const res = await api('/knowledge?' + new URLSearchParams(Object.entries(query).filter(([k,v]) => v !== '')));
      loading.value = false;
      if (res.code === 0) { list.value = res.data.list; total.value = res.data.total; }
    }
    function openDialog(row) {
      if (row) Object.assign(form, row);
      else Object.assign(form, { id: null, title: '', category: '防火安全', content: '' });
      dialog.value = true;
    }
    async function save() {
      if (!form.title) { ElementPlus.ElMessage.warning('请填写标题'); return; }
      const url = form.id ? '/knowledge/' + form.id : '/knowledge';
      const res = await api(url, { method: form.id ? 'PUT' : 'POST', body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('保存成功'); dialog.value = false; loadData(); }
    }
    async function view(row) {
      const res = await api('/knowledge/' + row.id);
      if (res.code === 0) { detail.value = res.data; viewDialog.value = true; }
    }
    function del(row) {
      ElementPlus.ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }).then(async () => {
        await api('/knowledge/' + row.id, { method: 'DELETE' });
        ElementPlus.ElMessage.success('删除成功'); loadData();
      }).catch(() => {});
    }
    onMounted(loadData);
    return { list, total, loading, query, dialog, viewDialog, form, detail, loadData, openDialog, save, view, del };
  }
};
