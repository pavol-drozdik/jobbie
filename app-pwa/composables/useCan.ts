/**

 * UI-only permission hints. Backend must enforce all authorization.

 */

export type CanAction =

  | 'job.publish'

  | 'job.edit'

  | 'companyAd.publish'

  | 'companyAd.edit'

  | 'billing.manage'

  | 'credits.buy'

  | 'cvDatabase.view'

  | 'applicants.manage'



export function useCan() {

  const { user, isCustomer, isProvider } = useAuth()



  function can(action: CanAction): boolean {

    if (!user.value) return false



    switch (action) {

      case 'job.publish':

      case 'job.edit':

      case 'cvDatabase.view':

      case 'applicants.manage':

        return isCustomer.value

      case 'companyAd.publish':

      case 'companyAd.edit':

        return isProvider.value

      case 'billing.manage':

      case 'credits.buy':

        return isCustomer.value || isProvider.value

      default:

        return false

    }

  }



  return { can }

}

