/**
 * SwiftPayMe WebSocket Manager
 * Real-time communication system for live updates across all microservices
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

// ==================== INTERFACES ====================
export interface IWebSocketUser {
  userId: string;
  userType: 'user' | 'admin';
  role?: string;
  permissions?: string[];
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface IWebSocketMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: Date;
  sender?: string;
  recipients?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface IWebSocketRoom {
  roomId: string;
  type: 'user' | 'admin' | 'asset' | 'transaction' | 'system';
  members: string[];
  createdAt: Date;
  metadata?: any;
}

// ==================== WEBSOCKET MANAGER ====================
export class WebSocketManager {
  private io: SocketIOServer;
  private redis: Redis;
  private connectedUsers: Map<string, IWebSocketUser> = new Map();
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private rooms: Map<string, IWebSocketRoom> = new Map();
  
  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });
    
    this.initializeSocketHandlers();
    this.initializeRedisSubscriptions();
    this.startCleanupInterval();
    
    Logger.info('WebSocket Manager initialized');
  }

  // ==================== INITIALIZATION ====================
  private initializeSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
      
      socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      socket.on('subscribe_updates', (data) => this.handleSubscribeUpdates(socket, data));
      socket.on('unsubscribe_updates', (data) => this.handleUnsubscribeUpdates(socket, data));
      socket.on('ping', () => this.handlePing(socket));
      socket.on('disconnect', () => this.handleDisconnection(socket));
      socket.on('error', (error) => this.handleError(socket, error));
    });
  }

  private async authenticateSocket(socket: Socket, next: Function): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      (socket as any).user = {
        userId: decoded.userId || decoded.adminId,
        userType: decoded.adminId ? 'admin' : 'user',
        role: decoded.role,
        permissions: decoded.permissions,
        email: decoded.email
      };
      
      next();
    } catch (error) {
      Logger.error('WebSocket authentication failed:', error);
      next(new Error('Invalid authentication token'));
    }
  }

  private initializeRedisSubscriptions(): void {
    // Subscribe to system-wide events
    this.redis.subscribe(
      'swiftpayme:notifications',
      'swiftpayme:asset_updates',
      'swiftpayme:transaction_updates',
      'swiftpayme:user_updates',
      'swiftpayme:system_alerts',
      'swiftpayme:admin_notifications'
    );
    
    this.redis.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleRedisMessage(channel, data);
      } catch (error) {
        Logger.error('Error processing Redis message:', error);
      }
    });
  }

  // ==================== CONNECTION HANDLING ====================
  private handleConnection(socket: Socket): void {
    const user = (socket as any).user;
    const userInfo: IWebSocketUser = {
      userId: user.userId,
      userType: user.userType,
      role: user.role,
      permissions: user.permissions,
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date()
    };
    
    this.connectedUsers.set(socket.id, userInfo);
    
    // Track multiple sockets per user
    const userSockets = this.userSockets.get(user.userId) || [];
    userSockets.push(socket.id);
    this.userSockets.set(user.userId, userSockets);
    
    // Join user-specific room
    socket.join(`user:${user.userId}`);
    
    // Join role-based rooms for admins
    if (user.userType === 'admin') {
      socket.join('admin:all');
      if (user.role) {
        socket.join(`admin:${user.role}`);
      }
    }
    
    Logger.info(`WebSocket connection established: ${user.userId} (${user.userType})`, {
      socketId: socket.id,
      userType: user.userType,
      role: user.role
    });
    
    // Send welcome message with connection info
    socket.emit('connected', {
      success: true,
      userId: user.userId,
      userType: user.userType,
      connectedAt: userInfo.connectedAt,
      activeConnections: this.connectedUsers.size
    });
    
    // Notify about pending notifications
    this.sendPendingNotifications(user.userId);
  }

  private handleDisconnection(socket: Socket): void {
    const userInfo = this.connectedUsers.get(socket.id);
    if (!userInfo) return;
    
    this.connectedUsers.delete(socket.id);
    
    // Remove socket from user's socket list
    const userSockets = this.userSockets.get(userInfo.userId) || [];
    const updatedSockets = userSockets.filter(id => id !== socket.id);
    
    if (updatedSockets.length === 0) {
      this.userSockets.delete(userInfo.userId);
    } else {
      this.userSockets.set(userInfo.userId, updatedSockets);
    }
    
    Logger.info(`WebSocket disconnection: ${userInfo.userId}`, {
      socketId: socket.id,
      userType: userInfo.userType,
      connectionDuration: Date.now() - userInfo.connectedAt.getTime()
    });
  }

  // ==================== ROOM MANAGEMENT ====================
  private handleJoinRoom(socket: Socket, data: any): void {
    const { roomId, roomType, metadata } = data;
    const user = (socket as any).user;
    
    if (!this.canJoinRoom(user, roomId, roomType)) {
      socket.emit('room_error', { error: 'Permission denied to join room' });
      return;
    }
    
    socket.join(roomId);
    
    // Track room membership
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        type: roomType,
        members: [],
        createdAt: new Date(),
        metadata
      };
      this.rooms.set(roomId, room);
    }
    
    if (!room.members.includes(user.userId)) {
      room.members.push(user.userId);
    }
    
    socket.emit('room_joined', { roomId, members: room.members.length });
    socket.to(roomId).emit('user_joined_room', { userId: user.userId, roomId });
    
    Logger.info(`User joined room: ${user.userId} -> ${roomId}`);
  }

  private handleLeaveRoom(socket: Socket, data: any): void {
    const { roomId } = data;
    const user = (socket as any).user;
    
    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.members = room.members.filter(id => id !== user.userId);
      if (room.members.length === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    socket.emit('room_left', { roomId });
    socket.to(roomId).emit('user_left_room', { userId: user.userId, roomId });
    
    Logger.info(`User left room: ${user.userId} -> ${roomId}`);
  }

  // ==================== MESSAGE HANDLING ====================
  private handleSendMessage(socket: Socket, data: any): void {
    const user = (socket as any).user;
    const { channel, message, recipients, priority = 'medium' } = data;
    
    const wsMessage: IWebSocketMessage = {
      type: 'user_message',
      channel,
      data: message,
      timestamp: new Date(),
      sender: user.userId,
      recipients,
      priority
    };
    
    if (recipients && recipients.length > 0) {
      // Send to specific recipients
      recipients.forEach((recipientId: string) => {
        this.sendToUser(recipientId, 'message', wsMessage);
      });
    } else {
      // Broadcast to channel
      this.io.to(channel).emit('message', wsMessage);
    }
    
    Logger.info(`Message sent: ${user.userId} -> ${channel}`, {
      recipients: recipients?.length || 'broadcast',
      priority
    });
  }

  private handleRedisMessage(channel: string, data: any): void {
    switch (channel) {
      case 'swiftpayme:notifications':
        this.handleNotificationMessage(data);
        break;
      case 'swiftpayme:asset_updates':
        this.handleAssetUpdateMessage(data);
        break;
      case 'swiftpayme:transaction_updates':
        this.handleTransactionUpdateMessage(data);
        break;
      case 'swiftpayme:user_updates':
        this.handleUserUpdateMessage(data);
        break;
      case 'swiftpayme:system_alerts':
        this.handleSystemAlertMessage(data);
        break;
      case 'swiftpayme:admin_notifications':
        this.handleAdminNotificationMessage(data);
        break;
    }
  }

  // ==================== SPECIFIC MESSAGE HANDLERS ====================
  private handleNotificationMessage(data: any): void {
    const { userId, type, message, priority = 'medium' } = data;
    
    this.sendToUser(userId, 'notification', {
      type,
      message,
      priority,
      timestamp: new Date()
    });
  }

  private handleAssetUpdateMessage(data: any): void {
    const { userId, assetId, status, adminId } = data;
    
    // Notify user
    this.sendToUser(userId, 'asset_update', {
      assetId,
      status,
      timestamp: new Date()
    });
    
    // Notify relevant admins
    this.io.to('admin:asset_verifier').emit('asset_status_change', {
      assetId,
      userId,
      status,
      updatedBy: adminId,
      timestamp: new Date()
    });
  }

  private handleTransactionUpdateMessage(data: any): void {
    const { userId, transactionId, status, amount, currency } = data;
    
    this.sendToUser(userId, 'transaction_update', {
      transactionId,
      status,
      amount,
      currency,
      timestamp: new Date()
    });
  }

  private handleUserUpdateMessage(data: any): void {
    const { userId, updateType, details } = data;
    
    this.sendToUser(userId, 'user_update', {
      updateType,
      details,
      timestamp: new Date()
    });
  }

  private handleSystemAlertMessage(data: any): void {
    const { alertType, message, severity, affectedUsers } = data;
    
    if (affectedUsers && affectedUsers.length > 0) {
      affectedUsers.forEach((userId: string) => {
        this.sendToUser(userId, 'system_alert', {
          alertType,
          message,
          severity,
          timestamp: new Date()
        });
      });
    } else {
      // Broadcast to all connected users
      this.io.emit('system_alert', {
        alertType,
        message,
        severity,
        timestamp: new Date()
      });
    }
  }

  private handleAdminNotificationMessage(data: any): void {
    const { adminId, role, type, message, priority } = data;
    
    if (adminId) {
      this.sendToUser(adminId, 'admin_notification', {
        type,
        message,
        priority,
        timestamp: new Date()
      });
    } else if (role) {
      this.io.to(`admin:${role}`).emit('admin_notification', {
        type,
        message,
        priority,
        timestamp: new Date()
      });
    } else {
      this.io.to('admin:all').emit('admin_notification', {
        type,
        message,
        priority,
        timestamp: new Date()
      });
    }
  }

  // ==================== SUBSCRIPTION HANDLING ====================
  private handleSubscribeUpdates(socket: Socket, data: any): void {
    const { channels } = data;
    const user = (socket as any).user;
    
    channels.forEach((channel: string) => {
      if (this.canSubscribeToChannel(user, channel)) {
        socket.join(channel);
        Logger.info(`User subscribed to channel: ${user.userId} -> ${channel}`);
      }
    });
    
    socket.emit('subscribed', { channels });
  }

  private handleUnsubscribeUpdates(socket: Socket, data: any): void {
    const { channels } = data;
    const user = (socket as any).user;
    
    channels.forEach((channel: string) => {
      socket.leave(channel);
      Logger.info(`User unsubscribed from channel: ${user.userId} -> ${channel}`);
    });
    
    socket.emit('unsubscribed', { channels });
  }

  // ==================== UTILITY METHODS ====================
  private handlePing(socket: Socket): void {
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.lastActivity = new Date();
      socket.emit('pong', { timestamp: new Date() });
    }
  }

  private handleError(socket: Socket, error: any): void {
    const user = (socket as any).user;
    Logger.error(`WebSocket error for user ${user?.userId}:`, error);
    
    socket.emit('error', {
      message: 'WebSocket error occurred',
      timestamp: new Date()
    });
  }

  private sendToUser(userId: string, event: string, data: any): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets && userSockets.length > 0) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  private async sendPendingNotifications(userId: string): Promise<void> {
    try {
      // Fetch pending notifications from Redis
      const pendingKey = `pending_notifications:${userId}`;
      const notifications = await this.redis.lrange(pendingKey, 0, -1);
      
      if (notifications.length > 0) {
        notifications.forEach(notification => {
          try {
            const data = JSON.parse(notification);
            this.sendToUser(userId, 'pending_notification', data);
          } catch (error) {
            Logger.error('Error parsing pending notification:', error);
          }
        });
        
        // Clear pending notifications
        await this.redis.del(pendingKey);
      }
    } catch (error) {
      Logger.error('Error sending pending notifications:', error);
    }
  }

  private canJoinRoom(user: any, roomId: string, roomType: string): boolean {
    // Implement room access control logic
    if (roomType === 'admin' && user.userType !== 'admin') {
      return false;
    }
    
    if (roomId.startsWith('user:') && !roomId.includes(user.userId) && user.userType !== 'admin') {
      return false;
    }
    
    return true;
  }

  private canSubscribeToChannel(user: any, channel: string): boolean {
    // Implement channel subscription access control
    if (channel.startsWith('admin:') && user.userType !== 'admin') {
      return false;
    }
    
    if (channel.startsWith('user:') && !channel.includes(user.userId) && user.userType !== 'admin') {
      return false;
    }
    
    return true;
  }

  private startCleanupInterval(): void {
    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
      
      this.connectedUsers.forEach((userInfo, socketId) => {
        if (now.getTime() - userInfo.lastActivity.getTime() > inactiveThreshold) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
          this.connectedUsers.delete(socketId);
        }
      });
    }, 5 * 60 * 1000);
  }

  // ==================== PUBLIC API ====================
  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public broadcastToAdmins(event: string, data: any): void {
    this.io.to('admin:all').emit(event, data);
  }

  public broadcastToRole(role: string, event: string, data: any): void {
    this.io.to(`admin:${role}`).emit(event, data);
  }

  public sendToSpecificUser(userId: string, event: string, data: any): void {
    this.sendToUser(userId, event, data);
  }

  public getConnectedUsers(): IWebSocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.length || 0;
  }

  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  public getRoomMembers(roomId: string): string[] {
    return this.rooms.get(roomId)?.members || [];
  }

  public async publishToRedis(channel: string, data: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(data));
  }
}

export default WebSocketManager;

