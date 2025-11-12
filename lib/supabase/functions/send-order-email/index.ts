import { createClient } from '@/lib/supabase/client'

type EmailNotificationType = 
  | 'new_order_seller' 
  | 'order_confirmation_buyer' 
  | 'delivery_code' 
  | 'payment_released'

export class EmailNotificationService {
  private supabase = createClient()

  /**
   * Send order notification email
   */
  async sendOrderEmail(
    type: EmailNotificationType,
    orderId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await this.supabase.functions.invoke('send-order-email', {
        body: { type, orderId }
      })

      if (error) {
        console.error('Error sending email:', error)
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Email sent successfully' }
    } catch (error) {
      console.error('Error invoking email function:', error)
      return { success: false, message: 'Failed to send email' }
    }
  }

  /**
   * Send new order notification to seller
   */
  async notifySellerNewOrder(orderId: string) {
    return this.sendOrderEmail('new_order_seller', orderId)
  }

  /**
   * Send order confirmation to buyer
   */
  async notifyBuyerOrderConfirmation(orderId: string) {
    return this.sendOrderEmail('order_confirmation_buyer', orderId)
  }

  /**
   * Send delivery code to both buyer and seller
   */
  async notifyDeliveryCode(orderId: string) {
    return this.sendOrderEmail('delivery_code', orderId)
  }

  /**
   * Notify payment release to seller
   */
  async notifyPaymentReleased(orderId: string) {
    return this.sendOrderEmail('payment_released', orderId)
  }

  /**
   * Send all initial order notifications (seller + buyer)
   * Call this after successful order creation and payment
   */
  async sendInitialOrderNotifications(orderId: string) {
    // Send to seller first
    const sellerResult = await this.notifySellerNewOrder(orderId)
    
    // Then to buyer
    const buyerResult = await this.notifyBuyerOrderConfirmation(orderId)

    // Send delivery code
    const deliveryCodeResult = await this.notifyDeliveryCode(orderId)

    return {
      seller: sellerResult,
      buyer: buyerResult,
      deliveryCode: deliveryCodeResult
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService()

// Helper functions for common notification scenarios

/**
 * Call this after order is created and payment is verified
 */
export async function sendNewOrderNotifications(orderId: string) {
  const service = new EmailNotificationService()
  return service.sendInitialOrderNotifications(orderId)
}

/**
 * Call this when delivery is confirmed
 */
export async function sendDeliveryConfirmedNotifications(orderId: string) {
  const service = new EmailNotificationService()
  return service.notifyPaymentReleased(orderId)
}