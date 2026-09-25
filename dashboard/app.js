// A2A Dispute Sentinel // Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
  const casesData = window.CASES_DATA || [];
  let currentCase = casesData[0] || null;
  let activeCategory = 'all';
  let searchTerm = '';
  let simInterval = null;

  // Initialize Tabs
  initTabs();

  // Initialize Case Explorer
  initCaseExplorer();

  // Initialize Simulator
  initSimulator();

  // Initialize Architecture Node Interactions
  initArchitectureInteractions();

  /* -------------------------------------------------------------
     1. TABS SYSTEM
  ------------------------------------------------------------- */
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(targetTab);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  /* -------------------------------------------------------------
     2. CASE EXPLORER
  ------------------------------------------------------------- */
  function initCaseExplorer() {
    const searchInput = document.getElementById('case-search-input');
    const catFilters = document.querySelectorAll('.cat-pill');
    const simSelect = document.getElementById('sim-case-select');

    // Populate Simulator Select
    if (simSelect) {
      simSelect.innerHTML = casesData.map(c => 
        `<option value="${c.case_id}">${c.case_id} (${c.output.assessment.primary_issue})</option>`
      ).join('');
    }

    // Search event
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderCasesList();
    });

    // Category filter pills
    catFilters.forEach(pill => {
      pill.addEventListener('click', () => {
        catFilters.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.getAttribute('data-cat');
        renderCasesList();
      });
    });

    renderCasesList();
    if (currentCase) renderCaseDetail(currentCase);
  }

  function renderCasesList() {
    const container = document.getElementById('cases-list-container');
    if (!container) return;

    const filtered = casesData.filter(c => {
      const issue = c.output?.assessment?.primary_issue || '';
      const orderId = c.output?.entity_resolution?.resolved_order_ids?.[0] || '';
      const caseId = c.case_id.toLowerCase();

      const matchesCat = (activeCategory === 'all') || (issue === activeCategory);
      const matchesSearch = !searchTerm || 
        caseId.includes(searchTerm) || 
        orderId.toLowerCase().includes(searchTerm) || 
        issue.toLowerCase().includes(searchTerm);

      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Không tìm thấy ca nào phù hợp.</div>`;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const issue = c.output.assessment.primary_issue;
      const refund = c.output.financial_resolution.recommended_refund_brl;
      const isActive = currentCase && currentCase.case_id === c.case_id;

      return `
        <div class="case-item ${isActive ? 'active' : ''}" data-id="${c.case_id}">
          <div>
            <div class="case-item-id">${c.case_id}</div>
            <div class="case-item-topic">${formatTopic(issue)}</div>
          </div>
          <div class="case-item-refund">
            ${refund > 0 ? `${refund.toFixed(1)} BRL` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0 BRL</span>`}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.case-item').forEach(item => {
      item.addEventListener('click', () => {
        const cid = item.getAttribute('data-id');
        const selected = casesData.find(c => c.case_id === cid);
        if (selected) {
          currentCase = selected;
          container.querySelectorAll('.case-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          renderCaseDetail(selected);
        }
      });
    });
  }

  function renderCaseDetail(c) {
    const pane = document.getElementById('case-detail-pane');
    if (!pane) return;

    const out = c.output;
    const inp = c.input;
    const assess = out.assessment;
    const fin = out.financial_resolution;
    const entity = out.entity_resolution;
    const ship = out.shipment_analysis;
    const pay = out.payment_analysis;
    const rootCauses = out.root_cause_analysis?.responsible_parties || [];

    const statusBadgeClass = assess.case_status === 'action_required' ? 'badge-warning' : 
                            (assess.case_status === 'no_action' ? 'badge-success' : 'badge-info');

    pane.innerHTML = `
      <div class="case-header-bar">
        <div class="case-title-group">
          <h2>
            <span>${c.case_id}</span>
            <span class="badge ${statusBadgeClass}">${assess.case_status}</span>
            <span class="badge badge-info" style="font-size: 0.75rem;">Conf: ${(assess.confidence * 100).toFixed(0)}%</span>
          </h2>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.35rem;">
            Order ID Thẩm Quyền: <strong style="color: #ffffff; font-family: var(--font-mono);">${entity.resolved_order_ids?.[0] || 'N/A'}</strong>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Tiền Hoàn Kiến Nghị</div>
          <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; color: var(--accent-amber);">
            ${fin.recommended_refund_brl.toFixed(2)} <span style="font-size: 1rem; color: #ffffff;">BRL</span>
          </div>
        </div>
      </div>

      <!-- Customer Message & Claims -->
      <div class="detail-card" style="background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.2);">
        <div class="detail-card-title" style="color: var(--accent-indigo);">
          <span>💬</span> Yêu Cầu Khách Hàng (Customer Request)
        </div>
        <p style="font-size: 0.88rem; color: #e2e8f0; line-height: 1.5; font-style: italic;">
          "${inp.customer_request?.message || 'Không có mô tả chi tiết'}"
        </p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem;">
          ${(inp.customer_request?.claims || []).map(cl => 
            `<span class="glass-pill" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; color: var(--accent-cyan);">
              📌 Claim [${cl.claim_id}]: ${formatTopic(cl.topic)}
            </span>`
          ).join('')}
        </div>
      </div>

      <!-- Detail Grid -->
      <div class="detail-grid">
        <!-- Card 1: Policy Resolution -->
        <div class="detail-card">
          <div class="detail-card-title">
            <span>⚖️</span> Phán Quyết Trọng Tài (Policy Engine)
          </div>
          <div class="data-row">
            <span class="data-label">Lỗi Vi Phạm Cốt Lõi:</span>
            <span class="data-val" style="color: var(--accent-amber); font-weight: 700;">${assess.primary_issue}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Hành Động Khuyến Nghị:</span>
            <span class="data-val" style="color: var(--accent-emerald);">${out.resolution_actions?.join(', ') || 'document_no_action'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Bên Chịu Trách Nhiệm:</span>
            <span class="data-val" style="color: var(--accent-rose); font-weight: 600;">
              ${rootCauses.map(p => p.party_type + (p.party_id ? ` (${p.party_id})` : '')).join(', ')}
            </span>
          </div>
          <div class="data-row">
            <span class="data-label">Quy Tắc Đối Soát:</span>
            <span class="data-val">EC_POLICY_V2</span>
          </div>
        </div>

        <!-- Card 2: Entity Disambiguation -->
        <div class="detail-card">
          <div class="detail-card-title">
            <span>👑</span> Phân Giải Thực Thể (Coordinator)
          </div>
          <div class="data-row">
            <span class="data-label">Trạng Thái:</span>
            <span class="data-val" style="color: var(--accent-emerald); font-weight: 600;">${entity.status.toUpperCase()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Candidate Thật (32-hex):</span>
            <span class="data-val">${entity.resolved_order_ids?.[0] || 'N/A'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Candidate Loại Trừ:</span>
            <span class="data-val" style="color: var(--accent-rose);">${entity.rejected_candidates?.join(', ') || 'None'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Độ Tin Cậy:</span>
            <span class="data-val">${(entity.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <!-- Card 3: Shipment Specialist Findings -->
        <div class="detail-card">
          <div class="detail-card-title">
            <span>🚚</span> Thẩm Tra Vận Chuyển (Shipment Agent)
          </div>
          <div class="data-row">
            <span class="data-label">Kết Luận Vận Chuyển:</span>
            <span class="data-val" style="color: ${ship.verdict.includes('delay') ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 700;">
              ${ship.verdict.toUpperCase()}
            </span>
          </div>
          <div class="data-row">
            <span class="data-label">Seller Chậm Hạn (Late IDs):</span>
            <span class="data-val">${ship.late_seller_ids?.length ? ship.late_seller_ids.join(', ') : 'None'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Timeline Đầy Đủ:</span>
            <span class="data-val">${ship.timeline_complete ? 'Hoàn tất (True)' : 'Khuyết (False)'}</span>
          </div>
        </div>

        <!-- Card 4: Payment Specialist Findings -->
        <div class="detail-card">
          <div class="detail-card-title">
            <span>💳</span> Đối Soát Dòng Tiền (Payment Agent)
          </div>
          <div class="data-row">
            <span class="data-label">Kết Luận Thanh Toán:</span>
            <span class="data-val" style="color: var(--accent-cyan); font-weight: 600;">${pay.verdict.toUpperCase()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Tổng Thu (Captured):</span>
            <span class="data-val">${pay.captured_total_brl?.toFixed(2) || '0.00'} BRL</span>
          </div>
          <div class="data-row">
            <span class="data-label">Đã Hoàn (Refunded):</span>
            <span class="data-val">${pay.refunded_total_brl?.toFixed(2) || '0.00'} BRL</span>
          </div>
          <div class="data-row">
            <span class="data-label">Khả Hoàn Tối Đa:</span>
            <span class="data-val" style="color: var(--accent-emerald); font-weight: 700;">${pay.refundable_total_brl?.toFixed(2) || '0.00'} BRL</span>
          </div>
        </div>
      </div>

      <!-- Authoritative Evidence Refs Section -->
      <div class="detail-card">
        <div class="detail-card-title">
          <span>🔒</span> Danh Sách Bằng Chứng Có Thẩm Quyền (MCP Evidence Audit Trail)
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">
          Mỗi mã dưới đây đại diện cho một bản ghi độc lập đã được xác thực mã hóa tại MCP Evidence Gateway:
        </p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem;">
          ${(out.evidence_refs || []).map(ref => 
            `<span class="tool-chip" style="padding: 0.3rem 0.6rem; font-size: 0.78rem;">
              🔑 ${ref}
            </span>`
          ).join('')}
        </div>
      </div>
    `;
  }

  function formatTopic(t) {
    if (!t) return 'N/A';
    return t.replace(/_/g, ' ').toUpperCase();
  }

  /* -------------------------------------------------------------
     3. LIVE SIMULATOR
  ------------------------------------------------------------- */
  function initSimulator() {
    const btnRun = document.getElementById('btn-run-sim');
    const select = document.getElementById('sim-case-select');
    const terminal = document.getElementById('terminal-body');
    const counter = document.getElementById('sim-event-counter');

    if (!btnRun || !select) return;

    btnRun.addEventListener('click', () => {
      const cid = select.value;
      const targetCase = casesData.find(c => c.case_id === cid);
      if (!targetCase) return;

      if (simInterval) clearInterval(simInterval);

      // Reset Timeline Steps
      for (let i = 1; i <= 6; i++) {
        const stepEl = document.getElementById(`sim-step-${i}`);
        if (stepEl) {
          stepEl.classList.remove('active', 'completed');
        }
      }

      terminal.innerHTML = `
        <div class="log-entry" style="color: var(--accent-cyan); font-weight: 600;">
          [Simulation Started] Bắt đầu giải lập luồng phối hợp đa tác tử cho ca: ${cid}...
        </div>
      `;

      const traceEvents = targetCase.trace || [];
      counter.innerText = `${traceEvents.length} events total`;
      let index = 0;

      simInterval = setInterval(() => {
        if (index >= traceEvents.length) {
          clearInterval(simInterval);
          terminal.innerHTML += `
            <div class="log-entry" style="color: var(--accent-emerald); font-weight: bold; margin-top: 0.5rem;">
              [Simulation Finished] ✅ Ca ${cid} đã hoàn tất kiểm tra thẩm định, lưu output hợp lệ.
            </div>
          `;
          terminal.scrollTop = terminal.scrollHeight;
          return;
        }

        const ev = traceEvents[index];
        renderSimEvent(ev, terminal);
        updateSimTimeline(ev.event_type);
        index++;
      }, 350);
    });
  }

  function renderSimEvent(ev, terminal) {
    const timeStr = ev.occurred_at ? ev.occurred_at.split('T')[1].replace('Z', '') : 'now';
    let detailStr = '';
    
    if (ev.event_type === 'tool_result_consumed') {
      detailStr = `Tool <code>${ev.tool_name}</code> consumed. Ref: <strong>${ev.evidence_refs?.[0] || 'N/A'}</strong>`;
    } else if (ev.event_type === 'handoff') {
      detailStr = `Handoff to <strong>${ev.target || 'specialist'}</strong> (${ev.decision_code || 'route'})`;
    } else if (ev.event_type === 'policy_decided') {
      detailStr = `Verdict: <strong>${ev.decision_code}</strong>, Refund: ${ev.attributes?.recommended_refund_brl} BRL`;
    } else if (ev.event_type === 'verification_completed') {
      detailStr = `All invariants passed. Confidence: ${(ev.attributes?.confidence * 100).toFixed(0)}%`;
    } else {
      detailStr = `Code: ${ev.decision_code || 'OK'}`;
    }

    const logRow = document.createElement('div');
    logRow.className = 'log-entry';
    logRow.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-actor">[${ev.actor || 'system'}]</span>
      <span class="log-event">${ev.event_type}:</span>
      <span class="log-details">${detailStr}</span>
    `;

    terminal.appendChild(logRow);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function updateSimTimeline(eventType) {
    const stepMap = {
      'case_received': 1,
      'task_assigned': 2,
      'tool_result_consumed': 3,
      'handoff': 4,
      'policy_decided': 5,
      'verification_completed': 6,
      'case_finalized': 6
    };

    const stepNum = stepMap[eventType];
    if (stepNum) {
      for (let i = 1; i < stepNum; i++) {
        const prev = document.getElementById(`sim-step-${i}`);
        if (prev) {
          prev.classList.remove('active');
          prev.classList.add('completed');
        }
      }
      const cur = document.getElementById(`sim-step-${stepNum}`);
      if (cur) cur.classList.add('active');
    }
  }

  /* -------------------------------------------------------------
     4. ARCHITECTURE INTERACTION
  ------------------------------------------------------------- */
  function initArchitectureInteractions() {
    const svgNodes = document.querySelectorAll('.agent-node');
    const drawerCards = document.querySelectorAll('.agent-card-mini');

    svgNodes.forEach(node => {
      node.addEventListener('click', () => {
        const agentKey = node.getAttribute('data-agent');
        highlightAgentCard(agentKey);
      });
    });

    drawerCards.forEach(card => {
      card.addEventListener('click', () => {
        const agentKey = card.getAttribute('data-agent-target');
        highlightAgentCard(agentKey);
      });
    });
  }

  function highlightAgentCard(agentKey) {
    const drawerCards = document.querySelectorAll('.agent-card-mini');
    drawerCards.forEach(c => {
      if (c.getAttribute('data-agent-target') === agentKey) {
        c.classList.add('active');
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        c.classList.remove('active');
      }
    });
  }

});
