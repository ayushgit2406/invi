import { inr } from './inr'

export function formatInrAmount(value: string | number) {
  return `${inr}${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
