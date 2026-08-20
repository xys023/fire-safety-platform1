/**
 * 数据大屏页面
 */
window.DashboardPage = {
  template: `
    <div class="dashboard">
      <div class="dash-header">
        <h2>智慧消防联防联控指挥大屏</h2>
        <p>{{ currentTime }} | 辖区消防安全态势实时监测</p>
      </div>

      <div class="stat-cards">
        <div class="stat-card"><div class="num">{{ stats.place?.total || 0 }}</div><div class="label">建档场所总数</div></div>
        <div class="stat-card green"><div class="num">{{ stats.device?.online || 0 }}<span style="font-size:14px">/{{ stats.device?.total || 0 }}</span></div><div class="label">设备在线/总数</div></div>
        <div class="stat-card red"><div class="num">{{ stats.alarm?.pending || 0 }}</div><div class="label">待处理警情</div></div>
        <div class="stat-card orange"><div class="num">{{ stats.hazard?.pending || 0 }}</div><div class="label">待整改隐患</div></div>
        <div class="stat-card purple"><div class="num">{{ stats.hazard?.rectifyRate || 0 }}%</div><div class="label">隐患整改率</div></div>
      </div>

      <div class="dash-row">
        <div class="dash-panel">
          <h3>场所风险等级分布</h3>
          <div ref="riskChart" class="chart-box"></div>
        </div>
        <div class="dash-panel">
          <h3>场所类型统计</h3>
          <div ref="typeChart" class="chart-box"></div>
        </div>
      </div>

      <div class="dash-row">
        <div class="dash-panel">
          <h3>近7天警情趋势</h3>
          <div ref="alarmTrendChart" class="chart-box"></div>
        </div>
        <div class="dash-panel">
          <h3>近7天巡查趋势</h3>
          <div ref="inspectionTrendChart" class="chart-box"></div>
        </div>
      </div>

      <div class="dash-row three">
        <div class="dash-panel">
          <h3>隐患等级分布</h3>
          <div ref="hazardLevelChart" class="chart-box"></div>
        </div>
        <div class="dash-panel">
          <h3>设备状态统计</h3>
          <div ref="deviceStatusChart" class="chart-box"></div>
        </div>
        <div class="dash-panel">
          <h3>网格隐患排名</h3>
          <div ref="gridRankChart" class="chart-box"></div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const stats = ref({});
    const riskChart = ref(null);
    const typeChart = ref(null);
    const alarmTrendChart = ref(null);
    const inspectionTrendChart = ref(null);
    const hazardLevelChart = ref(null);
    const deviceStatusChart = ref(null);
    const gridRankChart = ref(null);
    const currentTime = ref('');

    let charts = [];

    function updateTime() {
      const d = new Date();
      currentTime.value = d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    async function loadData() {
      const [dashRes, alarmRes, inspectRes, gridRes] = await Promise.all([
        api('/statistics/dashboard'),
        api('/statistics/alarm-trend'),
        api('/statistics/inspection-trend'),
        api('/statistics/grid-ranking')
      ]);
      if (dashRes.code === 0) {
        stats.value = dashRes.data;
        renderCharts(dashRes.data, alarmRes.data || [], inspectRes.data || [], gridRes.data || []);
      }
    }

    function renderCharts(data, alarmTrend, inspectTrend, gridRank) {
      // 销毁旧图表
      charts.forEach(c => c.dispose());
      charts = [];

      const darkTextColor = '#a0c4e8';
      const axisLineColor = 'rgba(255,255,255,0.1)';

      // 风险等级饼图
      const riskData = (data.place?.byRisk || []).map(r => ({
        name: { red: '红色(重大)', yellow: '黄色(一般)', green: '绿色(安全)' }[r.risk_level] || r.risk_level,
        value: r.count,
        itemStyle: { color: { red: '#f56c6c', yellow: '#e6a23c', green: '#67c23a' }[r.risk_level] }
      }));
      const c1 = echarts.init(riskChart.value);
      c1.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { color: darkTextColor } },
        series: [{ type: 'pie', radius: ['40%', '65%'], data: riskData, label: { color: darkTextColor } }]
      });
      charts.push(c1);

      // 场所类型柱状图
      const c2 = echarts.init(typeChart.value);
      c2.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: (data.place?.byType || []).map(t => t.type), axisLabel: { color: darkTextColor, rotate: 20 }, axisLine: { lineStyle: { color: axisLineColor } } },
        yAxis: { type: 'value', axisLabel: { color: darkTextColor }, splitLine: { lineStyle: { color: axisLineColor } } },
        series: [{ type: 'bar', data: (data.place?.byType || []).map(t => t.count), itemStyle: { color: '#409eff', borderRadius: [4,4,0,0] }, barWidth: 30 }]
      });
      charts.push(c2);

      // 警情趋势
      const c3 = echarts.init(alarmTrendChart.value);
      c3.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: alarmTrend.map(d => d.date.slice(5)), axisLabel: { color: darkTextColor }, axisLine: { lineStyle: { color: axisLineColor } } },
        yAxis: { type: 'value', axisLabel: { color: darkTextColor }, splitLine: { lineStyle: { color: axisLineColor } } },
        series: [{ type: 'line', data: alarmTrend.map(d => d.count), smooth: true, areaStyle: { color: 'rgba(245,108,108,0.2)' }, lineStyle: { color: '#f56c6c' }, itemStyle: { color: '#f56c6c' } }]
      });
      charts.push(c3);

      // 巡查趋势
      const c4 = echarts.init(inspectionTrendChart.value);
      c4.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: inspectTrend.map(d => d.date.slice(5)), axisLabel: { color: darkTextColor }, axisLine: { lineStyle: { color: axisLineColor } } },
        yAxis: { type: 'value', axisLabel: { color: darkTextColor }, splitLine: { lineStyle: { color: axisLineColor } } },
        series: [{ type: 'line', data: inspectTrend.map(d => d.count), smooth: true, areaStyle: { color: 'rgba(64,158,255,0.2)' }, lineStyle: { color: '#409eff' }, itemStyle: { color: '#409eff' } }]
      });
      charts.push(c4);

      // 隐患等级
      const hazardData = (data.hazard?.byLevel || []).map(h => ({
        name: { red: '红色', yellow: '黄色', green: '绿色' }[h.level] || h.level,
        value: h.count,
        itemStyle: { color: { red: '#f56c6c', yellow: '#e6a23c', green: '#67c23a' }[h.level] }
      }));
      const c5 = echarts.init(hazardLevelChart.value);
      c5.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { color: darkTextColor } },
        series: [{ type: 'pie', radius: '60%', data: hazardData, label: { color: darkTextColor } }]
      });
      charts.push(c5);

      // 设备状态
      const c6 = echarts.init(deviceStatusChart.value);
      c6.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { color: darkTextColor } },
        series: [{
          type: 'pie', radius: ['40%', '65%'],
          data: [
            { name: '在线', value: data.device?.online || 0, itemStyle: { color: '#67c23a' } },
            { name: '报警', value: data.device?.alarm || 0, itemStyle: { color: '#f56c6c' } },
            { name: '故障/离线/低电', value: data.device?.fault || 0, itemStyle: { color: '#e6a23c' } }
          ],
          label: { color: darkTextColor }
        }]
      });
      charts.push(c6);

      // 网格排名
      const c7 = echarts.init(gridRankChart.value);
      c7.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 80, right: 20, top: 10, bottom: 20 },
        xAxis: { type: 'value', axisLabel: { color: darkTextColor }, splitLine: { lineStyle: { color: axisLineColor } } },
        yAxis: { type: 'category', data: gridRank.map(g => g.name).reverse(), axisLabel: { color: darkTextColor }, axisLine: { lineStyle: { color: axisLineColor } } },
        series: [{ type: 'bar', data: gridRank.map(g => g.hazard_count).reverse(), itemStyle: { color: '#b37feb', borderRadius: [0,4,4,0] }, barWidth: 16 }]
      });
      charts.push(c7);
    }

    onMounted(() => {
      updateTime();
      setInterval(updateTime, 1000);
      loadData();
      setInterval(loadData, 30000); // 30秒刷新
      window.addEventListener('resize', () => charts.forEach(c => c.resize()));
    });

    return { stats, riskChart, typeChart, alarmTrendChart, inspectionTrendChart, hazardLevelChart, deviceStatusChart, gridRankChart, currentTime };
  }
};
