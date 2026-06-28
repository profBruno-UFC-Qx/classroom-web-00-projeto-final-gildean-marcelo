

type EmployeeStatus = 'on-duty' | 'active' | 'inactive';

interface Employee {
  id:     string;
  name:   string;
  code:   string;    
  avatar: string;   
  role:   string;
  email:  string;
  phone:  string;
  status: EmployeeStatus;
}

interface TeamStats {
  total:    number;
  active:   number;   
  onDuty:   number;
  inactive: number;
}

interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  perPage:    number;
  totalPages: number;
}

/* ======================================================================
   PORT DO SERVIÇO
   Implementar esta interface para trocar mock ↔ API real.
   ====================================================================== */

interface EmployeeServicePort {
  getEmployees(page: number, perPage: number): Promise<PaginatedResult<Employee>>;
  getStats(): Promise<TeamStats>;
  searchEmployees(query: string, page: number, perPage: number): Promise<PaginatedResult<Employee>>;
  deleteEmployee(id: string): Promise<void>;
}

/* ======================================================================
   MOCK DATA  (24 funcionários → total=24, active=22, onDuty=8, inactive=2)
   ====================================================================== */

const MOCK_EMPLOYEES: readonly Employee[] = [
  // ── Os 4 primeiros mantêm os avatares originais do protótipo ──
  {
    id: '1', name: 'Sarah Jenkins', code: 'EMP-1042',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAb4s_8d7ln7u3qKbIpIuRN13WrPAGvUzFrw3SdRWB95cmFVtEzFaESytILOpRh-1eZIcbaWqQnBrZYICvvItSlYSW063yaRzrYjAv6eMZnqKkfr4ceN-HatgwXF5fm18L6Xq-oc733fCKdEb7OqyC8iFQizcrtDuMOcW62CbNVy7TEqi4uIpvgAWjmcOrEDs-a5VO49jNOh4-8d9IzQKkPj9ulFkUdt2u1KxlvJp8QzZujX7rj9mmUqQlwGYP-EGTwgbWTdKoYfCk',
    role: 'Store Manager',  email: 's.jenkins@dannys.com', phone: '555-0192', status: 'on-duty',
  },
  {
    id: '2', name: 'Marcus Thorne', code: 'EMP-1055',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtsalxSeLIv8udx7hPNBAty4y_VirKMlMhrAvJmQgQFbhb7RM2iz3yeM-oTS8aMqOY9z-rLCuSzxL-F3hCT9MOM_v0SEB3MtSM8rBO05RdGOFfbCzRX6NS_WGQ1BRhnfCUBIo88QVzMPmCeJMFd6mE9r26vIu0Rpf4u_6_3LoQLjwT1rAyZTFSefgroKqq3bSVcH4uMTKE2IMJ-oH0npxbzGiTDG5pZtpUEX5P3V0sgu7_YB6u0IkysGHRhls84aL2nX9reJgs7YI',
    role: 'Cashier Lead',   email: 'm.thorne@dannys.com',  phone: '555-0231', status: 'active',
  },
  {
    id: '3', name: 'Elena Rodriguez', code: 'EMP-1021',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrVFb0U_xMwIUA71xj71_-3L1jCDzTMUY-Ai6l66JtZUWI2VBFofSjbpUzikjCZK6dfv2quXxKTLMCNisQgtmHEomPnveHWokEvTQEM_vmahsWnPnMFXe9M9Ic7j2W5IKrf3t1SNVxqIlSFwUos31eTq0Q7VwBtp4OP6xCBaSaJqpoLf3i2HpXvW_WwWs-90pyiabGYQo64GG1uPIrogvG2gNVvXNKjVNvBYa-Ma_2d-Ic6G4nmTa4IQ8xPZIj2hwW3APnzsOQYYw',
    role: 'Head Baker',     email: 'e.rodriguez@dannys.com', phone: '555-0844', status: 'on-duty',
  },
  {
    id: '4', name: 'David Kim', code: 'EMP-1088',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZimU-AysU55vC0b_1a1_tX-QU9HVxjoSN6ktfP11cTbdopv8I0xfgc_RQna-N7AeH85Yl09yvbp0LmtLCJvYi-0k_WboKVdPZK7EA8s16rN4HiTVD4ZpmhN7lPY2X3eAh6WcRX78UhtrMmDpbsVTkVjHfvCEq0jnJoXe4dDgy5_3ViwW721HQ5mmigdVaVJ-GmzCc34QKAYGG1P-Dxs6_JK0r3sFy4tULmR8bT4tBD5H6g7l8jDHObUhuPimN4YYuzeLcVOQpasM',
    role: 'Produce Clerk',  email: 'd.kim@dannys.com',      phone: '555-0912', status: 'inactive',
  },
  // ── Demais funcionários com avatares via pravatar ──
  { id: '5',  name: 'Ana Costa',      code: 'EMP-1033', avatar: 'https://i.pravatar.cc/48?u=ana.costa.dannys',      role: 'Cashier',          email: 'a.costa@dannys.com',     phone: '555-0303', status: 'active'  },
  { id: '6',  name: 'Lucas Mendes',   code: 'EMP-1067', avatar: 'https://i.pravatar.cc/48?u=lucas.mendes.dannys',   role: 'Stock Clerk',      email: 'l.mendes@dannys.com',    phone: '555-0447', status: 'on-duty' },
  { id: '7',  name: 'Priya Sharma',   code: 'EMP-1091', avatar: 'https://i.pravatar.cc/48?u=priya.sharma.dannys',   role: 'Barista',          email: 'p.sharma@dannys.com',    phone: '555-0558', status: 'on-duty' },
  { id: '8',  name: 'Tom Nakamura',   code: 'EMP-1012', avatar: 'https://i.pravatar.cc/48?u=tom.nakamura.dannys',   role: 'Deli Specialist',  email: 't.nakamura@dannys.com',  phone: '555-0623', status: 'on-duty' },
  { id: '9',  name: 'Clara Walsh',    code: 'EMP-1099', avatar: 'https://i.pravatar.cc/48?u=clara.walsh.dannys',    role: 'Cashier',          email: 'c.walsh@dannys.com',     phone: '555-0711', status: 'active'  },
  { id: '10', name: 'James Obi',      code: 'EMP-1031', avatar: 'https://i.pravatar.cc/48?u=james.obi.dannys',      role: 'Security',         email: 'j.obi@dannys.com',       phone: '555-0832', status: 'active'  },
  { id: '11', name: 'Nina Pereira',   code: 'EMP-1074', avatar: 'https://i.pravatar.cc/48?u=nina.pereira.dannys',   role: 'Pastry Chef',      email: 'n.pereira@dannys.com',   phone: '555-0945', status: 'active'  },
  { id: '12', name: 'Carlos Vega',    code: 'EMP-1056', avatar: 'https://i.pravatar.cc/48?u=carlos.vega.dannys',    role: 'Meat Cutter',      email: 'c.vega@dannys.com',      phone: '555-0156', status: 'on-duty' },
  { id: '13', name: 'Sophie Lee',     code: 'EMP-1083', avatar: 'https://i.pravatar.cc/48?u=sophie.lee.dannys',     role: 'Floral Designer',  email: 's.lee@dannys.com',       phone: '555-0267', status: 'active'  },
  { id: '14', name: 'Omar Hassan',    code: 'EMP-1048', avatar: 'https://i.pravatar.cc/48?u=omar.hassan.dannys',    role: 'IT Support',       email: 'o.hassan@dannys.com',    phone: '555-0378', status: 'inactive'},
  { id: '15', name: 'Rita Almeida',   code: 'EMP-1065', avatar: 'https://i.pravatar.cc/48?u=rita.almeida.dannys',   role: 'Supervisor',       email: 'r.almeida@dannys.com',   phone: '555-0489', status: 'active'  },
  { id: '16', name: 'Ben Carter',     code: 'EMP-1027', avatar: 'https://i.pravatar.cc/48?u=ben.carter.dannys',     role: 'Cashier',          email: 'b.carter@dannys.com',    phone: '555-0590', status: 'active'  },
  { id: '17', name: 'Yuki Tanaka',    code: 'EMP-1076', avatar: 'https://i.pravatar.cc/48?u=yuki.tanaka.dannys',    role: 'Sushi Chef',       email: 'y.tanaka@dannys.com',    phone: '555-0601', status: 'on-duty' },
  { id: '18', name: 'Grace Owusu',    code: 'EMP-1039', avatar: 'https://i.pravatar.cc/48?u=grace.owusu.dannys',    role: 'Customer Service', email: 'g.owusu@dannys.com',     phone: '555-0712', status: 'active'  },
  { id: '19', name: 'Diego Rios',     code: 'EMP-1092', avatar: 'https://i.pravatar.cc/48?u=diego.rios.dannys',     role: 'Maintenance',      email: 'd.rios@dannys.com',      phone: '555-0823', status: 'active'  },
  { id: '20', name: 'Layla Ahmed',    code: 'EMP-1018', avatar: 'https://i.pravatar.cc/48?u=layla.ahmed.dannys',    role: 'Cashier',          email: 'l.ahmed@dannys.com',     phone: '555-0934', status: 'active'  },
  { id: '21', name: 'Finn Murphy',    code: 'EMP-1063', avatar: 'https://i.pravatar.cc/48?u=finn.murphy.dannys',    role: 'Stock Manager',    email: 'f.murphy@dannys.com',    phone: '555-0145', status: 'on-duty' },
  { id: '22', name: 'Amara Diallo',   code: 'EMP-1045', avatar: 'https://i.pravatar.cc/48?u=amara.diallo.dannys',   role: 'Cashier',          email: 'a.diallo@dannys.com',    phone: '555-0256', status: 'active'  },
  { id: '23', name: 'Chen Wei',       code: 'EMP-1081', avatar: 'https://i.pravatar.cc/48?u=chen.wei.dannys',       role: 'Prep Cook',        email: 'c.wei@dannys.com',       phone: '555-0367', status: 'active'  },
  { id: '24', name: 'Isabela Mota',   code: 'EMP-1097', avatar: 'https://i.pravatar.cc/48?u=isabela.mota.dannys',   role: 'Floor Lead',       email: 'i.mota@dannys.com',      phone: '555-0478', status: 'active'  },
  // on-duty: 1,3,6,7,8,12,17,21 = 8 ✓   inactive: 4,14 = 2 ✓   active: 14 ✓
];

/* ======================================================================
   IMPLEMENTAÇÃO MOCK
   ====================================================================== */

class MockEmployeeService implements EmployeeServicePort {
  private employees: Employee[] = [...MOCK_EMPLOYEES];

  async getEmployees(page = 1, perPage = 4): Promise<PaginatedResult<Employee>> {
    await this.delay(180);
    const start = (page - 1) * perPage;
    return {
      data:       this.employees.slice(start, start + perPage),
      total:      this.employees.length,
      page,
      perPage,
      totalPages: Math.ceil(this.employees.length / perPage),
    };
  }

  async getStats(): Promise<TeamStats> {
    await this.delay(100);
    const e = this.employees;
    return {
      total:    e.length,
      active:   e.filter(x => x.status !== 'inactive').length,
      onDuty:   e.filter(x => x.status === 'on-duty').length,
      inactive: e.filter(x => x.status === 'inactive').length,
    };
  }

  async searchEmployees(query: string, page = 1, perPage = 4): Promise<PaginatedResult<Employee>> {
    await this.delay(150);
    const q = query.toLowerCase();
    const filtered = this.employees.filter(e =>
      e.name.toLowerCase().includes(q)  ||
      e.role.toLowerCase().includes(q)  ||
      e.email.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q),
    );
    const start = (page - 1) * perPage;
    return {
      data:       filtered.slice(start, start + perPage),
      total:      filtered.length,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
    };
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.delay(200);
    const idx = this.employees.findIndex(e => e.id === id);
    if (idx !== -1) this.employees.splice(idx, 1);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/* ======================================================================
   IMPLEMENTAÇÃO REAL (descomente e configure quando o backend estiver pronto)
   ====================================================================== */

// class ApiEmployeeService implements EmployeeServicePort {
//   constructor(private readonly baseUrl: string) {}
//
//   async getEmployees(page: number, perPage: number) {
//     const r = await fetch(`${this.baseUrl}/employees?page=${page}&per_page=${perPage}`);
//     if (!r.ok) throw new Error(`getEmployees: ${r.status}`);
//     return r.json();
//   }
//
//   async getStats() {
//     const r = await fetch(`${this.baseUrl}/employees/stats`);
//     if (!r.ok) throw new Error(`getStats: ${r.status}`);
//     return r.json();
//   }
//
//   async searchEmployees(query: string, page: number, perPage: number) {
//     const p = new URLSearchParams({ q: query, page: String(page), per_page: String(perPage) });
//     const r = await fetch(`${this.baseUrl}/employees/search?${p}`);
//     if (!r.ok) throw new Error(`searchEmployees: ${r.status}`);
//     return r.json();
//   }
//
//   async deleteEmployee(id: string) {
//     const r = await fetch(`${this.baseUrl}/employees/${id}`, { method: 'DELETE' });
//     if (!r.ok) throw new Error(`deleteEmployee: ${r.status}`);
//   }
// }

/* ======================================================================
   ▼ SWAP HERE — troque a linha abaixo para usar a API real:
     const employeeService: EmployeeServicePort = new ApiEmployeeService('https://api.dannys.com');
   ====================================================================== */
const employeeService: EmployeeServicePort = new MockEmployeeService();

/* ======================================================================
   ESTADO DA APLICAÇÃO
   ====================================================================== */

interface AppState {
  currentPage:     number;
  perPage:         number;
  searchQuery:     string;
  totalEmployees:  number;
  totalPages:      number;
}

const state: AppState = {
  currentPage:    1,
  perPage:        4,
  searchQuery:    '',
  totalEmployees: 0,
  totalPages:     1,
};

/* ======================================================================
   HELPERS DE DOM
   ====================================================================== */

function el<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`[TeamManagement] Elemento não encontrado: ${selector}`);
  return found;
}

/* ======================================================================
   RENDER: STATUS BADGE
   ====================================================================== */

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  'on-duty':  'On Duty',
  'active':   'Active',
  'inactive': 'Inactive',
};

function badgeHTML(status: EmployeeStatus): string {
  return `<span class="badge badge--${status}">
    <span class="badge__dot" aria-hidden="true"></span>
    ${STATUS_LABELS[status]}
  </span>`;
}

/* ======================================================================
   RENDER: LINHA DE FUNCIONÁRIO
   ====================================================================== */

function employeeRowHTML(emp: Employee): string {
  const isInactive = emp.status === 'inactive';
  const fallback   = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ecefe7&color=191d18&size=48`;

  return `
    <div class="employee-row${isInactive ? ' employee-row--inactive' : ''}"
         data-employee-id="${emp.id}"
         role="row">

      <div class="employee-row__employee">
        <div class="employee-row__avatar${isInactive ? ' employee-row__avatar--dim' : ''}">
          <img src="${emp.avatar}"
               alt="${emp.name}"
               loading="lazy"
               onerror="this.onerror=null;this.src='${fallback}'">
        </div>
        <div class="employee-row__info">
          <span class="employee-row__name">${emp.name}</span>
          <span class="employee-row__code">${emp.code}</span>
        </div>
      </div>

      <div class="employee-row__role">${emp.role}</div>

      <div class="employee-row__contact">
        <span class="employee-row__email">${emp.email}</span>
        <span class="employee-row__phone">${emp.phone}</span>
      </div>

      <div class="employee-row__status">${badgeHTML(emp.status)}</div>

      <div class="employee-row__actions">
        <button class="action-btn action-btn--edit"
                data-action="edit"
                data-id="${emp.id}"
                aria-label="Editar ${emp.name}"
                title="Editar">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="action-btn action-btn--delete"
                data-action="delete"
                data-id="${emp.id}"
                aria-label="Remover ${emp.name}"
                title="Remover">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>`;
}

/* ======================================================================
   RENDER: PAGINAÇÃO
   ====================================================================== */

/** Gera lista de páginas com reticências quando necessário. */
function buildPageNumbers(current: number, total: number): (number | '...')[] {
  // Sem reticências quando há poucas páginas
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const WINDOW = 2; // páginas ao redor da atual
  const result: (number | '...')[] = [];
  let prev = 0;

  for (let i = 1; i <= total; i++) {
    const inWindow = i >= current - WINDOW && i <= current + WINDOW;
    if (i === 1 || i === total || inWindow) {
      if (prev && i - prev > 1) result.push('...');
      result.push(i);
      prev = i;
    }
  }
  return result;
}

function renderPagination(): void {
  const { currentPage, totalPages, totalEmployees, perPage } = state;
  const start = totalEmployees === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end   = Math.min(currentPage * perPage, totalEmployees);

  const pageBtns = buildPageNumbers(currentPage, totalPages)
    .map(p => {
      if (p === '...') {
        return `<span class="pagination__ellipsis" aria-hidden="true">…</span>`;
      }
      const active = p === currentPage;
      return `<button class="page-btn${active ? ' page-btn--active' : ''}"
        data-page="${p}"
        aria-label="Página ${p}"
        ${active ? 'aria-current="page" disabled' : ''}
      >${p}</button>`;
    })
    .join('');

  el<HTMLDivElement>('#pagination').innerHTML = `
    <span class="pagination__info">Showing ${start} to ${end} of ${totalEmployees} entries</span>
    <div class="pagination__controls">
      <button class="page-btn"
              data-page="${currentPage - 1}"
              aria-label="Página anterior"
              ${currentPage === 1 ? 'disabled' : ''}>
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      ${pageBtns}
      <button class="page-btn"
              data-page="${currentPage + 1}"
              aria-label="Próxima página"
              ${currentPage === totalPages ? 'disabled' : ''}>
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>`;
}

/* ======================================================================
   RENDER: MÉTRICAS
   ====================================================================== */

interface MetricConfig {
  icon:     string;
  label:    string;
  key:      keyof TeamStats;
  modifier: 'primary' | 'error';
}

const METRIC_CONFIGS: MetricConfig[] = [
  { icon: 'groups',       label: 'Total Employees', key: 'total',    modifier: 'primary' },
  { icon: 'check_circle', label: 'Active',          key: 'active',   modifier: 'primary' },
  { icon: 'storefront',   label: 'On Duty',         key: 'onDuty',   modifier: 'primary' },
  { icon: 'pause_circle', label: 'Inactive',        key: 'inactive', modifier: 'error'   },
];

function renderMetrics(stats: TeamStats): void {
  el<HTMLDivElement>('#metrics-grid').innerHTML = METRIC_CONFIGS.map(c => `
    <div class="metric-card">
      <div class="metric-card__header">
        <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${c.icon}</span>
        <span class="metric-card__label">${c.label}</span>
      </div>
      <span class="metric-card__value metric-card__value--${c.modifier}">${stats[c.key]}</span>
    </div>`).join('');
}

/* ======================================================================
   CARREGAMENTO DE FUNCIONÁRIOS
   ====================================================================== */

async function loadEmployees(): Promise<void> {
  const listEl = el<HTMLDivElement>('#employee-list');

  // Skeleton enquanto aguarda resposta
  listEl.innerHTML = Array.from({ length: state.perPage }, () =>
    '<div class="skeleton-row"></div>',
  ).join('');
  el<HTMLDivElement>('#pagination').innerHTML = '';

  try {
    const result = state.searchQuery
      ? await employeeService.searchEmployees(state.searchQuery, state.currentPage, state.perPage)
      : await employeeService.getEmployees(state.currentPage, state.perPage);

    state.totalEmployees = result.total;
    state.totalPages     = result.totalPages;

    listEl.innerHTML = result.data.length
      ? result.data.map(employeeRowHTML).join('')
      : '<div class="empty-state">Nenhum funcionário encontrado.</div>';

    renderPagination();
  } catch (err) {
    listEl.innerHTML = '<div class="empty-state empty-state--error">Falha ao carregar funcionários. Tente novamente.</div>';
    console.error('[TeamManagement] loadEmployees:', err);
  }
}

//HANDLERS DE EVENTOS 

/** Delegação de eventos na tabela (edit / delete). Vinculado uma única vez. */
function initTableActions(): void {
  el<HTMLDivElement>('#employee-list').addEventListener('click', async (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset as { action: string; id: string };

    if (action === 'edit') {
      // TODO: abrir modal/drawer de edição
      console.log('[TeamManagement] Editar funcionário id:', id);
    }

    if (action === 'delete') {
      if (!confirm('Tem certeza que deseja remover este funcionário?')) return;

      btn.disabled = true;
      try {
        await employeeService.deleteEmployee(id);

        // Retrocede uma página se a atual ficar vazia após a exclusão
        if (state.currentPage > 1 && state.totalEmployees % state.perPage === 1) {
          state.currentPage--;
        }

        // Atualiza tabela e métricas em paralelo
        const [, stats] = await Promise.all([
          loadEmployees(),
          employeeService.getStats(),
        ]);
        renderMetrics(stats);
      } catch (err) {
        console.error('[TeamManagement] deleteEmployee:', err);
        alert('Não foi possível remover o funcionário. Tente novamente.');
        btn.disabled = false;
      }
    }
  });
}

/** Delegação de eventos na paginação. Vinculado uma única vez. */
function initPagination(): void {
  el<HTMLDivElement>('#pagination').addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-page]');
    if (!btn || btn.disabled) return;

    const page = Number(btn.dataset.page);
    if (!page || page === state.currentPage || page < 1 || page > state.totalPages) return;

    state.currentPage = page;
    loadEmployees();
  });
}

/** Campo de busca com debounce de 300 ms. */
function initSearch(): void {
  const input = el<HTMLInputElement>('#search-input');
  let debounce: ReturnType<typeof setTimeout>;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.searchQuery = input.value.trim();
      state.currentPage = 1;
      loadEmployees();
    }, 300);
  });
}

/** Botão "Add Employee" — stub para modal/drawer futuro. */
function initAddEmployee(): void {
  el<HTMLButtonElement>('#btn-add-employee').addEventListener('click', () => {  
    window.location.href = "http://localhost:5173/src/pages/admin/employee-form.html";
  });
}

/** Botão "Filters" — stub para painel de filtros futuro. */
function initFilters(): void {
  el<HTMLButtonElement>('#btn-filters').addEventListener('click', () => {
    // TODO: abrir painel de filtros
    console.log('[TeamManagement] Abrir painel de filtros');
  });
}

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */

async function init(): Promise<void> {
  // Vincula todos os listeners uma única vez
  initTableActions();
  initPagination();
  initSearch();
  initAddEmployee();
  initFilters();

  // Carrega dados em paralelo
  const [, stats] = await Promise.all([
    loadEmployees(),
    employeeService.getStats(),
  ]);

  renderMetrics(stats);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => console.error('[TeamManagement] init:', err));
});
