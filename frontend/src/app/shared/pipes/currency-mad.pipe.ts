import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyMad',
  standalone: true
})
export class CurrencyMadPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0.00 MAD';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00 MAD';
    return `${num.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
  }
}
