import { Router } from 'express';
import db from './db-enhanced';
import { getLogs, getErrorStats, getLogCount, cleanupOldLogs } from './logger';

const router = Router();

/**
 * 监控后台主页
 */
router.get('/monitor', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Meridian 监控后台</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-card h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
    .stat-card .value { font-size: 28px; font-weight: bold; color: #333; }
    .stat-card .value.success { color: #28a745; }
    .stat-card .value.error { color: #dc3545; }
    .stat-card .value.warning { color: #ffc107; }
    .filters { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .filter-group { display: flex; flex-direction: column; }
    .filter-group label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .filter-group input, .filter-group select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .table-container { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; font-size: 13px; color: #666; }
    td { font-size: 13px; }
    tr:hover { background: #f8f9fa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-error { background: #f8d7da; color: #721c24; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .pagination { display: flex; justify-content: center; gap: 10px; margin-top: 20px; }
    .pagination button { padding: 8px 16px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
    .pagination button.active { background: #007bff; color: white; border-color: #007bff; }
    .error-detail { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .error-detail:hover { white-space: normal; overflow: visible; }
    .tabs { display: flex; gap: 5px; margin-bottom: 20px; }
    .tab { padding: 10px 20px; background: white; border: none; border-radius: 4px; cursor: pointer; }
    .tab.active { background: #007bff; color: white; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Meridian API 网关监控后台</h1>
    
    <div class="tabs">
      <button class="tab active" onclick="showTab('logs')">请求日志</button>
      <button class="tab" onclick="showTab('errors')">错误统计</button>
      <button class="tab" onclick="showTab('keys')">Key 状态</button>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid" id="stats">
      <div class="stat-card">
        <h3>总请求数（24h）</h3>
        <div class="value" id="total-requests">...</div>
      </div>
      <div class="stat-card">
        <h3>成功率</h3>
        <div class="value success" id="success-rate">...</div>
      </div>
      <div class="stat-card">
        <h3>400 错误</h3>
        <div class="value error" id="error-400">...</div>
      </div>
      <div class="stat-card">
        <h3>429 错误</h3>
        <div class="value warning" id="error-429">...</div>
      </div>
      <div class="stat-card">
        <h3>平均延迟</h3>
        <div class="value" id="avg-latency">...</div>
      </div>
    </div>
    
    <!-- 日志筛选 -->
    <div id="logs-tab" class="tab-content active">
      <div class="filters">
        <div class="filters-grid">
          <div class="filter-group">
            <label>开始时间</label>
            <input type="datetime-local" id="start-time">
          </div>
          <div class="filter-group">
            <label>结束时间</label>
            <input type="datetime-local" id="end-time">
          </div>
          <div class="filter-group">
            <label>状态码</label>
            <select id="status-code">
              <option value="">全部</option>
              <option value="200">200 成功</option>
              <option value="400">400 请求错误</option>
              <option value="429">429 限流</option>
              <option value="500">500 服务器错误</option>
              <option value="502">502 网关错误</option>
              <option value="503">503 服务不可用</option>
            </select>
          </div>
          <div class="filter-group">
            <label>错误类型</label>
            <select id="error-type">
              <option value="">全部</option>
              <option value="upstream_error">上游错误</option>
              <option value="rate_limited">限流</option>
              <option value="invalid_request">请求无效</option>
              <option value="auth_error">认证错误</option>
            </select>
          </div>
          <div class="filter-group" style="display:flex; align-items:flex-end;">
            <button class="btn btn-primary" onclick="loadLogs()">查询</button>
          </div>
        </div>
      </div>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>请求ID</th>
              <th>Key</th>
              <th>方法</th>
              <th>路径</th>
              <th>模型</th>
              <th>状态</th>
              <th>延迟</th>
              <th>错误信息</th>
              <th>Token</th>
            </tr>
          </thead>
          <tbody id="logs-table">
            <tr><td colspan="10" style="text-align:center;">点击查询加载数据</td></tr>
          </tbody>
        </table>
      </div>
      
      <div class="pagination" id="pagination"></div>
    </div>
    
    <!-- 错误统计 -->
    <div id="errors-tab" class="tab-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>状态码</th>
              <th>错误类型</th>
              <th>次数</th>
              <th>占比</th>
              <th>最近错误</th>
            </tr>
          </thead>
          <tbody id="errors-table">
            <tr><td colspan="5" style="text-align:center;">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Key 状态 -->
    <div id="keys-tab" class="tab-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>状态</th>
              <th>权重</th>
              <th>失败次数</th>
              <th>最后使用</th>
            </tr>
          </thead>
          <tbody id="keys-table">
            <tr><td colspan="6" style="text-align:center;">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <script>
    let currentPage = 1;
    let totalPages = 1;
    
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tab + '-tab').classList.add('active');
      
      if (tab === 'errors') loadErrors();
      if (tab === 'keys') loadKeys();
    }
    
    function loadStats() {
      fetch('/api/monitor/stats')
        .then(r => r.json())
        .then(data => {
          document.getElementById('total-requests').textContent = data.total || 0;
          document.getElementById('success-rate').textContent = (data.success_rate || 0) + '%';
          document.getElementById('error-400').textContent = data.error_400 || 0;
          document.getElementById('error-429').textContent = data.error_429 || 0;
          document.getElementById('avg-latency').textContent = (data.avg_latency || 0) + 'ms';
        });
    }
    
    function loadLogs(page = 1) {
      currentPage = page;
      const params = new URLSearchParams();
      if (document.getElementById('start-time').value) params.append('start', document.getElementById('start-time').value);
      if (document.getElementById('end-time').value) params.append('end', document.getElementById('end-time').value);
      if (document.getElementById('status-code').value) params.append('status', document.getElementById('status-code').value);
      if (document.getElementById('error-type').value) params.append('error_type', document.getElementById('error-type').value);
      params.append('page', page);
      
      fetch('/api/monitor/logs?' + params)
        .then(r => r.json())
        .then(data => {
          const tbody = document.getElementById('logs-table');
          if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">暂无数据</td></tr>';
            return;
          }
          
          tbody.innerHTML = data.logs.map(log => {
            const statusClass = log.response_status === 200 ? 'badge-success' : 'badge-error';
            const errorMsg = log.error_message ? log.error_message.substring(0, 50) + '...' : '-';
            return \`
              <tr>
                <td>\${log.timestamp}</td>
                <td><code>\${log.request_id}</code></td>
                <td><code>\${log.api_key_mask || '-'}</code></td>
                <td>\${log.request_method}</td>
                <td>\${log.request_path}</td>
                <td>\${log.request_model || '-'}</td>
                <td><span class="badge \${statusClass}">\${log.response_status}</span></td>
                <td>\${log.response_latency_ms}ms</td>
                <td class="error-detail" title="\${log.error_message || ''}">\${errorMsg}</td>
                <td>\${log.total_tokens || 0}</td>
              </tr>
            \`;
          }).join('');
          
          totalPages = Math.ceil(data.total / 50);
          renderPagination();
        });
    }
    
    function loadErrors() {
      fetch('/api/monitor/errors')
        .then(r => r.json())
        .then(data => {
          const tbody = document.getElementById('errors-table');
          if (!data.errors || data.errors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">暂无错误数据</td></tr>';
            return;
          }
          const total = data.errors.reduce((sum, e) => sum + e.count, 0);
          tbody.innerHTML = data.errors.map(e => \`
            <tr>
              <td><span class="badge badge-error">\${e.status_code}</span></td>
              <td>\${e.error_type || '-'}</td>
              <td>\${e.count}</td>
              <td>\${((e.count / total) * 100).toFixed(1)}%</td>
              <td class="error-detail">\${e.error_message || '-'}</td>
            </tr>
          \`).join('');
        });
    }
    
    function loadKeys() {
      fetch('/api/monitor/keys')
        .then(r => r.json())
        .then(data => {
          const tbody = document.getElementById('keys-table');
          tbody.innerHTML = data.keys.map(k => \`
            <tr>
              <td>\${k.id}</td>
              <td>\${k.name}</td>
              <td><span class="badge \${k.enabled ? 'badge-success' : 'badge-error'}">\${k.enabled ? '启用' : '禁用'}</span></td>
              <td>\${k.weight}</td>
              <td>\${k.failure_count}</td>
              <td>\${k.last_used_at || '-'}</td>
            </tr>
          \`).join('');
        });
    }
    
    function renderPagination() {
      let html = \`
        <button onclick="loadLogs(\${currentPage - 1})" \${currentPage <= 1 ? 'disabled' : ''}>上一页</button>
        <span>第 \${currentPage} / \${totalPages} 页</span>
        <button onclick="loadLogs(\${currentPage + 1})" \${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
      \`;
      document.getElementById('pagination').innerHTML = html;
    }
    
    // 初始化
    loadStats();
    loadLogs();
  </script>
</body>
</html>
  `);
});

/**
 * API 路由
 */
router.get('/api/monitor/stats', (req, res) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM request_logs 
    WHERE timestamp >= datetime(?)
  `).get(yesterday.toISOString());
  
  const success = db.prepare(`
    SELECT COUNT(*) as count FROM request_logs 
    WHERE timestamp >= datetime(?) AND is_success = 1
  `).get(yesterday.toISOString());
  
  const error400 = db.prepare(`
    SELECT COUNT(*) as count FROM request_logs 
    WHERE timestamp >= datetime(?) AND response_status = 400
  `).get(yesterday.toISOString());
  
  const error429 = db.prepare(`
    SELECT COUNT(*) as count FROM request_logs 
    WHERE timestamp >= datetime(?) AND response_status = 429
  `).get(yesterday.toISOString());
  
  const latency = db.prepare(`
    SELECT AVG(response_latency_ms) as avg FROM request_logs 
    WHERE timestamp >= datetime(?) AND is_success = 1
  `).get(yesterday.toISOString());
  
  res.json({
    total: total?.count || 0,
    success: success?.count || 0,
    success_rate: total?.count > 0 ? Math.round((success?.count || 0) / total.count * 100) : 0,
    error_400: error400?.count || 0,
    error_429: error429?.count || 0,
    avg_latency: Math.round(latency?.avg || 0)
  });
});

router.get('/api/monitor/logs', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  
  const filter = {
    startTime: req.query.start as string,
    endTime: req.query.end as string,
    statusCode: req.query.status ? parseInt(req.query.status as string) : undefined,
    errorType: req.query.error_type as string,
    limit,
    offset
  };
  
  const logs = getLogs(filter);
  const total = getLogCount(filter);
  
  res.json({ logs, total, page, limit });
});

router.get('/api/monitor/errors', (req, res) => {
  const errors = getErrorStats();
  res.json({ errors });
});

router.get('/api/monitor/keys', (req, res) => {
  const keys = db.prepare('SELECT id, name, enabled, weight, failure_count, last_used_at FROM api_keys').all();
  res.json({ keys });
});

router.post('/api/monitor/cleanup', (req, res) => {
  cleanupOldLogs();
  res.json({ success: true });
});

export default router;
