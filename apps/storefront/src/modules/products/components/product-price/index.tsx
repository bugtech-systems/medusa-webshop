import {formatPrice, calculateDiscount } from "@lib/formatters/prices"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
  membership = "nonmember",
  currencyCode = "aud"
}: {
  product: any
  variant?: HttpTypes.StoreProductVariant
  membership?: "member" | "student" | "nonmember"
  currencyCode: any
}) {
  const { cheapestPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const metadata = product.metadata || {}
  
  // Prices in cents
  const prices = {
    nonmember: metadata.nonmember ? Number(metadata.nonmember) : 0,
    member: metadata.member ? Number(metadata.member) : 0,
    student: metadata.student ? Number(metadata.student) : 0,
  }

  // Determine user's price
  const userPrice = membership === "member" 
    ? (prices.member || prices.nonmember)
    : membership === "student"
    ? (prices.student || prices.nonmember)
    : prices.nonmember

  // Calculate savings
  const savings = membership !== "nonmember" && prices.nonmember && userPrice < prices.nonmember
    ? {
        amount: prices.nonmember - userPrice,
        percentage: calculateDiscount(prices.nonmember, userPrice)
      }
    : null




  // if (!cheapestPrice) {
  //   return <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
  // }



  return (
    <div className="space-y-4 mb-5">
      {/* User's Price */}
      <div>

        <div className="font-medium text-md text-dark mb-1">
          {membership !== "nonmember" ? `${membership.charAt(0).toUpperCase() + membership.slice(1)} Price` : "Price"}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-gray-900">
            {formatPrice(userPrice, currencyCode)}
          </div>
          {savings && (
            <div className="text-sm text-green-600">
              Save {savings.percentage}%
            </div>
          )}
        </div>
        {savings && (
          <div className="text-sm text-gray-500 mt-1">
            <span className="line-through mr-2">{formatPrice(prices.nonmember, currencyCode)}</span>
            Regular price
          </div>
        )}
      </div>

      {/* Other Available Prices */}
      {(prices.member || prices.student) && (
        <div className="pt-4 border-t border-gray-200">
          <div className="font-medium text-sm text-dark mb-2">Available pricing:</div>
          <div className="space-y-2">
            {/* Regular */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700 w-full">Regular</span>
              <span >{formatPrice(prices.nonmember, currencyCode)}</span>
              <span className="w-full ml-4"></span>
            </div>
            
            {/* Member */}
            {prices.member && (
              <div className={`flex justify-between items-center ${
                membership === "member" ? "text-blue-600 font-bold" : ""
              }`}>
                <span className="text-gray-700 w-full">Member</span>
                <span>
                  {formatPrice(prices.member, currencyCode)}
                </span>
                {prices.nonmember && prices.member < prices.nonmember ? (
                    <span className={`text-xs ${membership == 'member' ? 'text-green' : ''} text-left w-full ml-3`}>
                      saves {formatPrice(Number(prices.nonmember - prices.member))}
                    </span>
                  ) : <span className="w-full"></span>}   
                
    
              </div>
            )}
            
            {/* Student */}
            {prices.student > 0 && (
              <div className={`flex justify-between items-center ${
                membership === "student" ? "text-green-600 font-bold" : ""
              }`}>
                <span className="w-full">Student</span>
                <span>
                  {formatPrice(prices.student, currencyCode)}
                </span>
                {prices.nonmember && prices.student < prices.nonmember ? (
                    <span className={`text-xs ${membership == 'student' ? 'text-green' : ''} ml-3 text-left w-full`}>
                      saves {formatPrice(Number(prices.nonmember - prices.student))}
                    </span>
                  ) : <span className="w-full"></span> }

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}