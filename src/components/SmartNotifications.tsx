import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

export const SmartNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Simulação de notificações inteligentes
    const mockNotifications: NotificationItem[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Gastos Acima da Média',
        message: 'Seus gastos deste mês estão 15% acima da média dos últimos 3 meses.',
        timestamp: new Date(),
        read: false,
        action: {
          label: 'Ver Detalhes',
          callback: () => console.log('Navegando para análise de gastos')
        }
      },
      {
        id: '2',
        type: 'info',
        title: 'Meta de Economia',
        message: 'Você está a 72% da sua meta mensal de economia. Continue assim!',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
        action: {
          label: 'Ver Metas',
          callback: () => console.log('Navegando para metas')
        }
      },
      {
        id: '3',
        type: 'success',
        title: 'Receita Registrada',
        message: 'Nova receita de R$ 2.500,00 foi adicionada automaticamente.',
        timestamp: new Date(Date.now() - 7200000),
        read: true
      }
    ];

    setNotifications(mockNotifications);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Agora';
    if (hours === 1) return '1 hora atrás';
    return `${hours} horas atrás`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              Notificações Inteligentes
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} novas
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma notificação no momento
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    notification.read 
                      ? 'bg-secondary/30 border-secondary' 
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getIcon(notification.type)}
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-medium">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(notification.timestamp)}
                        </p>
                        {notification.action && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => {
                              notification.action!.callback();
                              markAsRead(notification.id);
                            }}
                          >
                            {notification.action.label}
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};