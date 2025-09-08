import { TransitOption, Ticket } from '../types';
import { config } from '../config';

export interface PurchaseResult {
  success: boolean;
  ticket?: Ticket;
  error?: string;
  errorCode?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'mobile_payment' | 'transit_card';
  name: string;
  lastFour?: string;
  isDefault: boolean;
}

export class TicketPurchaseService {
  private static instance: TicketPurchaseService;
  
  private constructor() {}

  public static getInstance(): TicketPurchaseService {
    if (!TicketPurchaseService.instance) {
      TicketPurchaseService.instance = new TicketPurchaseService();
    }
    return TicketPurchaseService.instance;
  }

  // 购买车票
  public async purchaseTicket(
    transitOption: TransitOption, 
    paymentMethod?: PaymentMethod
  ): Promise<PurchaseResult> {
    try {
      console.log('开始购票流程:', {
        line: transitOption.line,
        stopName: transitOption.stopName,
        arrivalTime: transitOption.arrivalTime,
      });

      // 1. 验证交通选项
      const validationResult = this.validateTransitOption(transitOption);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: 'INVALID_OPTION'
        };
      }

      // 2. 检查是否已经有有效车票
      const existingTicket = await this.findExistingTicket(transitOption);
      if (existingTicket) {
        console.log('找到已有有效车票:', existingTicket.id);
        return {
          success: true,
          ticket: existingTicket
        };
      }

      // 3. 计算票价
      const ticketPrice = this.calculateTicketPrice(transitOption);

      // 4. 选择支付方式
      const selectedPayment = paymentMethod || await this.getDefaultPaymentMethod();
      if (!selectedPayment) {
        return {
          success: false,
          error: '没有可用的支付方式',
          errorCode: 'NO_PAYMENT_METHOD'
        };
      }

      // 5. 调用NJ Transit API购票
      const purchaseResponse = await this.callPurchaseAPI(
        transitOption, 
        ticketPrice, 
        selectedPayment
      );

      if (!purchaseResponse.success) {
        return {
          success: false,
          error: purchaseResponse.error,
          errorCode: purchaseResponse.errorCode
        };
      }

      // 6. 创建车票对象
      const ticket: Ticket = {
        id: purchaseResponse.ticketId || `ticket-${Date.now()}`,
        userId: 'current-user', // TODO: 从认证上下文获取
        transitOption,
        purchaseTime: new Date(),
        status: 'purchased',
        qrCode: purchaseResponse.qrCode,
        price: ticketPrice,
        validUntil: this.calculateValidUntil(transitOption),
      };

      console.log('购票成功:', ticket.id);
      
      return {
        success: true,
        ticket
      };

    } catch (error) {
      console.error('购票失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '购票失败',
        errorCode: 'PURCHASE_FAILED'
      };
    }
  }

  // 验证交通选项
  private validateTransitOption(option: TransitOption): { isValid: boolean; error?: string } {
    const now = new Date();
    const timeDiff = option.arrivalTime.getTime() - now.getTime();
    
    // 检查是否已过时
    if (timeDiff < -60000) { // 1分钟前
      return {
        isValid: false,
        error: '该班次已经过时'
      };
    }

    // 检查是否太远的未来
    if (timeDiff > 24 * 60 * 60 * 1000) { // 24小时后
      return {
        isValid: false,
        error: '只能购买24小时内的车票'
      };
    }

    return { isValid: true };
  }

  // 查找已有的有效车票
  private async findExistingTicket(transitOption: TransitOption): Promise<Ticket | null> {
    try {
      // 这里应该查询本地存储或API
      // 模拟逻辑：检查是否有相同路线在相近时间的有效车票
      
      // 简化实现：总是返回null（没有已有车票）
      return null;
    } catch (error) {
      console.error('查找已有车票失败:', error);
      return null;
    }
  }

  // 计算票价
  private calculateTicketPrice(transitOption: TransitOption): number {
    // 简化的票价计算逻辑
    const basePrice = {
      bus: 3.50,
      train: 5.00,
      lightrail: 2.75
    };

    const price = basePrice[transitOption.type] || 3.50;
    
    // 根据距离调整价格（简化逻辑）
    const distanceKm = transitOption.distanceToDestination / 1000;
    if (distanceKm > 20) {
      return price * 1.5; // 长途加价
    } else if (distanceKm > 10) {
      return price * 1.2; // 中途加价
    }
    
    return price;
  }

  // 获取默认支付方式
  private async getDefaultPaymentMethod(): Promise<PaymentMethod | null> {
    try {
      // 这里应该从用户设置或API获取
      // 模拟返回一个默认支付方式
      return {
        id: 'default-card',
        type: 'credit_card',
        name: '默认信用卡',
        lastFour: '1234',
        isDefault: true
      };
    } catch (error) {
      console.error('获取支付方式失败:', error);
      return null;
    }
  }

  // 调用购票API
  private async callPurchaseAPI(
    transitOption: TransitOption,
    price: number,
    paymentMethod: PaymentMethod
  ): Promise<{
    success: boolean;
    ticketId?: string;
    qrCode?: string;
    error?: string;
    errorCode?: string;
  }> {
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 模拟API响应
      const mockResponse = {
        success: Math.random() > 0.1, // 90%成功率
        ticketId: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        qrCode: this.generateMockQRCode(transitOption),
        transactionId: `txn_${Date.now()}`,
      };

      if (!mockResponse.success) {
        return {
          success: false,
          error: '支付失败，请稍后重试',
          errorCode: 'PAYMENT_FAILED'
        };
      }

      return {
        success: true,
        ticketId: mockResponse.ticketId,
        qrCode: mockResponse.qrCode
      };

      // 真实实现应该调用NJ Transit API
      /*
      const apiUrl = `${config.njTransitApiUrl}/tickets/purchase`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.njTransitApiKey}`,
        },
        body: JSON.stringify({
          route: transitOption.line,
          stop: transitOption.stopName,
          departure_time: transitOption.arrivalTime.toISOString(),
          payment_method: paymentMethod.id,
          amount: price,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'API调用失败',
          errorCode: data.error_code || 'API_ERROR'
        };
      }

      return {
        success: true,
        ticketId: data.ticket_id,
        qrCode: data.qr_code
      };
      */

    } catch (error) {
      console.error('购票API调用失败:', error);
      return {
        success: false,
        error: '网络错误，请检查连接',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  // 生成模拟二维码
  private generateMockQRCode(transitOption: TransitOption): string {
    const qrData = {
      type: 'nj_transit_ticket',
      line: transitOption.line,
      stop: transitOption.stopName,
      departure: transitOption.arrivalTime.toISOString(),
      ticket_id: `ticket_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    // 模拟二维码数据（实际应用中会是真实的二维码图片或数据）
    return `data:text/plain;base64,${btoa(JSON.stringify(qrData))}`;
  }

  // 计算车票有效期
  private calculateValidUntil(transitOption: TransitOption): Date {
    // 车票通常在预计到达时间后2小时过期
    const validUntil = new Date(transitOption.arrivalTime);
    validUntil.setHours(validUntil.getHours() + 2);
    return validUntil;
  }

  // 退票
  public async refundTicket(ticketId: string): Promise<{
    success: boolean;
    refundAmount?: number;
    error?: string;
  }> {
    try {
      // 模拟退票API调用
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 模拟退票成功（80%成功率）
      const success = Math.random() > 0.2;
      
      if (success) {
        return {
          success: true,
          refundAmount: 3.50 // 模拟退款金额
        };
      } else {
        return {
          success: false,
          error: '车票已使用或已过期，无法退款'
        };
      }
    } catch (error) {
      console.error('退票失败:', error);
      return {
        success: false,
        error: '退票失败，请稍后重试'
      };
    }
  }

  // 获取票价信息
  public getTicketPrice(transitOption: TransitOption): number {
    return this.calculateTicketPrice(transitOption);
  }

  // 验证车票
  public async validateTicket(ticketId: string): Promise<{
    isValid: boolean;
    ticket?: Ticket;
    error?: string;
  }> {
    try {
      // 这里应该调用API验证车票
      // 模拟验证逻辑
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        isValid: true,
        // ticket: mockTicket
      };
    } catch (error) {
      console.error('验证车票失败:', error);
      return {
        isValid: false,
        error: '无法验证车票'
      };
    }
  }
}

// 导出单例实例
export const ticketPurchaseService = TicketPurchaseService.getInstance();