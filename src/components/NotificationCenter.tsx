import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Bell, Check, CheckCheck, Trash2, X, Calendar, CreditCard, Target, Users, Bot, AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const {
    notifications,
    stats,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'pagamento': return <CreditCard className={iconClass} />;
      case 'meta': return <Target className={iconClass} />;
      case 'imposto': return <Calendar className={iconClass} />;
      case 'equipe': return <Users className={iconClass} />;
      case 'sistema': return <AlertTriangle className={iconClass} />;
      case 'transacao_recorrente': return <Bot className={iconClass} />;
      default: return <Bell className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'pagamento': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'meta': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'imposto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case 'equipe': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
      case 'sistema': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'transacao_recorrente': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const handleMarkAsRead = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await markAsRead(id);
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteNotification(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className={className}>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("relative", className)}>
          <Bell className="h-4 w-4" />
          {stats.unread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-80 p-0" 
        side="bottom" 
        align="end"
        sideOffset={5}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Notificações
                {stats.unread > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {stats.unread} não lidas
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-1">
                {stats.unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-6 px-2 text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma notificação
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você receberá notificações sobre pagamentos, metas e lembretes aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer",
                        !notification.lida && "bg-muted/20"
                      )}
                      onClick={() => !notification.lida && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                          getNotificationColor(notification.tipo)
                        )}>
                          {getNotificationIcon(notification.tipo)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium leading-tight">
                              {notification.titulo}
                            </h4>
                            <div className="flex gap-1">
                              {!notification.lida && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                                  className="h-6 w-6 p-0 hover:bg-primary/10"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(notification.id, e)}
                                className="h-6 w-6 p-0 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notification.mensagem}
                          </p>

                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {notification.tipo.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </span>
                          </div>

                          {notification.data_vencimento && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3 text-orange-500" />
                              <span className="text-xs text-orange-600">
                                Vence em {new Date(notification.data_vencimento).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};