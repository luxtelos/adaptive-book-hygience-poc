/**
 * Simple toast notification system for LLM provider switching feedback
 */

import { logger } from '@/lib/logger';

export interface ToastOptions {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
}

class ToastManager {
  private container: HTMLDivElement | null = null;

  constructor() {
    this.initContainer();
  }

  private initContainer() {
    if (typeof document === 'undefined') return;
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(options: ToastOptions) {
    if (!this.container) {
      this.initContainer();
    }
    
    if (!this.container) {
      // Fallback to console if DOM is not available
      logger.info(`Toast notification: ${options.message}`);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type || 'info'}`;
    
    // Style based on type
    const colors = {
      info: '#3b82f6',     // blue
      warning: '#f59e0b',  // amber
      error: '#ef4444',    // red
      success: '#10b981'   // green
    };
    
    const bgColors = {
      info: '#eff6ff',
      warning: '#fffbeb',
      error: '#fef2f2',
      success: '#f0fdf4'
    };
    
    const type = options.type || 'info';
    
    toast.style.cssText = `
      padding: 12px 20px;
      background: ${bgColors[type]};
      color: ${colors[type]};
      border: 1px solid ${colors[type]};
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
    `;

    // Add icon based on type
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };
    
    toast.innerHTML = `
      <span style="font-size: 18px;">${icons[type]}</span>
      <span>${options.message}</span>
    `;
    
    this.container.appendChild(toast);
    
    // Log to console as well
    logger.info(`Toast ${type}: ${options.message}`);
    
    // Auto-remove after duration
    const duration = options.duration || 5000;
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }

  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration });
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }
}

// Add CSS animations if not already present
if (typeof document !== 'undefined' && !document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Export singleton instance
export const toast = new ToastManager();