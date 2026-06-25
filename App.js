import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = {
  income:  ['Зарплата', 'Фриланс', 'Инвестиции', 'Подарок', 'Другое'],
  expense: ['Еда', 'Транспорт', 'Жильё', 'Развлечения', 'Здоровье', 'Одежда', 'Связь', 'Другое'],
};

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const P = {
  bg:      '#0a0a0a',
  card:    '#141414',
  card2:   '#1c1c1c',
  border:  '#2a2a2a',
  green:   '#22c55e',
  green2:  '#16a34a',
  red:     '#ef4444',
  muted:   '#6b7280',
  muted2:  '#9ca3af',
  text:    '#e8e8e8',
  white:   '#ffffff',
};

function fmt(n) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({ type: 'expense', category: 'Еда', amount: '', date: todayStr, note: '' });
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteId, setDeleteId] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTransactions();

    // Realtime subscription
    const channel = supabase
      .channel('transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }

  // ── Add ────────────────────────────────────────────────────────────────────
  async function handleAdd() {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    try {
      const { error } = await supabase.from('transactions').insert([{
        type: form.type,
        category: form.category,
        amount,
        date: form.date,
        note: form.note || null,
      }]);
      if (error) throw error;
      setForm(f => ({ ...f, amount: '', note: '' }));
      setShowForm(false);
      showToast('Сохранено ✓');
    } catch {
      showToast('Ошибка при сохранении', true);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setDeleteId(null);
      showToast('Удалено');
    } catch {
      showToast('Ошибка при удалении', true);
    }
  }

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 2500);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    transactions.filter(t => t.date.startsWith(filterMonth)).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, filterMonth]
  );

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const expenseByCat = useMemo(() => {
    const m = {};
    filtered.filter(t => t.type === 'expense').forEach(t => { m[t.category] = (m[t.category] || 0) + Number(t.amount); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const incomeByCat = useMemo(() => {
    const m = {};
    filtered.filter(t => t.type === 'income').forEach(t => { m[t.category] = (m[t.category] || 0) + Number(t.amount); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const [yr, mo] = filterMonth.split('-');
  const monthLabel = `${MONTH_NAMES[parseInt(mo) - 1]} ${yr}`;

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${P.border}`, borderTop: `3px solid ${P.green}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      <div style={{ color: P.muted, fontSize: 14 }}>Загрузка...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: P.bg, color: P.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", paddingBottom: 80 }}>

      {/* ── Header ── */}
      <div style={{ background: P.card, borderBottom: `1px solid ${P.border}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: P.green, textTransform: 'uppercase', marginBottom: 2, fontWeight: 600 }}>Совместный</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, color: P.white }}>Бюджет</div>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              style={{ background: showForm ? P.card2 : P.green, border: `1px solid ${showForm ? P.border : P.green}`, color: showForm ? P.muted2 : P.bg, borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {showForm ? '✕ Закрыть' : '+ Добавить'}
            </button>
          </div>

          {/* Month pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {[-2, -1, 0, 1].map(d => {
              const dt = new Date(today.getFullYear(), today.getMonth() + d, 1);
              const val = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
              const active = val === filterMonth;
              return (
                <button key={val} onClick={() => setFilterMonth(val)}
                  style={{ flexShrink: 0, background: active ? P.green : 'transparent', border: `1px solid ${active ? P.green : P.border}`, color: active ? P.bg : P.muted, borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400, transition: 'all 0.15s' }}>
                  {MONTH_NAMES[dt.getMonth()].slice(0, 3)} {dt.getFullYear()}
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {[['overview', 'Обзор'], ['transactions', 'Операции'], ['stats', 'Статистика']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === key ? P.green : 'transparent'}`, color: activeTab === key ? P.green : P.muted, padding: '8px 0 10px', fontSize: 13, fontWeight: activeTab === key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* ── Add Form ── */}
        {showForm && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: 20, marginTop: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: P.white }}>Новая операция</div>

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['expense', 'income'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: CATEGORIES[t][0] }))}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${form.type === t ? (t === 'income' ? P.green : P.red) : P.border}`, background: form.type === t ? (t === 'income' ? '#22c55e18' : '#ef444418') : 'transparent', color: form.type === t ? (t === 'income' ? P.green : P.red) : P.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {t === 'income' ? '▲ Доход' : '▼ Расход'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Категория', el: (
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', background: P.bg, border: `1px solid ${P.border}`, color: P.text, borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                    {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
                  </select>
                )},
                { label: 'Сумма, ₽', el: (
                  <input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '100%', background: P.bg, border: `1px solid ${P.border}`, color: P.text, borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                )},
                { label: 'Дата', el: (
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '100%', background: P.bg, border: `1px solid ${P.border}`, color: P.text, borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                )},
                { label: 'Заметка', el: (
                  <input type="text" placeholder="Необязательно" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    style={{ width: '100%', background: P.bg, border: `1px solid ${P.border}`, color: P.text, borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                )},
              ].map(({ label, el }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: P.muted, marginBottom: 5, letterSpacing: 0.5 }}>{label}</div>
                  {el}
                </div>
              ))}
            </div>

            <button onClick={handleAdd}
              style={{ width: '100%', background: P.green, border: 'none', color: P.bg, borderRadius: 12, padding: '13px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 14, letterSpacing: 0.3 }}>
              Сохранить
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginTop: 20, fontSize: 11, color: P.muted, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{monthLabel}</div>

            {/* Balance */}
            <div style={{ background: P.card, border: `1px solid ${balance >= 0 ? '#22c55e30' : '#ef444430'}`, borderRadius: 20, padding: '28px 24px', textAlign: 'center', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: balance >= 0 ? P.green : P.red, borderRadius: '20px 20px 0 0' }} />
              <div style={{ fontSize: 11, color: P.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Баланс за период</div>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: balance >= 0 ? P.green : P.red, fontVariantNumeric: 'tabular-nums' }}>
                {balance >= 0 ? '+' : ''}{fmt(balance)}
              </div>
              <div style={{ fontSize: 13, color: balance >= 0 ? P.green : P.red, marginTop: 6, fontWeight: 600 }}>
                {balance >= 0 ? '↑ Вы в плюсе' : '↓ Расходы превышают доходы'}
              </div>
            </div>

            {/* Income / Expense */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: P.card, border: `1px solid #22c55e20`, borderRadius: 16, padding: '16px 14px' }}>
                <div style={{ fontSize: 10, color: P.green, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>Доходы</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: P.green, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalIncome)}</div>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>{filtered.filter(t => t.type === 'income').length} операций</div>
              </div>
              <div style={{ background: P.card, border: `1px solid #ef444420`, borderRadius: 16, padding: '16px 14px' }}>
                <div style={{ fontSize: 10, color: P.red, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>Расходы</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: P.red, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalExpense)}</div>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>{filtered.filter(t => t.type === 'expense').length} операций</div>
              </div>
            </div>

            {/* Savings rate */}
            {totalIncome > 0 && (
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: P.muted2 }}>Норма сбережений</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: balance >= 0 ? P.green : P.red }}>
                    {Math.round(Math.max(0, balance) / totalIncome * 100)}%
                  </div>
                </div>
                <div style={{ height: 4, background: P.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, balance / totalIncome * 100))}%`, background: balance >= 0 ? P.green : P.red, borderRadius: 2 }} />
                </div>
              </div>
            )}

            {/* Recent transactions */}
            {filtered.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: P.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Последние</div>
                {filtered.slice(0, 5).map(t => (
                  <TRow key={t.id} t={t} onDelete={setDeleteId} />
                ))}
                {filtered.length > 5 && (
                  <div onClick={() => setActiveTab('transactions')} style={{ textAlign: 'center', color: P.green, fontSize: 13, marginTop: 10, cursor: 'pointer', fontWeight: 600 }}>
                    Все операции ({filtered.length}) →
                  </div>
                )}
              </>
            )}
            {filtered.length === 0 && <Empty onAdd={() => setShowForm(true)} />}
          </>
        )}

        {/* ── TRANSACTIONS ── */}
        {activeTab === 'transactions' && (
          <div style={{ marginTop: 16 }}>
            {filtered.length === 0 && <Empty onAdd={() => setShowForm(true)} />}
            {filtered.map(t => <TRow key={t.id} t={t} onDelete={setDeleteId} />)}
          </div>
        )}

        {/* ── STATS ── */}
        {activeTab === 'stats' && (
          <div style={{ marginTop: 16 }}>
            {totalExpense > 0 && (
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: 18, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.red, marginBottom: 14, letterSpacing: 0.3 }}>▼ Расходы по категориям</div>
                {expenseByCat.map(([cat, sum]) => (
                  <CatBar key={cat} label={cat} amount={sum} total={totalExpense} color={P.red} />
                ))}
              </div>
            )}
            {totalIncome > 0 && (
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: 18, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.green, marginBottom: 14, letterSpacing: 0.3 }}>▲ Доходы по категориям</div>
                {incomeByCat.map(([cat, sum]) => (
                  <CatBar key={cat} label={cat} amount={sum} total={totalIncome} color={P.green} />
                ))}
              </div>
            )}
            {filtered.length === 0 && <Empty onAdd={() => setShowForm(true)} />}
          </div>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: P.white }}>Удалить операцию?</div>
            <div style={{ fontSize: 14, color: P.muted, marginBottom: 20 }}>Это действие нельзя отменить.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${P.border}`, color: P.muted2, borderRadius: 12, padding: '12px 0', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Отмена</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, background: P.red, border: 'none', color: P.white, borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: toast.isError ? P.red : P.green, color: P.bg, borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 700, zIndex: 200, whiteSpace: 'nowrap', boxShadow: '0 4px 24px #0008' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: P.red, color: P.white, textAlign: 'center', padding: '10px 16px', fontSize: 13, fontWeight: 600, zIndex: 300 }}>
          {error} — проверьте подключение к интернету
        </div>
      )}
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TRow({ t, onDelete }) {
  const isIncome = t.type === 'income';
  const icons = { Еда:'🍕', Транспорт:'🚇', Жильё:'🏠', Развлечения:'🎬', Здоровье:'💊', Одежда:'👕', Связь:'📱', Зарплата:'💼', Фриланс:'💻', Инвестиции:'📈', Подарок:'🎁', Другое:'📌' };
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '13px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: isIncome ? '#22c55e15' : '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {icons[t.category] || '•'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: P.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.category}</div>
        <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>{t.note || '—'} · {t.date.slice(5).replace('-', '.')}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: isIncome ? P.green : P.red, fontVariantNumeric: 'tabular-nums' }}>
          {isIncome ? '+' : '−'}{fmt(t.amount)}
        </div>
        <button onClick={() => onDelete(t.id)} style={{ background: 'none', border: 'none', color: P.muted, fontSize: 11, cursor: 'pointer', marginTop: 3, padding: 0 }}>удалить</button>
      </div>
    </div>
  );
}

// ─── Category Bar ─────────────────────────────────────────────────────────────
function CatBar({ label, amount, total, color }) {
  const pct = Math.round(amount / total * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, color: P.text }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: P.text, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(amount)} <span style={{ color: P.muted, fontWeight: 400 }}>({pct}%)</span>
        </div>
      </div>
      <div style={{ height: 4, background: P.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function Empty({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: P.muted }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: P.white, marginBottom: 6 }}>Нет операций</div>
      <div style={{ fontSize: 13, marginBottom: 24, color: P.muted }}>Добавьте первую запись</div>
      <button onClick={onAdd} style={{ background: P.green, border: 'none', color: P.bg, borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
        + Добавить операцию
      </button>
    </div>
  );
}
