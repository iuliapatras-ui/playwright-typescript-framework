import type { BillingAddress } from '../pages/CheckoutPage';

/**
 * A billing address the shop's postcode lookup knows: after country, postal code and
 * house number it fills in street, city and state on its own.
 */
export const viennaAddress: BillingAddress = {
  country: 'Austria',
  postalCode: '1010',
  houseNumber: '1',
};
