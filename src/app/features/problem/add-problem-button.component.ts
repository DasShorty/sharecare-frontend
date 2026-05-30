import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProblemModalComponent } from '@features/problem/problem-modal.component';
import { LucideLayersPlus } from '@lucide/angular';

@Component({
  selector: 'add-problem-button',
  standalone: true,
  imports: [ButtonModule, ProblemModalComponent, LucideLayersPlus],
  template: `
    <div class="button-container">
      <button
        pButton
        type="button"
        [rounded]="true"
        [text]="true"
        severity="primary"
        aria-label="Add problem report"
        (click)="openProblemModal()"
        class="add-button"
      >
        <svg lucideLayersPlus></svg>
      </button>
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
        bottom: 4rem;
        right: 2.5rem;
        z-index: 1000;
      }

      .add-button {
        width: 3rem;
        height: 3rem;
        font-size: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        background-color: white;
        transform: scale(1.2);
      }

      .add-button:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProblemButtonComponent {
  protected readonly problemModal = viewChild.required<ProblemModalComponent>('problemModal');

  openProblemModal(): void {
    this.problemModal().openModal();
  }
}
