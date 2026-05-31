import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProblemType } from '@features/problem/problem.model';
import { TimeType } from '@features/time/time.model';
import { PaymentType } from '@features/payment/payment.model';
import { Location } from '@features/location/location.model';
import { LocationService } from '@features/location/location.service';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { RadioButton } from 'primeng/radiobutton';
import { firstValueFrom } from 'rxjs';
import { ProblemService } from '@features/problem/problem.service';

@Component({
  selector: 'problem-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Select,
    Textarea,
    RadioButton,
  ],
  template: `
    <p-dialog
      [(visible)]="isOpen"
      [header]="'Neues Angebot hinzufügen'"
      [modal]="true"
      [draggable]="false"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      (onHide)="onDialogHide()"
    >
      <form [formGroup]="problemForm" (ngSubmit)="onSubmit()">
        <!-- Name -->
        <div class="form-group">
          <label for="name" class="form-label">Angebot *</label>
          <input
            id="name"
            pInputText
            type="text"
            formControlName="name"
            class="form-input"
            placeholder="Kurze Beschreibung des Angebots"
          />
          @if (problemForm.get('name')?.invalid && problemForm.get('name')?.touched) {
            <small class="error-text">Titel für das Angebot wird benötigt!</small>
          }
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="description" class="form-label">Beschreibung *</label>
          <textarea
            id="description"
            pInputTextarea
            formControlName="description"
            class="form-input"
            rows="3"
            placeholder="Beschreibe das Angebot, welches du hast."
          ></textarea>
          @if (problemForm.get('description')?.invalid && problemForm.get('description')?.touched) {
            <small class="error-text">Eine Angebotsbeschreibung wird benötigt!</small>
          }
        </div>

        <!-- Problem Type -->
        <div class="form-group">
          <label for="type" class="form-label">Angebotstyp *</label>
          <p-select
            id="type"
            [options]="problemTypes"
            formControlName="type"
            optionLabel="label"
            optionValue="value"
            class="form-input"
            placeholder="Typ auswählen"
          ></p-select>
        </div>

        <!-- Location -->
        <div class="form-group">
          <label class="form-label">Ort *</label>
          <div class="location-controls">
            <button
              type="button"
              pButton
              label="Nutze aktuellen Standort"
              (click)="useCurrentLocation()"
              [disabled]="isDetectingLocation()"
              class="location-button"
            ></button>
            <input
              pInputText
              type="text"
              placeholder="Oder geben Sie die Adresse ein"
              formControlName="manualAddress"
              (input)="onAddressChange()"
              class="form-input"
            />
          </div>
          @if (selectedLocation(); as location) {
            <small class="success-text">Ort: {{ location.name }}</small>
          }
        </div>

        <!-- Time Type -->
        <div class="form-group">
          <label class="form-label">Zeit *</label>
          <div class="radio-group">
            <div class="radio-item">
              <p-radioButton
                id="fixed-time"
                name="timeType"
                [value]="TimeType.Fixed"
                formControlName="timeType"
                (change)="onTimeTypeChange()"
              ></p-radioButton>
              <label for="fixed-time">Feste Zeit</label>
            </div>
            <div class="radio-item">
              <p-radioButton
                id="range-time"
                name="timeType"
                [value]="TimeType.Range"
                formControlName="timeType"
                (change)="onTimeTypeChange()"
              ></p-radioButton>
              <label for="range-time">Zeitspanne</label>
            </div>
          </div>
        </div>

        <!-- Fixed Time -->
        @if (problemForm.get('timeType')?.value === TimeType.Fixed) {
          <div class="form-group">
            <label for="fixed-date" class="form-label">Datum & Uhrzeit *</label>
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
            <label for="start-date" class="form-label">Startdatum & Uhrzeit *</label>
            <input
              id="start-date"
              type="datetime-local"
              formControlName="startTime"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="end-date" class="form-label">Enddatum & Uhrzeit *</label>
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
          <label class="form-label">Zahlungsart *</label>
          <div class="radio-group">
            <div class="radio-item">
              <p-radioButton
                id="free-payment"
                name="paymentType"
                [value]="PaymentType.Free"
                formControlName="paymentType"
                (change)="onPaymentTypeChange()"
              ></p-radioButton>
              <label for="free-payment">Kostenlos</label>
            </div>
            <div class="radio-item">
              <p-radioButton
                id="money-payment"
                name="paymentType"
                [value]="PaymentType.Money"
                formControlName="paymentType"
                (change)="onPaymentTypeChange()"
              >
              </p-radioButton>
              <label for="money-payment">Entgeldlich</label>
            </div>
            <div class="radio-item">
              <p-radioButton
                id="custom-payment"
                name="paymentType"
                [value]="PaymentType.Custom"
                formControlName="paymentType"
                (change)="onPaymentTypeChange()"
              >
              </p-radioButton>
              <label for="custom-payment">Anderes Gut</label>
            </div>
          </div>
        </div>

        <!-- Money Amount -->
        @if (problemForm.get('paymentType')?.value === PaymentType.Money) {
          <div class="form-group">
            <label for="amount" class="form-label">Menge (€) *</label>
            <p-inputNumber
              id="amount"
              formControlName="moneyAmount"
              [min]="0"
              [max]="100000"
              [step]="0.01"
              class="form-input"
            >
            </p-inputNumber>
          </div>
        }

        <!-- Custom Payment Text -->
        @if (problemForm.get('paymentType')?.value === PaymentType.Custom) {
          <div class="form-group">
            <label for="custom-payment-text" class="form-label">Zahlung als *</label>
            <textarea
              id="custom-payment-text"
              pInputTextarea
              formControlName="customPaymentText"
              class="form-input"
              rows="2"
              placeholder="Was für eine Bezahlungsart?"
            ></textarea>
          </div>
        }

        <!-- Form Actions -->
        <div class="form-actions">
          <button
            type="button"
            pButton
            label="Abbrechen"
            (click)="onCancel()"
            class="cancel-button"
          ></button>
          <button
            type="submit"
            pButton
            label="Angebot erstellen"
            [disabled]="
              !problemForm.valid ||
              (!selectedLocation() && !problemForm.get('manualAddress')?.value?.trim()) ||
              isCreatingProblem()
            "
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemModalComponent {
  private readonly problemService = inject(ProblemService);
  private readonly locationService = inject(LocationService);
  isOpen = signal(false);
  readonly isCreatingProblem = signal(false);
  readonly isDetectingLocation = signal(false);
  readonly selectedLocation = signal<Location | null>(null);

  readonly TimeType = TimeType;
  readonly PaymentType = PaymentType;
  readonly problemTypes = [
    { label: 'Ware / Produkt', value: ProblemType.Resource },
    { label: 'Dienstleistung', value: ProblemType.Service },
  ];

  problemForm!: FormGroup;

  constructor() {
    this.problemForm = new FormGroup({
      name: new FormControl<string | null>(null, Validators.required),
      description: new FormControl<string | null>(null, Validators.required),
      type: new FormControl<ProblemType | null>(null, Validators.required),
      timeType: new FormControl<TimeType | null>(null),
      fixedTime: new FormControl<Date | null>(null),
      startTime: new FormControl<Date | null>(null),
      endTime: new FormControl<Date | null>(null),
      paymentType: new FormControl<PaymentType | null>(null, Validators.required),
      moneyAmount: new FormControl<number | null>(0),
      customPaymentText: new FormControl<string | null>(null),
      manualAddress: new FormControl<string | null>(null),
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
      const coords = await this.locationService.getCurrentLocation();
      // Try to reverse-geocode to a readable address
      try {
        const rev = await this.locationService.reverseGeocode(coords.latitude, coords.longitude);
        const location: Location = {
          id: Date.now(),
          name: rev.display_name,
          address: rev.display_name,
          corLat: String(coords.latitude),
          corLon: String(coords.longitude),
        };
        this.selectedLocation.set(location);
      } catch {
        const location: Location = {
          id: Date.now(),
          name: 'Aktueller Ort',
          address: `${coords.latitude}, ${coords.longitude}`,
          corLat: coords.latitude.toString(),
          corLon: coords.longitude.toString(),
        };
        this.selectedLocation.set(location);
      }
    } catch (error) {
      console.error('Failed to detect location:', error);
    } finally {
      this.isDetectingLocation.set(false);
    }
  }

  onAddressChange(): void {
    this.selectedLocation.set(null);
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
    if (!this.problemForm.valid) {
      return;
    }

    this.isCreatingProblem.set(true);

    try {
      const formValue = this.problemForm.getRawValue();
      // Delegate problem construction, optional geocoding and submission to the ProblemService.
      await firstValueFrom(
        this.problemService.createAndSubmitProblem(formValue, this.selectedLocation()),
      );
      this.isOpen.set(false);
      this.resetForm();
    } catch (error) {
      console.error('Failed to create problem:', error);
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

  // Geocoding and geolocation delegated to LocationService
}
