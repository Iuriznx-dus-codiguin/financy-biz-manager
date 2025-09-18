import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface AnalyticsChartProps {
  data: AnalyticsData[];
  title: string;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, title }) => {
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const isProfitable = totalProfit > 0;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProfitable ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="font-medium">{item.period}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">R$ {item.revenue.toFixed(2)}</span>
                <span className="text-red-600">R$ {item.expenses.toFixed(2)}</span>
                <span className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  R$ {item.profit.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total do Período:</span>
            <span className={totalProfit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              R$ {totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};