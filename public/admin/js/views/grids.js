/**
 * 网格管理页面
 */
window.GridsPage = {
  template: `
    <div class="page-card">
      <div class="page-header">
        <h3>网格管理（街道-社区-网格）</h3>
        <el-button type="primary" @click="openDialog()">新增网格</el-button>
      </div>
      <el-table :data="treeData" border row-key="id" default-expand-all :tree-props="{children: 'children'}">
        <el-table-column prop="name" label="网格名称" min-width="200" />
        <el-table-column label="级别" width="120">
          <template #default="{row}">
            <el-tag size="small" :type="levelType(row.level)">{{levelText(row.level)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="leader" label="负责人" width="120" />
        <el-table-column prop="contact" label="联系电话" width="140" />
        <el-table-column label="操作" width="180">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="openDialog(null, row.id)">添加下级</el-button>
            <el-button link type="danger" size="small" @click="deleteGrid(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialog" :title="form.id ? '编辑网格' : '新增网格'" width="450px">
        <el-form :model="form" label-width="80px">
          <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="级别">
            <el-select v-model="form.level" style="width:100%">
              <el-option label="街道" value="street" />
              <el-option label="社区" value="community" />
              <el-option label="网格" value="grid" />
            </el-select>
          </el-form-item>
          <el-form-item label="上级网格">
            <el-select v-model="form.parent_id" style="width:100%" clearable>
              <el-option v-for="g in flatGrids" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="负责人"><el-input v-model="form.leader" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="form.contact" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog=false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const treeData = ref([]);
    const flatGrids = ref([]);
    const dialog = ref(false);
    const form = reactive({ id: null, name: '', level: 'grid', parent_id: null, leader: '', contact: '' });

    function levelText(l) { return { street: '街道', community: '社区', grid: '网格' }[l]; }
    function levelType(l) { return { street: 'danger', community: 'warning', grid: 'primary' }[l]; }

    async function loadData() {
      const res = await api('/grids/tree');
      if (res.code === 0) {
        treeData.value = res.data;
        // 扁平化用于上级选择
        const flat = [];
        function walk(nodes) { nodes.forEach(n => { flat.push({ id: n.id, name: n.name }); if (n.children) walk(n.children); }); }
        walk(res.data);
        flatGrids.value = flat;
      }
    }

    function openDialog(row, parentId) {
      if (row) Object.assign(form, { ...row });
      else Object.assign(form, { id: null, name: '', level: 'grid', parent_id: parentId || null, leader: '', contact: '' });
      dialog.value = true;
    }

    async function save() {
      if (!form.name) { ElementPlus.ElMessage.warning('请填写名称'); return; }
      const url = form.id ? '/grids/' + form.id : '/grids';
      const method = form.id ? 'PUT' : 'POST';
      const res = await api(url, { method, body: form });
      if (res.code === 0) { ElementPlus.ElMessage.success('保存成功'); dialog.value = false; loadData(); }
    }

    function deleteGrid(row) {
      ElementPlus.ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' }).then(async () => {
        const res = await api('/grids/' + row.id, { method: 'DELETE' });
        if (res.code === 0) { ElementPlus.ElMessage.success('删除成功'); loadData(); }
        else ElementPlus.ElMessage.error(res.message);
      }).catch(() => {});
    }

    onMounted(loadData);
    return { treeData, flatGrids, dialog, form, levelText, levelType, openDialog, save, deleteGrid };
  }
};
