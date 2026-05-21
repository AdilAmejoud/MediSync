import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    const wsUrl = environment.production ? window.location.origin : 'http://localhost:3004';
    this.socket = io(wsUrl, { transports: ['websocket', 'polling'] });
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  off(event: string) {
    this.socket.off(event);
  }

  emit(event: string, data?: any) {
    this.socket.emit(event, data);
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }
}
