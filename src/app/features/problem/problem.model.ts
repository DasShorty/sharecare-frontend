import { TimeOptions } from '@features/time/time.model';
import { PaymentOptions } from '@features/payment/payment.model';
import { User } from '@features/user/user.model';
import { Location } from '@features/location/location.model';

export interface Problem {
  id: number;
  name: string;
  description: string;
  type: ProblemType;
  time: TimeOptions;
  isLocationBound: boolean;
  location: Location;
  payment: PaymentOptions;
  providers: User[];
  searchers: User[];
  timeLabel?: string;
  paymentLabel?: string;
}

export enum ProblemType {
  Resource = 0,
  Service = 1,
}
