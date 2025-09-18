export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.log(`[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, data?: any): void {
    console.error(`[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  debug(message: string, data?: any): void {
    console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

