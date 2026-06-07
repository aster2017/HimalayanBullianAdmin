'use client';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  globalSearch, SearchResult, SearchType,
  CustomerResult, OrderResult, InvoiceResult, ProductResult, PaymentResult, NchlTransactionResult
} from '@/shared/services/searchService';
import NchlTransactionRow from './NchlTransactionRow';

// ── Static pages map ─────────────────────────────────────────────────────────
const PAGES = [
  { title: 'Dashboard',            path: '/dashboards/admin',         icon: 'ri-dashboard-line' },
  { title: 'Orders',               path: '/orders',                   icon: 'ri-shopping-cart-line' },
  { title: 'Customer Approvals',   path: '/customers/approvals',      icon: 'ri-user-follow-line' },
  { title: 'Customers',            path: '/customers',                icon: 'ri-group-line' },
  { title: 'Invoices',             path: '/invoices',                 icon: 'ri-file-text-line' },
  { title: 'Targets',              path: '/targets',                  icon: 'ri-focus-3-line' },
  { title: 'Collections',          path: '/collections',              icon: 'ri-archive-line' },
  { title: 'Delivery',             path: '/delivery',                 icon: 'ri-truck-line' },
  { title: 'Buybacks',             path: '/buybacks',                 icon: 'ri-repeat-line' },
  { title: 'Credits / Wallet',     path: '/credits',                  icon: 'ri-wallet-3-line' },
  { title: 'Pending Deposits',     path: '/credits/pending',          icon: 'ri-time-line' },
  { title: 'Payments',             path: '/payments',                 icon: 'ri-bank-card-line' },
  { title: 'Products',             path: '/items',                    icon: 'ri-box-3-line' },
  { title: 'Rates',                path: '/rates',                    icon: 'ri-line-chart-line' },
  { title: 'Audit Log',            path: '/audit-log',                icon: 'ri-shield-check-line' },
  { title: 'Notifications',        path: '/notifications',            icon: 'ri-notification-3-line' },
  { title: 'ConnectIPS Probe',     path: '/access/connectips-probe',  icon: 'ri-flashlight-line' },
  { title: 'Settings',             path: '/settings',                 icon: 'ri-settings-3-line' },
  { title: 'Notification Settings',path: '/settings/notifications',   icon: 'ri-settings-3-line' },
  { title: 'Reports',              path: '/reports',                  icon: 'ri-bar-chart-2-line' },
];

const FILTER_TYPES: { label: string; value: SearchType | 'pages' | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Customers',  value: 'customers' },
  { label: 'Orders',     value: 'orders' },
  { label: 'Invoices',   value: 'invoices' },
  { label: 'Products',   value: 'products' },
  { label: 'Payments',   value: 'payments' },
  { label: 'NCHL',       value: 'nchl' },
  { label: 'Pages',      value: 'pages' },
];

const RECENT_KEY = 'hbc_search_recents';
const MAX_RECENT = 5;

function getRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(q: string) {
  const prev = getRecents().filter(r => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}
function clearRecents() { localStorage.removeItem(RECENT_KEY); }

function fmtNpr(n: number) {
  return `NPR ${n.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export default function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState<string>('all');
  const [results, setResults]   = useState<SearchResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [recents, setRecents]   = useState<string[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);

  // Flat list of navigable items for keyboard nav
  const [flatItems, setFlatItems] = useState<{ path: string; label: string }[]>([]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setRecents(getRecents());
      setQuery('');
      setResults(null);
      setFilter('all');
      setFocusIdx(-1);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    const apiTypes = (filter === 'all' || filter === 'pages')
      ? undefined
      : [filter as SearchType];

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(query, apiTypes);
        setResults(data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter]);

  // Rebuild flat items for keyboard nav
  useEffect(() => {
    const items: { path: string; label: string }[] = [];
    if (results) {
      results.customers.forEach(c => items.push({ path: `/customers/${c.id}`, label: c.name }));
      results.orders.forEach(o => items.push({ path: `/orders/${o.id}`, label: o.orderNumber }));
      results.invoices.forEach(i => items.push({ path: `/invoices/${i.id}`, label: i.invoiceNumber }));
      results.products.forEach(p => items.push({ path: `/items/${p.id}`, label: p.name }));
      results.payments.forEach(p => items.push({ path: `/payments/${p.id}`, label: p.paymentNumber }));
      // NCHL rows handle their own navigation
    }
    const pageResults = getFilteredPages();
    pageResults.forEach(p => items.push({ path: p.path, label: p.title }));
    setFlatItems(items);
    setFocusIdx(-1);
  }, [results, filter, query]);

  const getFilteredPages = useCallback(() => {
    if (filter !== 'all' && filter !== 'pages') return [];
    if (!query) return [];
    return PAGES.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
  }, [query, filter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusIdx >= 0 && flatItems[focusIdx]) {
      router.push(flatItems[focusIdx].path);
      handleClose();
    }
  };

  const handleClose = () => {
    if (query.trim().length >= 2) saveRecent(query.trim());
    onClose();
  };

  const handleRecentClick = (r: string) => {
    setQuery(r);
    inputRef.current?.focus();
  };

  const handleClearRecents = () => { clearRecents(); setRecents([]); };

  const hasResults = results && (
    results.customers.length > 0 || results.orders.length > 0 ||
    results.invoices.length > 0  || results.products.length > 0 ||
    results.payments.length > 0  || results.nchlTransactions.length > 0
  );
  const pageResults = getFilteredPages();
  const showEmpty = !loading && query.length >= 2 && !hasResults && pageResults.length === 0;

  let flatIdx = 0;

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-bodybg shadow-2xl rounded-2xl overflow-hidden border border-defaultborder dark:border-defaultborder/10 max-h-[80vh] flex flex-col">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-defaultborder dark:border-defaultborder/10">
          {loading
            ? <i className="ri-loader-4-line animate-spin text-xl text-primary flex-shrink-0"></i>
            : <i className="ri-search-line text-xl text-[#8c9097] flex-shrink-0"></i>}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, orders, NCHL transactions…"
            className="flex-1 bg-transparent text-[0.9rem] text-defaulttextcolor dark:text-defaulttextcolor/80 placeholder-[#8c9097] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#8c9097] hover:text-defaulttextcolor">
              <i className="ri-close-line text-lg"></i>
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[0.65rem] text-[#8c9097] border border-defaultborder dark:border-defaultborder/20 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-4 py-2.5 border-b border-defaultborder dark:border-defaultborder/10 overflow-x-auto scrollbar-hidden">
          {FILTER_TYPES.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 text-[0.72rem] font-medium px-3 py-1 rounded-full transition-colors ${
                filter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-light dark:bg-black/20 text-[#8c9097] hover:text-defaulttextcolor'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results area */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">

          {/* Recent searches (shown when query is empty) */}
          {!query && recents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.7rem] font-semibold tracking-wider text-[#8c9097] uppercase">Recent</span>
                <button onClick={handleClearRecents} className="text-[0.7rem] text-[#8c9097] hover:text-danger">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recents.map(r => (
                  <button
                    key={r}
                    onClick={() => handleRecentClick(r)}
                    className="flex items-center gap-1.5 text-[0.75rem] px-3 py-1.5 bg-light dark:bg-black/20 rounded-lg text-[#8c9097] hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors"
                  >
                    <i className="ri-history-line text-xs"></i>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tip when query is empty */}
          {!query && recents.length === 0 && (
            <div className="text-center py-8 text-[#8c9097]">
              <i className="ri-search-line text-4xl mb-3 block opacity-40"></i>
              <p className="text-[0.8rem]">Search customers, orders, invoices, NCHL transactions and more</p>
              <p className="text-[0.72rem] mt-1 opacity-70">
                Tip: paste an NCHL TXNID directly to look up a stuck payment
              </p>
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="text-center py-8 text-[#8c9097]">
              <i className="ri-search-eye-line text-4xl mb-3 block opacity-40"></i>
              <p className="text-[0.8rem]">No results for <strong>"{query}"</strong></p>
            </div>
          )}

          {/* NCHL Transactions — special section */}
          {(filter === 'all' || filter === 'nchl') && results && results.nchlTransactions.length > 0 && (
            <ResultSection icon="ri-bank-card-2-line" title="NCHL Transactions" accent="text-warning">
              <div className="space-y-2">
                {results.nchlTransactions.map((tx, i) => (
                  <NchlTransactionRow
                    key={tx.localId}
                    tx={tx}
                    onClose={handleClose}
                    isFocused={false}
                  />
                ))}
              </div>
            </ResultSection>
          )}

          {/* Customers */}
          {(filter === 'all' || filter === 'customers') && results && results.customers.length > 0 && (
            <ResultSection icon="ri-group-line" title="Customers">
              {results.customers.map((c) => {
                const idx = flatIdx++;
                return (
                  <ResultRow
                    key={c.id}
                    icon="ri-user-3-line"
                    title={c.name}
                    sub={`${c.email}${c.customerNumber ? ` · #${c.customerNumber}` : ''}`}
                    badge={c.isApproved ? { label: 'Approved', color: 'success' } : { label: 'Pending', color: 'warning' }}
                    isFocused={focusIdx === idx}
                    onClick={() => { router.push(`/customers/${c.id}`); handleClose(); }}
                  />
                );
              })}
            </ResultSection>
          )}

          {/* Orders */}
          {(filter === 'all' || filter === 'orders') && results && results.orders.length > 0 && (
            <ResultSection icon="ri-shopping-cart-line" title="Orders">
              {results.orders.map((o) => {
                const idx = flatIdx++;
                return (
                  <ResultRow
                    key={o.id}
                    icon="ri-file-list-3-line"
                    title={o.orderNumber}
                    sub={`${o.customerName} · ${fmtNpr(o.totalAmount)}`}
                    badge={{ label: o.status, color: o.status === 'Completed' ? 'success' : 'secondary' }}
                    isFocused={focusIdx === idx}
                    onClick={() => { router.push(`/orders/${o.id}`); handleClose(); }}
                  />
                );
              })}
            </ResultSection>
          )}

          {/* Invoices */}
          {(filter === 'all' || filter === 'invoices') && results && results.invoices.length > 0 && (
            <ResultSection icon="ri-file-text-line" title="Invoices">
              {results.invoices.map((inv) => {
                const idx = flatIdx++;
                return (
                  <ResultRow
                    key={inv.id}
                    icon="ri-receipt-line"
                    title={inv.invoiceNumber}
                    sub={`${inv.customerName} · ${fmtNpr(inv.totalAmount)}`}
                    badge={{ label: inv.status, color: inv.status === 'Paid' ? 'success' : 'secondary' }}
                    isFocused={focusIdx === idx}
                    onClick={() => { router.push(`/invoices/${inv.id}`); handleClose(); }}
                  />
                );
              })}
            </ResultSection>
          )}

          {/* Products */}
          {(filter === 'all' || filter === 'products') && results && results.products.length > 0 && (
            <ResultSection icon="ri-box-3-line" title="Products">
              {results.products.map((p) => {
                const idx = flatIdx++;
                return (
                  <ResultRow
                    key={p.id}
                    icon="ri-copper-coin-line"
                    title={p.name}
                    sub={`${p.weightGrams}g · NPR ${p.pricePerGram}/g`}
                    isFocused={focusIdx === idx}
                    onClick={() => { router.push(`/items/${p.id}`); handleClose(); }}
                  />
                );
              })}
            </ResultSection>
          )}

          {/* Payments */}
          {(filter === 'all' || filter === 'payments') && results && results.payments.length > 0 && (
            <ResultSection icon="ri-bank-card-line" title="Payments">
              {results.payments.map((p) => {
                const idx = flatIdx++;
                return (
                  <ResultRow
                    key={p.id}
                    icon="ri-money-dollar-circle-line"
                    title={p.paymentNumber}
                    sub={`${p.customerName} · ${fmtNpr(p.amount)} · ${p.method}`}
                    badge={{ label: p.status, color: p.status === 'Completed' ? 'success' : 'secondary' }}
                    isFocused={focusIdx === idx}
                    onClick={() => { router.push(`/payments/${p.id}`); handleClose(); }}
                  />
                );
              })}
            </ResultSection>
          )}

          {/* Pages */}
          {(filter === 'all' || filter === 'pages') && pageResults.length > 0 && (
            <ResultSection icon="ri-pages-line" title="Pages">
              {pageResults.map((p) => {
                const idx = flatIdx++;
                return (
                  <ResultRow
                    key={p.path}
                    icon={p.icon}
                    title={p.title}
                    sub={p.path}
                    isFocused={focusIdx === idx}
                    onClick={() => { router.push(p.path); handleClose(); }}
                  />
                );
              })}
            </ResultSection>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-defaultborder dark:border-defaultborder/10 flex items-center gap-4 text-[0.68rem] text-[#8c9097]">
          <span><kbd className="font-mono border border-defaultborder/50 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono border border-defaultborder/50 rounded px-1">↵</kbd> open</span>
          <span><kbd className="font-mono border border-defaultborder/50 rounded px-1">esc</kbd> close</span>
          <span className="ml-auto flex items-center gap-1">
            <i className="ri-database-2-line"></i> Redis-cached · 30s
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultSection({ icon, title, accent = 'text-[#8c9097]', children }: {
  icon: string; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 mb-2 text-[0.7rem] font-semibold tracking-wider uppercase ${accent}`}>
        <i className={`${icon} text-sm`}></i>
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ icon, title, sub, badge, isFocused, onClick }: {
  icon: string; title: string; sub?: string;
  badge?: { label: string; color: string };
  isFocused: boolean; onClick: () => void;
}) {
  const badgeStyle: Record<string, string> = {
    success:   'bg-success/10 text-success',
    warning:   'bg-warning/10 text-warning',
    danger:    'bg-danger/10 text-danger',
    secondary: 'bg-light dark:bg-black/20 text-[#8c9097]',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
        isFocused
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-light dark:hover:bg-black/20'
      }`}
    >
      <i className={`${icon} text-base flex-shrink-0 ${isFocused ? 'text-primary' : 'text-[#8c9097]'}`}></i>
      <div className="flex-1 min-w-0">
        <p className="text-[0.82rem] font-medium text-defaulttextcolor dark:text-defaulttextcolor/80 truncate">{title}</p>
        {sub && <p className="text-[0.72rem] text-[#8c9097] truncate">{sub}</p>}
      </div>
      {badge && (
        <span className={`flex-shrink-0 text-[0.62rem] font-semibold px-2 py-0.5 rounded-full ${badgeStyle[badge.color] ?? badgeStyle.secondary}`}>
          {badge.label}
        </span>
      )}
      <i className="ri-arrow-right-s-line text-[#8c9097] flex-shrink-0"></i>
    </button>
  );
}
