let token = localStorage.getItem('sigr_token') || '';
let user = JSON.parse(localStorage.getItem('sigr_user') || 'null');
let orderDraft = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.assign(e, attrs);
    for (const c of children) {
        if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(String(c)));
        else if (c) e.appendChild(c);
    }
    return e;
}

async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api' + path, { ...options, headers });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

/* ---------- Sesión ---------- */
$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    try {
        const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: $('#email').value, password: $('#password').value })
        });
        token = data.token; user = data.user;
        localStorage.setItem('sigr_token', token);
        localStorage.setItem('sigr_user', JSON.stringify(user));
        showApp();
    } catch (err) { $('#login-error').textContent = err.message; }
});

$('#logout').addEventListener('click', () => {
    token = ''; user = null;
    localStorage.removeItem('sigr_token'); localStorage.removeItem('sigr_user');
    $('#app-view').classList.add('hidden');
    $('#user-info').classList.add('hidden');
    $('#login-view').classList.remove('hidden');
});

function showApp() {
    $('#login-view').classList.add('hidden');
    $('#app-view').classList.remove('hidden');
    $('#user-info').classList.remove('hidden');
    $('#user-name').textContent = `${user.name} (${user.role})`;
    switchTab('menu');
}

/* ---------- Tabs ---------- */
async function switchTab(name) {
    $$('.tab').forEach(t => t.classList.add('hidden'));
    const tab = document.getElementById('tab-' + name);
    if (tab) tab.classList.remove('hidden');
    try {
        if (name === 'menu') await loadMenu();
        if (name === 'orders') await loadOrders();
        if (name === 'reservations') await loadReservations();
        if (name === 'cash') await loadCashStatus();
    } catch (e) { alert(e.message); }
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ---------- Menú ---------- */
async function loadMenu() {
    const [cats, dishes] = await Promise.all([api('/menu/categories'), api('/menu/dishes')]);

    const catList = $('#cat-list'); catList.innerHTML = '';
    cats.forEach(c => {
        const li = el('li', {}, c.name);
        if (user.role === 'admin') {
        const del = el('button', {}, 'Eliminar');
        del.onclick = async () => { await api(`/menu/categories/${c.id}`, { method: 'DELETE' }); loadMenu(); };
        li.appendChild(del);
        }
        catList.appendChild(li);
    });

    const catSelect = $('#dish-cat'); catSelect.innerHTML = '';
    cats.forEach(c => catSelect.appendChild(new Option(c.name, c.id)));

    const orderDish = $('#order-dish'); orderDish.innerHTML = '';
    dishes.filter(d => d.available).forEach(d =>
        orderDish.appendChild(new Option(`${d.name} ($${d.price})`, d.id))
    );

    const dishList = $('#dish-list'); dishList.innerHTML = '';
    dishes.forEach(d => {
        const li = el('li', {}, `${d.name} — $${d.price} [${d.category || 'Sin categoría'}]`);
        if (user.role === 'admin') {
        const del = el('button', {}, 'Eliminar');
        del.onclick = async () => { await api(`/menu/dishes/${d.id}`, { method: 'DELETE' }); loadMenu(); };
        li.appendChild(del);
        }
        dishList.appendChild(li);
    });
}

$('#add-cat').onclick = async () => {
    try {
        await api('/menu/categories', { method: 'POST', body: JSON.stringify({ name: $('#cat-name').value }) });
        $('#cat-name').value = ''; loadMenu();
    } catch (e) { alert(e.message); }
};

$('#add-dish').onclick = async () => {
    try {
        await api('/menu/dishes', {
        method: 'POST',
        body: JSON.stringify({
            name: $('#dish-name').value,
            price: Number($('#dish-price').value),
            category_id: Number($('#dish-cat').value)
        })
        });
        $('#dish-name').value = ''; $('#dish-price').value = ''; loadMenu();
    } catch (e) { alert(e.message); }
};

/* ---------- Pedidos ---------- */
function renderDraft() {
    const ul = $('#order-items-preview'); ul.innerHTML = '';
    orderDraft.forEach((it, idx) => {
        const li = el('li', {}, `${it.qty} × ${it.name} — $${it.subtotal}`);
        const del = el('button', {}, 'X');
        del.onclick = () => { orderDraft.splice(idx, 1); renderDraft(); };
        li.appendChild(del);
        ul.appendChild(li);
    });
}

$('#add-item').onclick = () => {
    const opt = $('#order-dish').selectedOptions[0];
    if (!opt) return alert('No hay platos disponibles');
    const qty = Number($('#order-qty').value);
    const price = Number((opt.textContent.match(/\$([\d.]+)/) || [])[1] || 0);
    orderDraft.push({
        dish_id: Number(opt.value),
        name: opt.textContent.split(' (')[0],
        qty,
        subtotal: +(price * qty).toFixed(2)
    });
    renderDraft();
};

$('#create-order').onclick = async () => {
    try {
        const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
            table_number: Number($('#order-table').value) || null,
            items: orderDraft.map(i => ({ dish_id: i.dish_id, quantity: i.qty }))
        })
        });
        orderDraft = []; renderDraft(); loadOrders();
        alert(`Pedido #${order.id} creado`);
    } catch (e) { alert(e.message); }
};

async function loadOrders() {
    const orders = await api('/orders');
    const ul = $('#order-list'); ul.innerHTML = '';
    orders.forEach(o => {
        const li = el('li', {}, `#${o.id} · Mesa ${o.table_number || '-'} · ${o.status} · $${o.total} · ${o.items.length} ítems`);
        if (o.status !== 'pagado' && o.status !== 'cancelado') {
        const next = { pendiente: 'en_preparacion', en_preparacion: 'listo', listo: 'entregado', entregado: 'pagado' }[o.status];
        if (next) {
            const b = el('button', {}, `→ ${next}`);
            b.onclick = async () => { await api(`/orders/${o.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); loadOrders(); };
            li.appendChild(b);
        }
        const pay = el('button', {}, 'Cobrar');
        pay.onclick = async () => {
            try { await api('/cash/pay', { method: 'POST', body: JSON.stringify({ order_id: o.id, method: 'efectivo' }) }); loadOrders(); }
            catch (e) { alert(e.message); }
        };
        li.appendChild(pay);
        }
        ul.appendChild(li);
    });
}

/* ---------- Reservas ---------- */
$('#create-res').onclick = async () => {
    try {
        await api('/reservations', {
        method: 'POST',
        body: JSON.stringify({
            customer_name: $('#res-name').value,
            phone: $('#res-phone').value,
            date: $('#res-date').value,
            time: $('#res-time').value,
            people: Number($('#res-people').value)
        })
        });
        loadReservations();
    } catch (e) { alert(e.message); }
};

async function loadReservations() {
    const list = await api('/reservations');
    const ul = $('#res-list'); ul.innerHTML = '';
    list.forEach(r => ul.appendChild(el('li', {}, `${r.date} ${r.time} · ${r.customer_name} (${r.people} pax) · ${r.status}`)));
}

/* ---------- Caja ---------- */
$('#open-cash').onclick = async () => {
    try { await api('/cash/open', { method: 'POST', body: JSON.stringify({ opening_amount: Number($('#opening-amount').value) }) }); loadCashStatus(); }
    catch (e) { alert(e.message); }
};
$('#close-cash').onclick = async () => {
    try { await api('/cash/close', { method: 'POST', body: JSON.stringify({ closing_amount: Number($('#closing-amount').value) }) }); loadCashStatus(); }
    catch (e) { alert(e.message); }
};
$('#load-report').onclick = loadReport;

async function loadCashStatus() {
    const cur = await api('/cash/current');
    $('#cash-status').textContent = cur
        ? `Caja abierta #${cur.session.id} · Ventas: $${cur.total_sales}`
        : 'No hay caja abierta';
    loadReport();
}

async function loadReport() {
    try {
        const r = await api('/cash/report/daily');
        $('#report').textContent = JSON.stringify(r, null, 2);
    } catch (e) { $('#report').textContent = e.message; }
}

/* ---------- Init ---------- */
if (token && user) showApp();