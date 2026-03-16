import { StripeProvider } from '@stripe/stripe-react-native';
import { ReactNode } from 'react';

const publishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function StripeRoot({ children }: { children: ReactNode }) {
  // #region agent log
  fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'StripeRoot.native:render',message:'StripeRoot render',hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return (
    <StripeProvider publishableKey={publishableKey}>
      {children}
    </StripeProvider>
  );
}
