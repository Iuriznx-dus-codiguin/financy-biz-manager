// Utilitários para cálculos financeiros otimizados
export const calculateTotals = (items: any[], valueKey = 'valor') => {
  return items.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
};

export const filterByDateRange = (items: any[], dateKey: string, startDate: Date, endDate: Date) => {
  return items.filter(item => {
    const itemDate = new Date(item[dateKey]);
    return itemDate >= startDate && itemDate <= endDate;
  });
};

export const groupByCategory = (items: any[], categoryKey = 'categoria', valueKey = 'valor') => {
  return items.reduce((acc, item) => {
    const category = item[categoryKey] || 'outros';
    acc[category] = (acc[category] || 0) + (item[valueKey] || 0);
    return acc;
  }, {} as Record<string, number>);
};

export const calculateGrowthRate = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

export const formatCurrency = (value: number, locale = 'pt-BR', currency = 'BRL') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(value);
};

export const calculateMargin = (revenue: number, costs: number) => {
  if (revenue === 0) return 0;
  return ((revenue - costs) / revenue) * 100;
};

export const calculateROI = (gains: number, investments: number) => {
  if (investments === 0) return gains > 0 ? 100 : 0;
  return ((gains - investments) / investments) * 100;
};

// Cache para cálculos pesados
const calculationCache = new Map<string, { result: any; timestamp: number }>();

export const getCachedCalculation = <T>(key: string, calculator: () => T, ttl = 300000): T => {
  const cached = calculationCache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.result;
  }
  
  const result = calculator();
  calculationCache.set(key, { result, timestamp: now });
  
  // Limpeza automática do cache
  if (calculationCache.size > 100) {
    const cutoff = now - ttl;
    for (const [cacheKey, value] of calculationCache.entries()) {
      if (value.timestamp < cutoff) {
        calculationCache.delete(cacheKey);
      }
    }
  }
  
  return result;
};