import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Transaction, TransactionType, ExpenseCategory } from '../../types/finance';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise } from '../../utils/currency';
import { TransactionModal } from './TransactionModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { CATEGORY_LIST } from '../../data/initialSeed';

export function TransactionsView() {
  const { state, dispatch } = useFinanceCalculations();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return state.transactions
      .filter((tx) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchCat = tx.category.toLowerCase().includes(q);
          if (!matchDesc && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
          return false;
        }

        // Type filter
        if (selectedType !== 'all' && tx.type !== selectedType) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'all' && tx.status !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const comp = new Date(b.date).getTime() - new Date(a.date).getTime();
          return sortOrder === 'desc' ? comp : -comp;
        } else {
          const comp = b.amountPaise - a.amountPaise;
          return sortOrder === 'desc' ? comp : -comp;
        }
      });
  }, [state.transactions, search, selectedCategory, selectedType, selectedStatus, sortBy, sortOrder]);

  // Aggregate stats
  const totals = useMemo(() => {
    let postedExpenses = 0;
    let postedIncome = 0;
    let plannedExpenses = 0;

    for (const tx of filteredTransactions) {
      if (tx.status === 'posted') {
        if (tx.type === 'expense') postedExpenses += tx.amountPaise;
        else postedIncome += tx.amountPaise;
      } else if (tx.status === 'planned' && tx.type === 'expense') {
        plannedExpenses += tx.amountPaise;
      }
    }

    return {
      postedExpenses,
      postedIncome,
      plannedExpenses,
      netCashflow: postedIncome - postedExpenses,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleSaveTransaction = (tx: Transaction) => {
    if (editingTx) {
      dispatch({ type: 'EDIT_TRANSACTION', payload: tx });
    } else {
      dispatch({ type: 'ADD_TRANSACTION', payload: tx });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: { id: deleteTargetId } });
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track and reconcile posted cashflows and upcoming planned expenditures.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTx(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Total Posted Expenses
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatPaise(totals.postedExpenses)}
          </div>
          <span className="text-[11px] text-slate-400">Actual deductions</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Total Posted Income
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {formatPaise(totals.postedIncome)}
          </div>
          <span className="text-[11px] text-slate-400">Deposits & earnings</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Planned Expenses
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-700 mt-1">
            {formatPaise(totals.plannedExpenses)}
          </div>
          <span className="text-[11px] text-slate-400">Pending forecasts</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Net Filtered Cashflow
          </span>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-1 ${
              totals.netCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {totals.netCashflow >= 0 ? '+' : ''}
            {formatPaise(totals.netCashflow)}
          </div>
          <span className="text-[11px] text-slate-400">{totals.count} record(s)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORY_LIST.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type Segmented buttons */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('expense')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedType === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setSelectedType('income')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedType === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
          </div>

          {/* Status buttons */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setSelectedStatus('posted')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedStatus === 'posted'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Posted
            </button>
            <button
              onClick={() => setSelectedStatus('planned')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedStatus === 'planned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Planned
            </button>
          </div>
        </div>

        {/* Sort Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredTransactions.length}</strong> of{' '}
            {state.transactions.length} transactions
          </span>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                sortBy === 'date' ? 'bg-slate-200 text-slate-900 font-semibold' : 'hover:bg-slate-100'
              }`}
            >
              Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('amount');
                  setSortOrder('desc');
                }
              }}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                sortBy === 'amount' ? 'bg-slate-200 text-slate-900 font-semibold' : 'hover:bg-slate-100'
              }`}
            >
              Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-sm">No transactions match your filters.</p>
                    <button
                      onClick={() => {
                        setSearch('');
                        setSelectedCategory('all');
                        setSelectedType('all');
                        setSelectedStatus('all');
                      }}
                      className="mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                          {tx.status === 'posted' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Posted</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Planned</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        <span className={isExpense ? 'text-slate-900' : 'text-emerald-600'}>
                          {isExpense ? '-' : '+'}
                          {formatPaise(tx.amountPaise)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setIsModalOpen(true);
                            }}
                            title="Edit transaction"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(tx.id)}
                            title="Delete transaction"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialTransaction={editingTx}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction? This will permanently update your current balance, daily allowance, and financial forecast."
        confirmLabel="Delete Transaction"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
