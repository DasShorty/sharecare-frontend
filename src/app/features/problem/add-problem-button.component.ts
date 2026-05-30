import { ChangeDetectionStrategy, Component, output, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProblemModalComponent } from '@features/problem/problem-modal.component';

@Component({
  selector: 'add-problem-button',
  standalone: true,
  imports: [ButtonModule, ProblemModalComponent],
  template: `
    <div class="button-container">
      <button
        pButton
        type="button"
        icon="pi pi-plus"
        [rounded]="true"
        [text]="true"
        severity="primary"
        aria-label="Add problem report"
        (click)="openProblemModal()"
        class="add-button"
      ></button>
    </div>

    <problem-modal #problemModal></problem-modal>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .button-container {
        position: fixed;
        top: 1.5rem;
        right: 1.5rem;
        z-index: 1000;
      }

      .add-button {
        width: 3rem;
        height: 3rem;
        font-size: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .add-button:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProblemButtonComponent {
  @ViewChild('problemModal') problemModal!: ProblemModalComponent;

  openProblemModal(): void {
    this.problemModal.openModal();
  }
}
