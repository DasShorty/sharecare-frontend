export interface Payment {
  id: number;
  type: PaymentType;
}

export enum PaymentType {
  Free = 0,
  Money = 1,
  Custom = 2,
}

export interface MoneyPayment extends Payment {
  amount: number;
  type: PaymentType.Money;
}

export interface FreePayment extends Payment {
  type: PaymentType.Free;
}

export interface CustomPayment extends Payment {
  customText: string;
  type: PaymentType.Custom;
}

export type PaymentOptions = FreePayment | MoneyPayment | CustomPayment;
