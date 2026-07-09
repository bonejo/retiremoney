import { Page } from '../components/layout/Layout'
import { usePropertyStore } from '../store/propertyStore'
import { useInvestmentStore } from '../store/investmentStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import { buildEstate } from '../utils/estateCalc'
import { formatCurrency } from '../utils/format'
import { useT } from '../i18n'

export default function Estate() {
  const t = useT()
  const properties = usePropertyStore((s) => s.properties)
  const investments = useInvestmentStore((s) => s.investments)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const province = useProfileStore((s) => s.profile?.province ?? 'BC')
  const { rows, totals } = buildEstate(properties, investments, assumptions, province)

  return (
    <Page title="Estate">
      <p className="mb-4 text-sm text-slate-500">
        {t('Based on current market values (future-value projection is Phase 3). A TFSA with a named beneficiary bypasses probate entirely.')}
      </p>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">{t('Add properties or investments to see the estate analysis.')}</div>
      ) : (
        <div className="card overflow-x-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">{t('Asset')}</th>
                <th className="py-2 pr-4">{t('Market value')}</th>
                <th className="py-2 pr-4">{t('Capital gains tax')}</th>
                <th className="py-2 pr-4">{t('Probate fee')}</th>
                <th className="py-2 pr-4">{t('Net to heirs')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 pr-4 font-medium">{r.label.replace(' (principal residence)', t(' (principal residence)'))}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.marketValue)}</td>
                  <td className="py-2 pr-4 text-rose-600">{formatCurrency(r.capitalGainsTax)}</td>
                  <td className="py-2 pr-4 text-rose-600">{formatCurrency(r.probate)}</td>
                  <td className="py-2 pr-4 font-medium text-emerald-700">{formatCurrency(r.netToHeir)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="py-2 pr-4">{t(totals.label)}</td>
                <td className="py-2 pr-4">{formatCurrency(totals.marketValue)}</td>
                <td className="py-2 pr-4 text-rose-600">{formatCurrency(totals.capitalGainsTax)}</td>
                <td className="py-2 pr-4 text-rose-600">{formatCurrency(totals.probate)}</td>
                <td className="py-2 pr-4 text-emerald-700">{formatCurrency(totals.netToHeir)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Page>
  )
}
