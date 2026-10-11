import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { formatPaise } from '../../utils/currency';

interface SpendingBudgetChartProps {
  startingBudgetPaise: number;
  postedExpensesPaise: number;
  unpaidCommitmentsPaise: number;
  availableToSpendPaise: number;
  remainingSavingsTargetPaise: number;
}

export function SpendingBudgetChart({
  startingBudgetPaise,
  postedExpensesPaise,
  unpaidCommitmentsPaise,
  availableToSpendPaise,
  remainingSavingsTargetPaise,
}: SpendingBudgetChartProps) {
  const data = [
    {
      name: 'Posted Spent',
      amount: Math.round(postedExpensesPaise / 100),
      fill: '#f43f5e', // rose
      label: 'Actual spend',
    },
    {
      name: 'Unpaid Bills',
      amount: Math.round(unpaidCommitmentsPaise / 100),
      fill: '#f59e0b', // amber
      label: 'Ring-fenced dues',
    },
    {
      name: 'Remaining Target',
      amount: Math.round(remainingSavingsTargetPaise / 100),
      fill: '#6366f1', // indigo
      label: 'Savings target',
    },
    {
      name: 'Available Cash',
      amount: Math.round(availableToSpendPaise / 100),
      fill: '#10b981', // emerald
      label: 'Discretionary buffer',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs font-mono border border-slate-700">
          <div className="font-sans font-semibold text-slate-300">{label}</div>
          <div className="text-emerald-400 font-bold mt-0.5">
            ₹{payload[0].value.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
            {payload[0].payload.label}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      role="region"
      aria-label="30-day budget allocation and spending breakdown bar chart"
      className="w-full h-64"
    >
      {/* Screen reader accessible data table */}
      <div className="sr-only">
        <h4>Budget Allocation Summary Table:</h4>
        <table>
          <caption>Comparison of budget allocations and actual cash status</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Amount (₹)</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>₹{d.amount.toLocaleString('en-IN')}</td>
                <td>{d.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
