
export const getDateRange = (filter: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'hoje':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    
    case 'ontem':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    
    case 'esta-semana':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek,
        end: now
      };
    
    case 'semana-passada':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      return {
        start: lastWeekStart,
        end: lastWeekEnd
      };
    
    case 'este-mes':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth,
        end: now
      };
    
    case 'mes-passado':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      return {
        start: lastMonthStart,
        end: lastMonthEnd
      };
    
    case 'ultimos-30-dias':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return {
        start: thirtyDaysAgo,
        end: now
      };
    
    case 'ultimos-90-dias':
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      return {
        start: ninetyDaysAgo,
        end: now
      };
    
    case 'este-ano':
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        start: startOfYear,
        end: now
      };
    
    case 'ano-passado':
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      lastYearEnd.setHours(23, 59, 59, 999);
      return {
        start: lastYearStart,
        end: lastYearEnd
      };
    
    default:
      return {
        start: today,
        end: now
      };
  }
};

export const formatDateForFilter = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const isDateInRange = (dateString: string, filter: string): boolean => {
  const date = new Date(dateString);
  const { start, end } = getDateRange(filter);
  return date >= start && date <= end;
};
