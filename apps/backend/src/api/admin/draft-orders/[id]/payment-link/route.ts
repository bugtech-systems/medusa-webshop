import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import Stripe from "stripe";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const query = req.scope.resolve("query");
  const paymentService = req.scope.resolve("payment") as any;
  const logger = req.scope.resolve("logger") as any;
  const actionService: any = req.scope.resolve("actionEngine");

  try {
    // Fetch order with payment collections
    const { data: orders } = await query.graph({
      entity: "order",
     fields: [
  "id",
  "status",
  "created_at",
  "canceled_at",
  "email",
  "display_id",
  "currency_code",
  "metadata",
  "total",
  "credit_line_total",
  "item_subtotal",
  "item_total",
  "item_tax_total",
  "original_item_tax_total",
  "item_discount_total",
  "shipping_subtotal",
  "original_total",
  "original_tax_total",
  "subtotal",
  "discount_total",
  "discount_subtotal",
  "shipping_total",
  "shipping_tax_total",
  "original_shipping_tax_total",
  "shipping_discount_total",
  "tax_total",
  "refundable_total",
  "order_change",
  "customer",
  "items.*",
  "items.variant",
  "items.variant.product",
  "items.variant.options",
  "items.variant.manage_inventory",
  "items.variant.inventory_items.inventory",
  "items.variant.inventory_items.required_quantity",
  "summary",
  "shipping_address",
  "billing_address",
  "sales_channel",
  "promotions",
  "shipping_methods",
  "credit_lines",
  "fulfillments",
  "fulfillments.shipping_option.service_zone.fulfillment_set.type",
  "fulfillments.items",
  "fulfillments.labels",
  "payment_collections.*",
  "payment_collections.payment_sessions.*",
  "payment_collections.payments",
  "payment_collections.payments.refunds",
  "payment_collections.payments.refunds.refund_reason",
  "region.automatic_taxes"
],
      filters: { id },
    });

    const order = orders[0] as any;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Helper function to convert BigNumber to number
    const toNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value);
      if (value?.raw_?.value) return parseFloat(value.raw_.value);
      if (value?.value) return parseFloat(value.value);
      return 0;
    };

    // Extract totals from order
    const subtotal = toNumber(order.subtotal);
    const shippingTotal = toNumber(order.shipping_subtotal);
    const shippingTaxTotal = toNumber(order.shipping_tax_total);
    const taxTotal = toNumber(order.tax_total);
    const discountTotal = toNumber(order.discount_total);
    const orderTotal = toNumber(order?.total);
    const itemsTotal = toNumber(order?.item_total);

    logger.info(`Order totals - Subtotal: ${subtotal}, Shipping: ${shippingTotal}, Shipping Tax: ${shippingTaxTotal}, Tax: ${taxTotal}, Discount: ${discountTotal}`);

// Ensure payment collection exists
let paymentCollection = order.payment_collections?.[0];


// CHECK: If payment collection is already completed, don't proceed
if (paymentCollection && paymentCollection.status === "completed") {
  logger.info(`Payment collection ${paymentCollection.id} is already completed, skipping session creation`);
  
  // Find the completed payment session
  const completedSession = paymentCollection.payment_sessions?.find(
    (s: any) => s.status === "captured" || s.status === "authorized"
  );
  
  return res.status(400).json({
    error: "Order already has a completed payment",
    order_id: order.id,
    payment_collection_id: paymentCollection.id,
    payment_collection_status: paymentCollection.status,
    payment_session_id: completedSession?.id,
    message: "This order has already been paid for. Cannot generate a new payment link.",
  });
}

// CHECK: If payment collection exists but is not pending, handle accordingly
// if (paymentCollection && paymentCollection.status !== "pending") {
//   logger.warn(`Payment collection ${paymentCollection.id} has status ${paymentCollection.status}, expected pending`);
  
//   // If it's not completed but also not pending, we might still proceed
//   if (paymentCollection.status !== "pending" && paymentCollection.status !== "requires_action") {
//     return res.status(400).json({
//       error: `Payment collection is in ${paymentCollection.status} state`,
//       order_id: order.id,
//       payment_collection_id: paymentCollection.id,
//       payment_collection_status: paymentCollection.status,
//       message: "Cannot generate a new payment link for this order at this time.",
//     });
//   }
// }

// Find existing payment session that is not authorized/captured
let sessionData = paymentCollection?.payment_sessions?.find(
  (s: any) => s.status !== "authorized" && s.status !== "captured" && s.status !== "completed"
) as any;

if (!sessionData) {
  // If no valid session exists, create a new one
  let { data } = await actionService.stepAction(
    'create-session',
    {
      provider_id: "pp_stripe_stripe",
      amount: paymentCollection?.amount,
      payment_collection_id: paymentCollection?.id,
      status: "pending",
      raw_amount: paymentCollection?.raw_amount,
      currency_code: paymentCollection?.currency_code,
      data: {}
    }
  );

  sessionData = data;
  logger.info(`New payment session created: ${sessionData.id}`);
} else {
  logger.info(`Using existing payment session: ${sessionData.id} (status: ${sessionData.status})`);
}

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
      apiVersion: "2023-10-16" as any,
    }) as any;

    // Build line items
    const lineItems = [] as any;

    // 1. Add product items
    // let itemsTotal = 0;
    for (const item of order.items) {
      const unitPrice = toNumber(item.unit_price);
      const quantity = toNumber(item.quantity);
      const itemTotal = unitPrice * quantity;
      // itemsTotal += itemTotal;
      
      lineItems.push({
        price_data: {
          currency: order.currency_code,
          product_data: { 
            name: item.title,
            // description: item.metadata?.description || "",
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: quantity,
      });
    }

    logger.info(`Items total: ${itemsTotal}`);

    // 2. Add shipping as a separate line item with its tax included
    let calculatedTotal = itemsTotal;
    let shippingDisplayTotal = shippingTotal;
    
    if (shippingTotal > 0 && order.shipping_methods?.length > 0) {
      const shippingMethod = order.shipping_methods[0];
      const shippingTaxLines = shippingMethod.tax_lines || [];
      
      // Calculate shipping tax
      const shippingTaxAmount = shippingTaxLines.reduce((sum: number, tax: any) => {
        return sum + toNumber(tax.total);
      }, 0);
      
      // Shipping total with tax (if not already included)
      const shippingWithTax = shippingTotal + shippingTaxAmount;
      shippingDisplayTotal = shippingWithTax;
      
      lineItems.push({
        price_data: {
          currency: order.currency_code,
          product_data: { 
            name: "Shipping",
            description: shippingMethod.name || "Shipping cost",
            metadata: {
              shipping_method_id: shippingMethod.id,
              tax_rate: shippingTaxLines[0]?.rate?.toString() || "0",
            },
          },
          unit_amount: Math.round(shippingTotal * 100), // Include tax in shipping price
        },
        quantity: 1,
      });
      
      calculatedTotal += shippingWithTax;
      logger.info(`Added shipping: ${shippingWithTax} (base: ${shippingTotal}, tax: ${shippingTaxAmount})`);
    } else if (shippingTotal > 0) {
      // Fallback if no shipping method details
      lineItems.push({
        price_data: {
          currency: order.currency_code,
          product_data: { 
            name: "Shipping",
            description: "Shipping cost",
          },
          unit_amount: Math.round(shippingTotal * 100),
        },
        quantity: 1,
      });
      calculatedTotal += shippingTotal;
      logger.info(`Added shipping: ${shippingTotal}`);
    }

    // 3. Add tax if applicable (remaining tax not already included in shipping)
    const remainingTax = taxTotal 
    
    if (remainingTax > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency_code,
          product_data: { 
            name: "Tax",
            description: `Tax (${((taxTotal / (subtotal || 1)) * 100).toFixed(2)}%)`,
          },
          unit_amount: Math.round(taxTotal * 100),
        },
        quantity: 1,
      });
      calculatedTotal += taxTotal;
      logger.info(`Added remaining tax: ${taxTotal}`);
    }



    // 4. Add discount as a negative line item if applicable
    // if (discountTotal > 0) {
    //   // Note: Stripe doesn't accept negative amounts, so we need to use a different approach
    //   // Instead, we'll show discount in the description or use a coupon
    //   // For now, we'll add a note in the metadata and adjust product prices
      
    //   // Option: Add discount as a separate line with positive amount but different name
    //   lineItems.push({
    //     price_data: {
    //       currency: order.currency_code,
    //       product_data: { 
    //         name: "Discount Applied",
    //         description: `-${new Intl.NumberFormat('en-AU', { style: 'currency', currency: order.currency_code }).format(discountTotal / 100)} discount applied to order`,
    //       },
    //       unit_amount: 0, // $0 to show discount applied but not affect total
    //     },
    //     quantity: 1,
    //   });
      
    //   logger.info(`Added discount note: ${discountTotal}`);
    // }

    // 5. Verify final total
    const finalCalculatedTotal = lineItems.reduce((sum, item) => {
      return sum + (item.price_data.unit_amount * item.quantity);
    }, 0) / 100;

    logger.info(`Final calculated total: ${finalCalculatedTotal}, Order total: ${orderTotal}`);

    // // Check for total mismatch
    // if (Math.abs(finalCalculatedTotal - orderTotal) > 0.01) {
    //   logger.warn(`Total mismatch! Difference: ${finalCalculatedTotal - orderTotal}`);
      
    //   // Add adjustment to fix total
    //   const adjustment = orderTotal - finalCalculatedTotal;
    //   if (Math.abs(adjustment) > 0.01) {
    //     lineItems.push({
    //       price_data: {
    //         currency: order.currency_code,
    //         product_data: { 
    //           name: "Adjustment",
    //           description: "Order total adjustment",
    //         },
    //         unit_amount: Math.round(adjustment * 100),
    //       },
    //       quantity: 1,
    //     });
    //     logger.info(`Added adjustment of ${adjustment} to fix total`);
    //   }
    // }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      
      line_items: lineItems,
      
      success_url: `${process.env.STORE_FRONTEND_URL}/order/${order.id}/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.STORE_FRONTEND_URL}/order/${order.id}/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      
      client_reference_id: order.id,
      
      customer_email: order.email,
      
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
      
      phone_number_collection: {
        enabled: true,
      },
      
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          session_id: sessionData?.id
        },
        capture_method: "automatic",
      },
      
      metadata: {
        order_id: order.id,
        session_id: sessionData?.id
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      locale: "auto",
      allow_promotion_codes: true,
    });

    logger.info(`Stripe checkout session created: ${session.id}`, {
      orderId: order.id,
      totalAmount: session.amount_total,
      lineItemsCount: lineItems.length,
    });

    // Return response with detailed breakdown
    return res.status(200).json({
      order,
      order_id: order.id,
      order_summary: {
        items_total: itemsTotal / 100,
        shipping_total: shippingTotal / 100,
        shipping_tax: shippingTaxTotal / 100,
        tax_total: taxTotal / 100,
        discount_total: discountTotal / 100,
        total: orderTotal / 100,
        currency: order.currency_code,
      },
      calculation_breakdown: {
        items_total: itemsTotal,
        shipping_total: shippingTotal,
        shipping_with_tax: shippingDisplayTotal,
        calculated_total_before_tax: itemsTotal + shippingDisplayTotal,
        tax_added: remainingTax,
        discount_total: discountTotal,
        final_calculated_total: finalCalculatedTotal,
        order_total: orderTotal,
        difference: orderTotal - finalCalculatedTotal,
      },
      payment_link: session.url,
      stripe_session_id: session.id,
      expires_at: new Date(session.expires_at! * 1000).toISOString(),
    });

  } catch (err: any) {
    console.error("Error generating payment link:", err);
    return res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}