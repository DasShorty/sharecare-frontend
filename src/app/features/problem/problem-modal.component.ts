import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProblemStateService } from '@features/problem/problem-state.service';
import { Problem, ProblemType } from '@features/problem/problem.model';
import { FixedTime, RangeTime, TimeType } from '@features/time/time.model';
import {
  CustomPayment,
  FreePayment,
  MoneyPayment,
  PaymentType,
} from '@features/payment/payment.model';
import { Location } from '@features/location/location.model';
import { Select } from 'primeng/select';

@Component({
  selector: 'problem-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Select,
  ],
  template: `
    <p-dialog
      [(visible)]="isOpen"
      [header]="'Report a Problem'"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      (onHide)="onDialogHide()"
    >
      <form [formGroup]="problemForm" (ngSubmit)="onSubmit()">
        <!-- Name -->
        <div class="form-group">
          <label for="name" class="form-label">Problem Title *</label>
          <input
            id="name"
            pInputText
            type="text"
            formControlName="name"
            class="form-input"
            placeholder="Brief title of the problem"
          />
          @if (problemForm.get('name')?.invalid && problemForm.get('name')?.touched) {
            <small class="error-text">Title is required</small>
          }
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="description" class="form-label">Description *</label>
          <textarea
            id="description"
            pInputTextarea
            formControlName="description"
            class="form-input"
            rows="3"
            placeholder="Detailed description of the problem"
          ></textarea>
          @if (problemForm.get('description')?.invalid && problemForm.get('description')?.touched) {
            <small class="error-text">Description is required</small>
          }
        </div>

        <!-- Problem Type -->
        <div class="form-group">
          <label for="type" class="form-label">Problem Type *</label>
          <p-select
            id="type"
            [options]="problemTypes"
            formControlName="type"
            optionLabel="label"
            optionValue="value"
            class="form-input"
            placeholder="Select type"
          ></p-select>
        </div>

        <!-- Location -->
        <div class="form-group">
          <label class="form-label">Location *</label>
          <div class="location-controls">
            <button
              type="button"
              pButton
              label="Use Current Location"
              (click)="useCurrentLocation()"
              [disabled]="isDetectingLocation()"
              class="location-button"
            ></button>
            <input
              pInputText
              type="text"
              placeholder="Or enter address"
              formControlName="manualAddress"
              (change)="onAddressChange()"
              class="form-input"
            />
          </div>
          @if (selectedLocation(); as location) {
            <small class="success-text">Location: {{ location.name }}</small>
          }
        </div>

        <!-- Time Type -->
        <div class="form-group">
          <label class="form-label">Time Type *</label>
          <div class="radio-group">
            <div class="radio-item">
              <input
                type="radio"
                id="fixed-time"
                [value]="TimeType.Fixed"
                formControlName="timeType"
                (change)="onTimeTypeChange()"
              />
              <label for="fixed-time">Fixed Time</label>
            </div>
            <div class="radio-item">
              <input
                type="radio"
                id="range-time"
                [value]="TimeType.Range"
                formControlName="timeType"
                (change)="onTimeTypeChange()"
              />
              <label for="range-time">Time Range</label>
            </div>
          </div>
        </div>

        <!-- Fixed Time -->
        @if (problemForm.get('timeType')?.value === TimeType.Fixed) {
          <div class="form-group">
            <label for="fixed-date" class="form-label">Date & Time *</label>
            <input
              id="fixed-date"
              type="datetime-local"
              formControlName="fixedTime"
              class="form-input"
            />
          </div>
        }

        <!-- Range Time -->
        @if (problemForm.get('timeType')?.value === TimeType.Range) {
          <div class="form-group">
            <label for="start-date" class="form-label">Start Date & Time *</label>
            <input
              id="start-date"
              type="datetime-local"
              formControlName="startTime"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="end-date" class="form-label">End Date & Time *</label>
            <input
              id="end-date"
              type="datetime-local"
              formControlName="endTime"
              class="form-input"
            />
          </div>
        }

        <!-- Payment Type -->
        <div class="form-group">
          <label class="form-label">Payment Type *</label>
          <div class="radio-group">
            <div class="radio-item">
              <input
                type="radio"
                id="free-payment"
                [value]="PaymentType.Free"
                formControlName="paymentType"
                (change)="onPaymentTypeChange()"
              />
              <label for="free-payment">Free</label>
            </div>
            <div class="radio-item">
              <input
                type="radio"
                id="money-payment"
                [value]="PaymentType.Money"
                formControlName="paymentType"
                (change)="onPaymentTypeChange()"
              />
              <label for="money-payment">Money</label>
            </div>
            <div class="radio-item">
              <input
                type="radio"
                id="custom-payment"
                [value]="PaymentType.Custom"
                formControlName="paymentType"
                (change)="onPaymentTypeChange()"
              />
              <label for="custom-payment">Custom</label>
            </div>
          </div>
        </div>

        <!-- Money Amount -->
        @if (problemForm.get('paymentType')?.value === PaymentType.Money) {
          <div class="form-group">
            <label for="amount" class="form-label">Amount (€) *</label>
            <input
              id="amount"
              pInputNumber
              formControlName="moneyAmount"
              [min]="0"
              [max]="100000"
              [step]="0.01"
              class="form-input"
            />
          </div>
        }

        <!-- Custom Payment Text -->
        @if (problemForm.get('paymentType')?.value === PaymentType.Custom) {
          <div class="form-group">
            <label for="custom-payment-text" class="form-label">Payment Details *</label>
            <textarea
              id="custom-payment-text"
              pInputTextarea
              formControlName="customPaymentText"
              class="form-input"
              rows="2"
              placeholder="Describe the payment terms"
            ></textarea>
          </div>
        }

        <!-- Form Actions -->
        <div class="form-actions">
          <button
            type="button"
            pButton
            label="Cancel"
            (click)="onCancel()"
            class="cancel-button"
          ></button>
          <button
            type="submit"
            pButton
            label="Create Problem"
            [disabled]="!problemForm.valid || !selectedLocation() || isCreatingProblem()"
            class="submit-button"
          ></button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
      }

      .form-label {
        font-weight: 600;
        color: #111827;
        font-size: 0.95rem;
      }

      .form-input {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.625rem;
        font-size: 1rem;
        color: #111827;
      }

      textarea.form-input {
        font-family: inherit;
        resize: vertical;
      }

      .error-text {
        color: #dc2626;
        font-size: 0.85rem;
      }

      .success-text {
        color: #16a34a;
        font-size: 0.85rem;
      }

      .location-controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .location-button {
        width: 100%;
      }

      .radio-group {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .radio-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .radio-item input[type='radio'] {
        cursor: pointer;
      }

      .radio-item label {
        cursor: pointer;
        user-select: none;
      }

      .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
      }

      .cancel-button {
        background: #f3f4f6;
        color: #111827;
      }

      .submit-button {
        background: #2563eb;
        color: #ffffff;
      }

      ::ng-deep .p-dialog-content {
        padding: 2rem 1.5rem;
      }

      ::ng-deep .p-dropdown {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemModalComponent {
  private readonly problemStateService = inject(ProblemStateService);
  private readonly fb = inject(FormBuilder);

  isOpen = signal(false);
  readonly isCreatingProblem = signal(false);
  readonly isDetectingLocation = signal(false);
  readonly selectedLocation = signal<Location | null>(null);

  readonly TimeType = TimeType;
  readonly PaymentType = PaymentType;
  readonly problemTypes = [
    { label: 'Resource', value: ProblemType.Resource },
    { label: 'Service', value: ProblemType.Service },
  ];

  problemForm!: FormGroup;

  constructor() {
    this.problemForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      type: [ProblemType.Resource],
      timeType: [TimeType.Fixed],
      fixedTime: [null as Date | null],
      startTime: [null as Date | null],
      endTime: [null as Date | null],
      paymentType: [PaymentType.Free],
      moneyAmount: [0],
      customPaymentText: [''],
      manualAddress: [''],
    });
  }

  openModal(): void {
    this.isOpen.set(true);
  }

  onDialogHide(): void {
    this.resetForm();
  }

  onCancel(): void {
    this.isOpen.set(false);
    this.resetForm();
  }

  async useCurrentLocation(): Promise<void> {
    if (!('geolocation' in navigator)) {
      return;
    }

    this.isDetectingLocation.set(true);

    try {
      const coords = await this.getCurrentLocation();
      const location: Location = {
        id: Date.now(),
        name: 'Current Location',
        address: `${coords.latitude}, ${coords.longitude}`,
        corLat: coords.latitude.toString(),
        corLon: coords.longitude.toString(),
      };
      this.selectedLocation.set(location);
    } catch (error) {
      console.error('Failed to detect location:', error);
    } finally {
      this.isDetectingLocation.set(false);
    }
  }

  onAddressChange(): void {
    const address = this.problemForm.get('manualAddress')?.value?.trim();
    if (address) {
      const location: Location = {
        id: Date.now(),
        name: address,
        address: address,
        corLat: '0',
        corLon: '0',
      };
      this.selectedLocation.set(location);
    }
  }

  onTimeTypeChange(): void {
    this.problemForm.patchValue({
      fixedTime: null,
      startTime: null,
      endTime: null,
    });
  }

  onPaymentTypeChange(): void {
    this.problemForm.patchValue({
      moneyAmount: 0,
      customPaymentText: '',
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.problemForm.valid || !this.selectedLocation()) {
      return;
    }

    this.isCreatingProblem.set(true);

    try {
      const formValue = this.problemForm.getRawValue();
      const location = this.selectedLocation()!;

      // Create time object
      let timeObj;
      if (formValue.timeType === TimeType.Fixed) {
        const fixedTime = formValue.fixedTime ? new Date(formValue.fixedTime) : new Date();
        timeObj = {
          id: Date.now(),
          type: TimeType.Fixed,
          time: fixedTime,
        } as FixedTime;
      } else {
        const startTime = formValue.startTime ? new Date(formValue.startTime) : new Date();
        const endTime = formValue.endTime ? new Date(formValue.endTime) : new Date();
        timeObj = {
          id: Date.now(),
          type: TimeType.Range,
          startTime,
          endTime,
        } as RangeTime;
      }

      // Create payment object
      let paymentObj;
      if (formValue.paymentType === PaymentType.Free) {
        paymentObj = {
          id: Date.now(),
          type: PaymentType.Free,
        } as FreePayment;
      } else if (formValue.paymentType === PaymentType.Money) {
        paymentObj = {
          id: Date.now(),
          type: PaymentType.Money,
          amount: formValue.moneyAmount || 0,
        } as MoneyPayment;
      } else {
        paymentObj = {
          id: Date.now(),
          type: PaymentType.Custom,
          customText: formValue.customPaymentText || '',
        } as CustomPayment;
      }

      const problemData: Problem = {
        id: -1,
        name: formValue.name,
        description: formValue.description,
        type: formValue.type,
        isLocationBound: true,
        location,
        time: timeObj,
        payment: paymentObj,
        providers: [],
        searchers: [],
      };

      this.problemStateService.addProblem(problemData);
      this.isOpen.set(false);
      this.resetForm();
    } finally {
      this.isCreatingProblem.set(false);
    }
  }

  private resetForm(): void {
    this.problemForm.reset({
      type: ProblemType.Resource,
      timeType: TimeType.Fixed,
      paymentType: PaymentType.Free,
    });
    this.selectedLocation.set(null);
  }

  private getCurrentLocation(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(coords),
        (error: GeolocationPositionError) => {
          reject(new Error(`Failed to read location (${error.code}): ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  }
}
