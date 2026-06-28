import {
  expandableRefId,
  getInvoicePaymentIntentClientSecret,
  getSetupIntentClientSecretFromRef,
  getSetupIntentId,
} from './stripe-api-compat';
import type { Invoice } from './stripe-types';

describe('stripe-api-compat', () => {
  describe('expandableRefId', () => {
    it('reads string id', () => {
      expect(expandableRefId('seti_abc')).toBe('seti_abc');
    });

    it('reads object id', () => {
      expect(expandableRefId({ id: 'in_123' })).toBe('in_123');
    });
  });

  describe('getSetupIntentId', () => {
    it('reads string ref', () => {
      expect(getSetupIntentId('seti_abc')).toBe('seti_abc');
    });

    it('reads expanded object without client_secret', () => {
      expect(getSetupIntentId({ id: 'seti_xyz' })).toBe('seti_xyz');
    });
  });

  describe('getSetupIntentClientSecretFromRef', () => {
    it('returns secret from expanded object', () => {
      expect(
        getSetupIntentClientSecretFromRef({
          id: 'seti_abc',
          client_secret: 'seti_secret',
        }),
      ).toBe('seti_secret');
    });

    it('returns null for string ref', () => {
      expect(getSetupIntentClientSecretFromRef('seti_abc')).toBeNull();
    });

    it('returns null when expanded object lacks client_secret', () => {
      expect(getSetupIntentClientSecretFromRef({ id: 'seti_abc' })).toBeNull();
    });
  });

  describe('getInvoicePaymentIntentClientSecret', () => {
    it('uses confirmation_secret when PI is not expanded', () => {
      const invoice = {
        confirmation_secret: { client_secret: 'pi_secret_from_invoice' },
      } as unknown as Invoice;
      expect(getInvoicePaymentIntentClientSecret(invoice)).toBe(
        'pi_secret_from_invoice',
      );
    });
  });
});
