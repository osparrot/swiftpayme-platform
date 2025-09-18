import { EventEmitter } from 'events';
import { Logger } from './Logger';

export interface IEvent {
  type: string;
  data: any;
  timestamp: Date;
  source: string;
  correlationId?: string;
}

export class EventBus extends EventEmitter {
  private logger: Logger;
  private eventHistory: IEvent[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    super();
    this.logger = new Logger('EventBus');
    this.setMaxListeners(100); // Increase max listeners for high-throughput scenarios
  }

  /**
   * Emit an event with structured data
   */
  emit(eventType: string, data: any, source: string = 'TokenizationService', correlationId?: string): boolean {
    const event: IEvent = {
      type: eventType,
      data,
      timestamp: new Date(),
      source,
      correlationId
    };

    // Add to history
    this.addToHistory(event);

    // Log the event
    this.logger.info('Event emitted', {
      eventType,
      source,
      correlationId,
      dataKeys: Object.keys(data || {})
    });

    // Emit the event
    return super.emit(eventType, event);
  }

  /**
   * Subscribe to events with error handling
   */
  subscribe(eventType: string, handler: (event: IEvent) => void | Promise<void>): void {
    this.on(eventType, async (event: IEvent) => {
      try {
        await handler(event);
        this.logger.debug('Event handler completed', {
          eventType,
          correlationId: event.correlationId
        });
      } catch (error) {
        this.logger.error('Event handler failed', {
          eventType,
          error: error.message,
          correlationId: event.correlationId
        });
      }
    });
  }

  /**
   * Subscribe to events once
   */
  subscribeOnce(eventType: string, handler: (event: IEvent) => void | Promise<void>): void {
    this.once(eventType, async (event: IEvent) => {
      try {
        await handler(event);
        this.logger.debug('One-time event handler completed', {
          eventType,
          correlationId: event.correlationId
        });
      } catch (error) {
        this.logger.error('One-time event handler failed', {
          eventType,
          error: error.message,
          correlationId: event.correlationId
        });
      }
    });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler?: Function): void {
    if (handler) {
      this.removeListener(eventType, handler);
    } else {
      this.removeAllListeners(eventType);
    }
    
    this.logger.debug('Unsubscribed from event', { eventType });
  }

  /**
   * Get event history
   */
  getEventHistory(eventType?: string, limit?: number): IEvent[] {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    if (limit) {
      events = events.slice(-limit);
    }
    
    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.logger.info('Event history cleared');
  }

  /**
   * Get event statistics
   */
  getEventStats(): any {
    const stats: any = {
      totalEvents: this.eventHistory.length,
      eventTypes: {},
      sources: {},
      recentEvents: this.eventHistory.slice(-10)
    };

    this.eventHistory.forEach(event => {
      // Count by event type
      stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
      
      // Count by source
      stats.sources[event.source] = (stats.sources[event.source] || 0) + 1;
    });

    return stats;
  }

  /**
   * Emit tokenization-specific events
   */
  emitTokenCreated(tokenId: string, assetType: string, createdBy: string, correlationId?: string): void {
    this.emit('token.created', {
      tokenId,
      assetType,
      createdBy
    }, 'TokenizationService', correlationId);
  }

  emitMintingRequested(requestId: string, tokenId: string, userId: string, amount: string, correlationId?: string): void {
    this.emit('minting.requested', {
      requestId,
      tokenId,
      userId,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitMintingCompleted(requestId: string, tokenId: string, userId: string, amount: string, correlationId?: string): void {
    this.emit('minting.completed', {
      requestId,
      tokenId,
      userId,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitBurningRequested(requestId: string, tokenId: string, userId: string, amount: string, correlationId?: string): void {
    this.emit('burning.requested', {
      requestId,
      tokenId,
      userId,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitBurningCompleted(requestId: string, tokenId: string, userId: string, amount: string, correlationId?: string): void {
    this.emit('burning.completed', {
      requestId,
      tokenId,
      userId,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitDepositReceived(depositId: string, userId: string, assetType: string, amount: string, correlationId?: string): void {
    this.emit('deposit.received', {
      depositId,
      userId,
      assetType,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitDepositVerified(depositId: string, userId: string, assetType: string, amount: string, correlationId?: string): void {
    this.emit('deposit.verified', {
      depositId,
      userId,
      assetType,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitWithdrawalRequested(withdrawalId: string, userId: string, tokenId: string, amount: string, correlationId?: string): void {
    this.emit('withdrawal.requested', {
      withdrawalId,
      userId,
      tokenId,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitWithdrawalCompleted(withdrawalId: string, userId: string, tokenId: string, amount: string, correlationId?: string): void {
    this.emit('withdrawal.completed', {
      withdrawalId,
      userId,
      tokenId,
      amount
    }, 'TokenizationService', correlationId);
  }

  emitReservesUpdated(tokenId: string, action: string, amount: string, newBalance: string, correlationId?: string): void {
    this.emit('reserves.updated', {
      tokenId,
      action,
      amount,
      newBalance
    }, 'TokenizationService', correlationId);
  }

  emitComplianceCheck(entityId: string, entityType: string, status: string, riskScore: number, correlationId?: string): void {
    this.emit('compliance.checked', {
      entityId,
      entityType,
      status,
      riskScore
    }, 'TokenizationService', correlationId);
  }

  emitAuditCompleted(auditId: string, tokenId: string, status: string, findings: string[], correlationId?: string): void {
    this.emit('audit.completed', {
      auditId,
      tokenId,
      status,
      findings
    }, 'TokenizationService', correlationId);
  }

  private addToHistory(event: IEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

