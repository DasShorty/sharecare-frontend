import { inject, Injectable } from '@angular/core';
import { Problem } from '@features/problem/problem.model';
import { HttpClient } from '@angular/common/http';
import { ProblemStateService } from '@features/problem/problem-state.service';
import { environment } from '@environments/environment';
import { from, Observable, tap } from 'rxjs';
import { LocationService } from '@features/location/location.service';
import { Location } from '@features/location/location.model';
import { FixedTime, RangeTime, TimeType } from '@features/time/time.model';
import {
  CustomPayment,
  FreePayment,
  MoneyPayment,
  PaymentType,
} from '@features/payment/payment.model';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProblemService {
  private readonly httpClient = inject(HttpClient);
  private readonly problemStateService = inject(ProblemStateService);
  private readonly locationService = inject(LocationService);

  private readonly getAllProblemsEndpoint = `${environment.backendUrl}problems/GETAllProblems`;
  private readonly createProblemsEndpoint = `${environment.backendUrl}problems/POSTCreateProblems`;

  constructor() {
    void this.loadProblemsRemote().subscribe({
      error: (error: unknown) => console.error('Failed to load problems:', error),
    });
  }

  getProblems() {
    return this.problemStateService.getProblems();
  }

  loadProblemsRemote() {
    return this.httpClient
      .get<Problem[]>(this.getAllProblemsEndpoint)
      .pipe(tap((problems) => this.problemStateService.setProblems(problems)));
  }

  createAndSubmitProblem(
    formValue: Record<string, unknown>,
    selectedLocation?: Location | null,
  ): Observable<Problem> {
    const buildProblem = async (): Promise<Problem> => {
      let location: Location | null = selectedLocation ?? null;

      if (!location) {
        const manualAddress = (formValue['manualAddress'] as string | undefined)?.trim();

        if (!manualAddress) {
          throw new Error('Manual address is required when no location is selected');
        }

        const match = await this.locationService.geocodeAddress(manualAddress);
        location = {
          id: Date.now(),
          name: match.display_name,
          address: match.display_name,
          corLat: match.lat,
          corLon: match.lon,
        };
      }

      // Time
      let timeObj: FixedTime | RangeTime;
      const timeType = formValue['timeType'] as TimeType | undefined;

      if (timeType === TimeType.Fixed) {
        const fixedRaw = formValue['fixedTime'] as string | Date | undefined;
        const fixedTime = fixedRaw ? new Date(fixedRaw as any) : new Date();
        timeObj = {
          id: Date.now(),
          type: TimeType.Fixed,
          time: fixedTime,
        } as FixedTime;
      } else {
        const startRaw = formValue['startTime'] as string | Date | undefined;
        const endRaw = formValue['endTime'] as string | Date | undefined;
        const startTime = startRaw ? new Date(startRaw as any) : new Date();
        const endTime = endRaw ? new Date(endRaw as any) : new Date();
        timeObj = {
          id: Date.now(),
          type: TimeType.Range,
          startTime,
          endTime,
        } as RangeTime;
      }

      // Payment
      let paymentObj: FreePayment | MoneyPayment | CustomPayment;
      const paymentType = formValue['paymentType'] as PaymentType | undefined;

      if (paymentType === PaymentType.Free) {
        paymentObj = { id: Date.now(), type: PaymentType.Free } as FreePayment;
      } else if (paymentType === PaymentType.Money) {
        const amount = Number(formValue['moneyAmount'] ?? 0) || 0;
        paymentObj = { id: Date.now(), type: PaymentType.Money, amount } as MoneyPayment;
      } else {
        const customText = (formValue['customPaymentText'] as string | undefined) ?? '';
        paymentObj = { id: Date.now(), type: PaymentType.Custom, customText } as CustomPayment;
      }

      // Labels
      const nf = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
      let paymentLabel: string | undefined;
      if (paymentObj.type === PaymentType.Free) paymentLabel = 'Kostenlos';
      else if (paymentObj.type === PaymentType.Money)
        paymentLabel = nf.format((paymentObj as MoneyPayment).amount ?? 0);
      else paymentLabel = (paymentObj as CustomPayment).customText || '<custom>';

      const timeLabel = (() => {
        if ((timeObj as FixedTime).type === TimeType.Fixed) {
          const t = (timeObj as FixedTime).time;
          return t.toLocaleString('de-DE');
        }
        if ((timeObj as RangeTime).type === TimeType.Range) {
          const s = (timeObj as RangeTime).startTime;
          const e = (timeObj as RangeTime).endTime;
          return `${s.toLocaleString('de-DE')} — ${e.toLocaleString('de-DE')}`;
        }
        return undefined;
      })();

      return {
        id: -1,
        name: String(formValue['name'] ?? ''),
        description: String(formValue['description'] ?? ''),
        type: (formValue['type'] as any) ?? 0,
        isLocationBound: true,
        location: location!,
        time: timeObj,
        payment: paymentObj,
        providers: [],
        searchers: [],
        timeLabel,
        paymentLabel,
      };
    };

    // Build problem asynchronously (may perform geocoding) and then POST
    return from(buildProblem()).pipe(switchMap((p) => this.createProblemRemote(p)));
  }

  createProblemRemote(problem: Problem) {
    return this.httpClient
      .post<Problem>(this.createProblemsEndpoint, problem)
      .pipe(tap((createdProblem) => this.problemStateService.appendProblem(createdProblem)));
  }
}
